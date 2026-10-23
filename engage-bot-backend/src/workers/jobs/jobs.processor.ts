import { InjectQueue, OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, OnModuleInit } from '@nestjs/common';
import { CommandStatus, CommandType, DeviceEventType, DeviceStatus } from '@prisma/client';
import { Job, Queue } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RealtimeGateway } from '../../modules/realtime/realtime.gateway';
import { CommandPublisher } from './command-publisher';

export const JOBS_QUEUE = 'engage-bot-jobs';

export type JobName = 'audio-push-fanout' | 'offline-sweep' | 'nightly-rollups';

export type AudioPushFanoutData = {
  tenantId: string;
  clipId: string;
  deviceIds: string[];
};

/** Devices per MQTT publish batch when fanning a clip out to a big fleet. */
const FANOUT_BATCH = 25;

const num = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

/**
 * Background jobs on the shared BullMQ queue.
 *
 * - `offline-sweep` (every minute): marks ONLINE devices whose `lastSeen` is older than
 *   DEVICE_OFFLINE_AFTER_SECONDS as OFFLINE. Disabled when that is 0 (the default): the
 *   firmware only reports on connect/disconnect (MQTT last-will) and on detections, not on
 *   a heartbeat, so an age cut-off would flip healthy-but-quiet devices offline. Enable it
 *   once the firmware publishes a periodic heartbeat.
 * - `nightly-rollups` (03:00 server time): the dashboard aggregates device_event live, so there
 *   is nothing to precompute; this job enforces EVENT_RETENTION_DAYS (default 90) by deleting
 *   older raw events. 0 keeps everything.
 * - `audio-push-fanout` (on demand): pushes a clip to many devices in batches off the request path.
 */
@Processor(JOBS_QUEUE)
export class JobsProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(JobsProcessor.name);

  constructor(
    @InjectQueue(JOBS_QUEUE) private readonly queue: Queue,
    private readonly prisma: PrismaService,
    private readonly commands: CommandPublisher,
    private readonly realtime: RealtimeGateway,
  ) {
    super();
  }

  async onModuleInit() {
    try {
      await this.queue.upsertJobScheduler(
        'offline-sweep',
        { every: 60_000 },
        { name: 'offline-sweep' },
      );
      await this.queue.upsertJobScheduler(
        'nightly-rollups',
        { pattern: '0 3 * * *' },
        { name: 'nightly-rollups' },
      );
    } catch (err) {
      this.logger.error(`Could not register recurring jobs: ${String(err)}`);
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, err: Error) {
    this.logger.error(`job ${job?.name} id=${job?.id} failed: ${err.message}`);
  }

  async process(job: Job): Promise<unknown> {
    switch (job.name as JobName) {
      case 'offline-sweep':
        return this.offlineSweep();
      case 'nightly-rollups':
        return this.nightlyRollups();
      case 'audio-push-fanout':
        return this.audioPushFanout(job.data as AudioPushFanoutData);
      default:
        this.logger.warn(`unknown job ${job.name} id=${job.id}`);
        return undefined;
    }
  }

  async offlineSweep(now = new Date()) {
    const afterSeconds = num(process.env.DEVICE_OFFLINE_AFTER_SECONDS, 0);
    if (afterSeconds === 0) return { skipped: true, marked: 0 };

    const cutoff = new Date(now.getTime() - afterSeconds * 1000);
    const stale = await this.prisma.device.findMany({
      where: {
        status: DeviceStatus.ONLINE,
        tenantId: { not: null },
        OR: [{ lastSeen: { lt: cutoff } }, { lastSeen: null }],
      },
      select: { id: true, serial: true, tenantId: true },
    });

    for (const d of stale) {
      await this.prisma.$transaction([
        this.prisma.device.update({
          where: { id: d.id },
          data: { status: DeviceStatus.OFFLINE },
        }),
        this.prisma.deviceEvent.create({
          data: {
            deviceId: d.id,
            tenantId: d.tenantId!,
            type: DeviceEventType.OFFLINE,
            meta: { reason: 'offline-sweep', afterSeconds },
          },
        }),
      ]);
      this.realtime.emitDeviceStatus(d.tenantId!, {
        deviceId: d.id,
        serial: d.serial,
        status: DeviceStatus.OFFLINE,
        ts: now.getTime(),
      });
    }
    if (stale.length) this.logger.log(`offline-sweep marked ${stale.length} device(s) OFFLINE`);
    return { skipped: false, marked: stale.length };
  }

  async nightlyRollups(now = new Date()) {
    const days = num(process.env.EVENT_RETENTION_DAYS, 90);
    if (days === 0) return { skipped: true, deleted: 0 };

    const cutoff = new Date(now.getTime() - days * 86_400_000);
    const { count } = await this.prisma.deviceEvent.deleteMany({
      where: { ts: { lt: cutoff } },
    });
    this.logger.log(`nightly-rollups deleted ${count} device events older than ${days}d`);
    return { skipped: false, deleted: count };
  }

  async audioPushFanout(data: AudioPushFanoutData) {
    const clip = await this.prisma.audioClip.findFirst({
      where: { id: data.clipId, tenantId: data.tenantId },
    });
    if (!clip) throw new Error(`clip ${data.clipId} not found for tenant ${data.tenantId}`);

    const devices = await this.prisma.device.findMany({
      where: { id: { in: data.deviceIds }, tenantId: data.tenantId },
      select: { id: true },
    });

    let queued = 0;
    for (let i = 0; i < devices.length; i += FANOUT_BATCH) {
      const batch = devices.slice(i, i + FANOUT_BATCH);
      const created = await Promise.all(
        batch.map((d) =>
          this.prisma.command.create({
            data: {
              deviceId: d.id,
              type: CommandType.AUDIO_UPDATE,
              status: CommandStatus.QUEUED,
              payload: {
                clipId: clip.id,
                url: clip.storageKey,
                storageKey: clip.storageKey,
                checksum: clip.checksum,
                version: clip.version,
              },
            },
          }),
        ),
      );
      await this.prisma.deviceAudio.createMany({
        data: batch.map((d) => ({ deviceId: d.id, audioClipId: clip.id, active: true })),
        skipDuplicates: true,
      });
      await this.commands.publishCommands(created.map((c) => c.id), { simulateAck: false });
      queued += created.length;
    }
    return { queued, requested: data.deviceIds.length };
  }
}
