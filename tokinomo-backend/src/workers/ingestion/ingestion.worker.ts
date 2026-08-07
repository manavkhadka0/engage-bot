import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  CommandStatus,
  type Device,
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
      await this.route(tenantId, deviceId, channel, data);
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
    await this.route(tenantId, deviceId, channel, data);
  }

  /**
   * Every ingest path funnels through here so the device's *assigned*
   * tenantId (not whatever the message claims) is the source of truth —
   * a message on t/{tenantId}/d/{deviceId}/... only gets processed if
   * {deviceId} is actually assigned to {tenantId}. Otherwise it's dropped
   * as a spoof/misconfiguration rather than silently reassigning the device.
   */
  private async route(
    tenantId: string,
    deviceId: string,
    channel: string,
    data: unknown,
  ) {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
    });
    if (!device) {
      this.logger.warn(
        `Ingest from unknown device ${deviceId} (topic tenant ${tenantId})`,
      );
      return;
    }
    if (device.tenantId !== tenantId) {
      this.logger.warn(
        `Rejected ingest for device ${deviceId}: topic tenant ${tenantId} ` +
          `!= assigned tenant ${device.tenantId ?? 'none'}`,
      );
      return;
    }

    if (channel === 'status') {
      await this.onStatus(device, data as StatusMsg);
    } else if (channel === 'event') {
      await this.onEvent(device, data as EventMsg);
    } else if (channel === 'ack') {
      await this.onAck(device, data as AckMsg);
    } else if (channel === 'telemetry') {
      await this.onTelemetry(device, data as Record<string, unknown>);
    }
  }

  private async onStatus(device: Device, msg: StatusMsg) {
    const tenantId = device.tenantId!;
    const status =
      msg.status === 'online' ? DeviceStatus.ONLINE : DeviceStatus.OFFLINE;
    await this.prisma.device.update({
      where: { id: device.id },
      data: {
        status,
        lastSeen: new Date(),
        fwVersion: msg.fw ?? undefined,
      },
    });

    await this.prisma.deviceEvent.create({
      data: {
        deviceId: device.id,
        tenantId,
        type:
          status === DeviceStatus.ONLINE
            ? DeviceEventType.ONLINE
            : DeviceEventType.OFFLINE,
        meta: msg as object,
      },
    });

    this.realtime.emitDeviceStatus(tenantId, {
      deviceId: device.id,
      serial: device.serial,
      status,
      fw: msg.fw,
      ts: msg.ts ?? Date.now(),
    });
  }

  private async onEvent(device: Device, msg: EventMsg) {
    const tenantId = device.tenantId!;
    const typeMap: Record<string, DeviceEventType> = {
      detection: DeviceEventType.DETECTION,
      dwell: DeviceEventType.DWELL,
      play: DeviceEventType.PLAY,
    };
    const type = typeMap[msg.type];
    if (!type) return;

    await this.prisma.device.update({
      where: { id: device.id },
      data: { lastSeen: new Date(), status: DeviceStatus.ONLINE },
    });

    const event = await this.prisma.deviceEvent.create({
      data: {
        deviceId: device.id,
        tenantId,
        type,
        dwellMs: msg.dwell_ms,
        meta: msg as object,
        ts: msg.ts ? new Date(msg.ts * 1000) : new Date(),
      },
    });

    this.realtime.emitDeviceEvent(tenantId, {
      deviceId: device.id,
      type,
      dwellMs: msg.dwell_ms,
      eventId: event.id,
      ts: event.ts,
    });
  }

  private async onAck(device: Device, msg: AckMsg) {
    const tenantId = device.tenantId!;
    const command = await this.prisma.command.findFirst({
      where: { id: msg.id, deviceId: device.id },
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
      deviceId: device.id,
      type: 'command.ack',
      commandId: msg.id,
      ok: msg.ok,
      error: msg.error,
    });
  }

  private async onTelemetry(device: Device, msg: Record<string, unknown>) {
    const tenantId = device.tenantId!;
    await this.prisma.device.update({
      where: { id: device.id },
      data: {
        lastSeen: new Date(),
        status: DeviceStatus.ONLINE,
        fwVersion: typeof msg.fw === 'string' ? msg.fw : undefined,
      },
    });
    this.realtime.emitDeviceStatus(tenantId, {
      deviceId: device.id,
      status: DeviceStatus.ONLINE,
      telemetry: msg,
    });
  }
}
