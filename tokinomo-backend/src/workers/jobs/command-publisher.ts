import { Injectable, Logger } from '@nestjs/common';
import { CommandStatus, CommandType, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MqttService } from '../../common/mqtt/mqtt.service';
import { StorageService } from '../../common/storage/storage.service';
import { IngestionWorker } from '../ingestion/ingestion.worker';

type CommandWithDevice = Prisma.CommandGetPayload<{
  include: { device: true };
}>;

type BuiltCommand = {
  mqtt: Record<string, unknown> & { type: string };
  /** Fields merged back onto the stored Command.payload, e.g. the signed URL actually sent. */
  storagePatch?: Record<string, unknown>;
};

/**
 * Publishes queued commands (audio_update/play/config/reboot) to devices
 * over MQTT per CONTRACTS.md §①, and auto-acks when running the in-process
 * fake simulator (no hardware connected yet).
 */
@Injectable()
export class CommandPublisher {
  private readonly logger = new Logger(CommandPublisher.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mqtt: MqttService,
    private readonly storage: StorageService,
    private readonly ingestion: IngestionWorker,
  ) {}

  async publishCommands(
    commandIds: string[],
    opts?: { simulateAck?: boolean },
  ) {
    const commands = await this.prisma.command.findMany({
      where: { id: { in: commandIds } },
      include: { device: true },
    });

    const results = [];
    for (const cmd of commands) {
      const device = cmd.device;
      if (!device.tenantId) continue;

      const built = await this.buildPayload(cmd);
      if (!built) {
        this.logger.warn(`No payload builder for command type ${cmd.type}`);
        continue;
      }
      const { mqtt: mqttPayload, storagePatch } = built;

      const topic = this.mqtt.topicFor(device.tenantId, device.id, 'cmd');
      let sent = false;
      if (this.mqtt.isConnected()) {
        try {
          await this.mqtt.publish(topic, mqttPayload, { qos: 1 });
          sent = true;
        } catch (err) {
          this.logger.warn(`MQTT publish failed: ${String(err)}`);
        }
      }

      await this.prisma.command.update({
        where: { id: cmd.id },
        data: {
          status: CommandStatus.SENT,
          payload: {
            ...(cmd.payload as object),
            ...(storagePatch ?? {}),
            publishedAt: new Date().toISOString(),
          },
        },
      });

      if (opts?.simulateAck ?? true) {
        // Fake device: command "succeeds" and acks immediately (no hardware)
        setTimeout(() => {
          void this.ingestion.ingestDirect(device.tenantId!, device.id, 'ack', {
            id: cmd.id,
            ok: true,
            type: mqttPayload.type,
            ...(mqttPayload.type === 'audio_update'
              ? { version: (mqttPayload as { version?: number }).version }
              : {}),
            ts: Math.floor(Date.now() / 1000),
          });
        }, 400);
      }

      results.push({ commandId: cmd.id, topic, sent, mqttPayload });
    }
    return results;
  }

  private async buildPayload(
    cmd: CommandWithDevice,
  ): Promise<BuiltCommand | null> {
    switch (cmd.type) {
      case CommandType.AUDIO_UPDATE: {
        const payload = cmd.payload as {
          clipId: string;
          url: string;
          checksum: string;
          version: number;
          storageKey?: string;
        };

        let signedUrl = payload.url;
        const key = payload.storageKey ?? payload.url;
        if (key && !key.startsWith('http')) {
          try {
            signedUrl = await this.storage.getSignedDownloadUrl(key, 3600);
          } catch (err) {
            this.logger.warn(`Signed URL failed for ${key}: ${String(err)}`);
          }
        }

        return {
          mqtt: {
            id: cmd.id,
            type: 'audio_update',
            url: signedUrl,
            checksum: `sha256:${payload.checksum}`,
            version: payload.version,
            clipId: payload.clipId,
          },
          storagePatch: { url: signedUrl },
        };
      }

      case CommandType.PLAY: {
        const payload = cmd.payload as { clipId: string };
        return { mqtt: { id: cmd.id, type: 'play', clipId: payload.clipId } };
      }

      case CommandType.REBOOT:
        return { mqtt: { id: cmd.id, type: 'reboot' } };

      case CommandType.CONFIG: {
        const payload = (cmd.payload ?? {}) as {
          dwellMs?: number;
          cooldownMs?: number;
          volume?: number;
          ledColor?: string;
        };
        return { mqtt: { id: cmd.id, type: 'config', ...payload } };
      }

      default:
        return null;
    }
  }
}
