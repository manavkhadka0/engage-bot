import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MqttService } from '../../common/mqtt/mqtt.service';
import { IngestionWorker } from '../../workers/ingestion/ingestion.worker';

export type SimulateAction =
  | 'online'
  | 'offline'
  | 'telemetry'
  | 'detection'
  | 'dwell'
  | 'play'
  | 'loop';

@Injectable()
export class DeviceSimulatorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mqtt: MqttService,
    private readonly ingestion: IngestionWorker,
  ) {}

  async simulate(
    deviceId: string,
    action: SimulateAction,
    opts?: { dwellMs?: number; clipId?: string },
  ) {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
    });
    if (!device) throw new NotFoundException('Device not found');
    if (!device.tenantId) {
      throw new BadRequestException('Assign device to a tenant first');
    }

    const tenantId = device.tenantId;
    const ts = Math.floor(Date.now() / 1000);

    if (action === 'loop') {
      await this.emit(tenantId, deviceId, 'status', {
        v: 1,
        status: 'online',
        fw: device.fwVersion ?? 'sim-0.1.0',
        ts,
      });
      await this.emit(tenantId, deviceId, 'event', {
        v: 1,
        ts: ts + 1,
        type: 'detection',
      });
      await this.emit(tenantId, deviceId, 'event', {
        v: 1,
        ts: ts + 2,
        type: 'dwell',
        dwell_ms: opts?.dwellMs ?? 8200,
      });
      await this.emit(tenantId, deviceId, 'event', {
        v: 1,
        ts: ts + 3,
        type: 'play',
        clipId: opts?.clipId ?? 'clip_sim',
        version: 1,
      });
      return { ok: true, action: 'loop', deviceId, tenantId };
    }

    if (action === 'online' || action === 'offline') {
      await this.emit(tenantId, deviceId, 'status', {
        v: 1,
        status: action,
        fw: device.fwVersion ?? 'sim-0.1.0',
        ts,
      });
      return { ok: true, action, deviceId };
    }

    if (action === 'telemetry') {
      await this.emit(tenantId, deviceId, 'telemetry', {
        v: 1,
        ts,
        rssi: -58,
        uptime_s: 12345,
        free_heap: 180000,
        fw: device.fwVersion ?? 'sim-0.1.0',
      });
      return { ok: true, action, deviceId };
    }

    if (action === 'detection' || action === 'dwell' || action === 'play') {
      await this.emit(tenantId, deviceId, 'event', {
        v: 1,
        ts,
        type: action,
        dwell_ms: action === 'dwell' ? (opts?.dwellMs ?? 6000) : undefined,
        clipId: action === 'play' ? (opts?.clipId ?? 'clip_sim') : undefined,
        version: action === 'play' ? 1 : undefined,
      });
      return { ok: true, action, deviceId };
    }

    throw new BadRequestException(`Unknown action ${action}`);
  }

  private async emit(
    tenantId: string,
    deviceId: string,
    channel: 'status' | 'telemetry' | 'event' | 'ack',
    data: unknown,
  ) {
    // Always ingest in-process so dashboards work without EMQX
    await this.ingestion.ingestDirect(tenantId, deviceId, channel, data);

    if (this.mqtt.isConnected()) {
      const topic = this.mqtt.topicFor(tenantId, deviceId, channel);
      try {
        await this.mqtt.publish(topic, data, {
          qos: 1,
          retain: channel === 'status',
        });
      } catch {
        // non-fatal — in-process ingest already applied
      }
    }
  }
}
