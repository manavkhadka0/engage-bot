import { Injectable, Logger } from '@nestjs/common';
import { CommandStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MqttService } from '../../common/mqtt/mqtt.service';
import { StorageService } from '../../common/storage/storage.service';
import { IngestionWorker } from '../ingestion/ingestion.worker';

/**
 * Publishes queued AUDIO_UPDATE commands to devices (MQTT),
 * and auto-acks when running the in-process fake simulator.
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

  async publishAudioCommands(
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

      const mqttPayload = {
        id: cmd.id,
        type: 'audio_update',
        url: signedUrl,
        checksum: `sha256:${payload.checksum}`,
        version: payload.version,
        clipId: payload.clipId,
      };

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
          payload: { ...payload, url: signedUrl, publishedAt: new Date().toISOString() },
        },
      });

      if (opts?.simulateAck ?? true) {
        // Fake device: download "succeeds" and ack immediately (no hardware)
        setTimeout(() => {
          void this.ingestion.ingestDirect(device.tenantId!, device.id, 'ack', {
            id: cmd.id,
            ok: true,
            type: 'audio_update',
            version: payload.version,
            ts: Math.floor(Date.now() / 1000),
          });
        }, 400);
      }

      results.push({ commandId: cmd.id, topic, sent, mqttPayload });
    }
    return results;
  }
}
