import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { CommandStatus, CommandType } from '@prisma/client';
import type { AuthContext } from '../../common/guards/roles.guard';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StorageService } from '../../common/storage/storage.service';
import { BillingService } from '../billing/billing.service';
import { maxAudioClips } from '../billing/tier-catalog';
import { CommandPublisher } from '../../workers/jobs/command-publisher';

const MAX_AUDIO_BYTES = 512 * 1024;

@Injectable()
export class AudioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly billing: BillingService,
    private readonly commands: CommandPublisher,
  ) {}

  private requireTenant(auth: AuthContext) {
    if (!auth.tenantId) throw new ForbiddenException('Active tenant required');
    return auth.tenantId;
  }

  list(auth: AuthContext) {
    const tenantId = this.requireTenant(auth);
    return this.prisma.audioClip.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    auth: AuthContext,
    data: {
      name: string;
      storageKey?: string;
      checksum?: string;
      durationMs?: number;
    },
  ) {
    const tenantId = this.requireTenant(auth);
    await this.assertClipQuota(tenantId);

    const storageKey =
      data.storageKey ?? `audio/${tenantId}/${randomUUID()}.wav`;
    const checksum =
      data.checksum ??
      createHash('sha256').update(storageKey).digest('hex');
    return this.prisma.audioClip.create({
      data: {
        tenantId,
        name: data.name,
        storageKey,
        checksum,
        durationMs: data.durationMs,
      },
    });
  }

  async upload(
    auth: AuthContext,
    file: Express.Multer.File,
    name?: string,
  ) {
    const tenantId = this.requireTenant(auth);
    await this.assertClipQuota(tenantId);

    if (!file) throw new BadRequestException('WAV file required');
    if (file.size > MAX_AUDIO_BYTES) {
      throw new BadRequestException(
        `File too large (max ${MAX_AUDIO_BYTES} bytes)`,
      );
    }
    const isWav =
      file.mimetype === 'audio/wav' ||
      file.mimetype === 'audio/x-wav' ||
      file.mimetype === 'audio/wave' ||
      file.originalname.toLowerCase().endsWith('.wav');
    if (!isWav) {
      throw new BadRequestException(
        'Only WAV (PCM mono 16 kHz) clips are accepted in v1',
      );
    }

    const key = `audio/${tenantId}/${randomUUID()}.wav`;
    const stored = await this.storage.putObject(
      key,
      file.buffer,
      'audio/wav',
    );

    return this.prisma.audioClip.create({
      data: {
        tenantId,
        name: name?.trim() || file.originalname.replace(/\.wav$/i, ''),
        storageKey: stored.key,
        checksum: stored.checksum,
      },
    });
  }

  async push(auth: AuthContext, clipId: string, deviceIds: string[]) {
    const tenantId = this.requireTenant(auth);
    const clip = await this.prisma.audioClip.findFirst({
      where: { id: clipId, tenantId },
    });
    if (!clip) throw new NotFoundException('Audio clip not found');

    const devices = await this.prisma.device.findMany({
      where: { id: { in: deviceIds }, tenantId },
    });
    if (devices.length !== deviceIds.length) {
      throw new ForbiddenException('One or more devices not in tenant');
    }

    const commands = await Promise.all(
      devices.map((device) =>
        this.prisma.command.create({
          data: {
            deviceId: device.id,
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
      data: devices.map((d) => ({
        deviceId: d.id,
        audioClipId: clip.id,
        active: true,
      })),
      skipDuplicates: true,
    });

    const published = await this.commands.publishAudioCommands(
      commands.map((c) => c.id),
      { simulateAck: true },
    );

    return { clip, commands, published };
  }

  private async assertClipQuota(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { _count: { select: { audioClips: true } } },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    const max = maxAudioClips(tenant.tier);
    if (tenant._count.audioClips >= max) {
      throw new ForbiddenException(
        `BASIC tier allows ${max} audio clip. Upgrade to GROWTH for multiple clips.`,
      );
    }
    // dwell analytics gated separately; clip quota is the main upload gate
    void this.billing;
  }
}
