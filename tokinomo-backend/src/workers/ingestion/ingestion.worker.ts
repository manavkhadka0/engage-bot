import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  CommandStatus,
  DeviceEventType,
  DeviceStatus,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MqttService } from '../../common/mqtt/mqtt.service';
import { RealtimeGateway } from '../../modules/realtime/realtime.gateway';

type StatusMsg = {
  v?: number;
  status: 'online' | 'offline';
  fw?: string;
  ts?: number;
};

type EventMsg = {
  v?: number;
  ts?: number;
  type: 'detection' | 'dwell' | 'play';
  dwell_ms?: number;
  clipId?: string;
  version?: number;
};

type AckMsg = {
  id: string;
  ok: boolean;
  type?: string;
  version?: number;
  error?: string;
  ts?: number;
};

@Injectable()
export class IngestionWorker implements OnModuleInit {
  private readonly logger = new Logger(IngestionWorker.name);

  constructor(
    private readonly mqtt: MqttService,
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  onModuleInit() {
    this.mqtt.onMessage('t/+/d/+/+', (topic, payload) => {
      void this.handleMessage(topic, payload);
    });
    this.logger.log('Ingestion worker listening for MQTT device topics');
  }

  private async handleMessage(topic: string, payload: Buffer) {
    const parts = topic.split('/');
    // t/{tenant}/d/{device}/{channel}
    if (parts.length !== 5 || parts[0] !== 't' || parts[2] !== 'd') return;
    const tenantId = parts[1];
    const deviceId = parts[3];
    const channel = parts[4];

    let data: unknown;
    try {
      data = JSON.parse(payload.toString('utf8'));
    } catch {
      this.logger.warn(`Bad JSON on ${topic}`);
      return;
    }

    try {
      if (channel === 'status') {
        await this.onStatus(tenantId, deviceId, data as StatusMsg);
      } else if (channel === 'event') {
        await this.onEvent(tenantId, deviceId, data as EventMsg);
      } else if (channel === 'ack') {
        await this.onAck(tenantId, deviceId, data as AckMsg);
      } else if (channel === 'telemetry') {
        await this.onTelemetry(tenantId, deviceId, data as Record<string, unknown>);
      }
    } catch (err) {
      this.logger.error(`Ingest failed ${topic}: ${String(err)}`);
    }
  }

  /** In-process inject (fake devices / tests without MQTT broker). */
  async ingestDirect(
    tenantId: string,
    deviceId: string,
    channel: 'status' | 'event' | 'ack' | 'telemetry',
    data: unknown,
  ) {
    if (channel === 'status') {
      await this.onStatus(tenantId, deviceId, data as StatusMsg);
    } else if (channel === 'event') {
      await this.onEvent(tenantId, deviceId, data as EventMsg);
    } else if (channel === 'ack') {
      await this.onAck(tenantId, deviceId, data as AckMsg);
    } else {
      await this.onTelemetry(tenantId, deviceId, data as Record<string, unknown>);
    }
  }

  private async onStatus(
    tenantId: string,
    deviceId: string,
    msg: StatusMsg,
  ) {
    const status =
      msg.status === 'online' ? DeviceStatus.ONLINE : DeviceStatus.OFFLINE;
    const device = await this.prisma.device.update({
      where: { id: deviceId },
      data: {
        status,
        lastSeen: new Date(),
        fwVersion: msg.fw ?? undefined,
        tenantId,
      },
    });

    await this.prisma.deviceEvent.create({
      data: {
        deviceId,
        tenantId,
        type:
          status === DeviceStatus.ONLINE
            ? DeviceEventType.ONLINE
            : DeviceEventType.OFFLINE,
        meta: msg as object,
      },
    });

    this.realtime.emitDeviceStatus(tenantId, {
      deviceId,
      serial: device.serial,
      status,
      fw: msg.fw,
      ts: msg.ts ?? Date.now(),
    });
  }

  private async onEvent(tenantId: string, deviceId: string, msg: EventMsg) {
    const typeMap: Record<string, DeviceEventType> = {
      detection: DeviceEventType.DETECTION,
      dwell: DeviceEventType.DWELL,
      play: DeviceEventType.PLAY,
    };
    const type = typeMap[msg.type];
    if (!type) return;

    await this.prisma.device.update({
      where: { id: deviceId },
      data: { lastSeen: new Date(), status: DeviceStatus.ONLINE },
    });

    const event = await this.prisma.deviceEvent.create({
      data: {
        deviceId,
        tenantId,
        type,
        dwellMs: msg.dwell_ms,
        meta: msg as object,
        ts: msg.ts ? new Date(msg.ts * 1000) : new Date(),
      },
    });

    this.realtime.emitDeviceEvent(tenantId, {
      deviceId,
      type,
      dwellMs: msg.dwell_ms,
      eventId: event.id,
      ts: event.ts,
    });
  }

  private async onAck(tenantId: string, deviceId: string, msg: AckMsg) {
    const command = await this.prisma.command.findFirst({
      where: { id: msg.id, deviceId },
    });
    if (!command) return;

    await this.prisma.command.update({
      where: { id: command.id },
      data: {
        status: msg.ok ? CommandStatus.ACKED : CommandStatus.FAILED,
        ackedAt: new Date(),
        payload: {
          ...(command.payload as object),
          ack: msg,
        },
      },
    });

    this.realtime.emitDeviceEvent(tenantId, {
      deviceId,
      type: 'command.ack',
      commandId: msg.id,
      ok: msg.ok,
      error: msg.error,
    });
  }

  private async onTelemetry(
    tenantId: string,
    deviceId: string,
    msg: Record<string, unknown>,
  ) {
    await this.prisma.device.update({
      where: { id: deviceId },
      data: {
        lastSeen: new Date(),
        status: DeviceStatus.ONLINE,
        fwVersion:
          typeof msg.fw === 'string' ? msg.fw : undefined,
        tenantId,
      },
    });
    this.realtime.emitDeviceStatus(tenantId, {
      deviceId,
      status: DeviceStatus.ONLINE,
      telemetry: msg,
    });
  }
}
