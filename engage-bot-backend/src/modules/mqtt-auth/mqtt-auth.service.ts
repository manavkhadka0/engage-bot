import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

/** Channels a device is allowed to publish to (D→C, per CONTRACTS.md §①). */
const PUBLISHABLE_CHANNELS = new Set(['status', 'telemetry', 'event', 'ack']);
/** Channels a device is allowed to subscribe to (C→D). */
const SUBSCRIBABLE_CHANNELS = new Set(['cmd']);

type AuthResult = { allow: boolean; superuser?: boolean };

/**
 * Backing service for EMQX's HTTP authentication/authorization hooks
 * (Contract ④ — per-device serial+token, not a shared/global key).
 *
 * A device authenticates with username=serial, password=provisionToken.
 * The backend's own MQTT client authenticates with a separate
 * MQTT_USERNAME/MQTT_PASSWORD credential and is granted `is_superuser`,
 * which tells EMQX to skip per-topic ACL for it entirely (it publishes
 * `cmd` and subscribes to every device's channels, which no per-device
 * ACL row could describe).
 */
@Injectable()
export class MqttAuthService {
  private readonly logger = new Logger(MqttAuthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async authenticate(
    username?: string,
    password?: string,
  ): Promise<AuthResult> {
    if (!username || !password) return { allow: false };

    const backendUser = process.env.MQTT_USERNAME;
    const backendPass = process.env.MQTT_PASSWORD;
    if (
      backendUser &&
      backendPass &&
      username === backendUser &&
      password === backendPass
    ) {
      return { allow: true, superuser: true };
    }

    const device = await this.prisma.device.findUnique({
      where: { serial: username },
    });
    if (!device?.provisionToken || device.provisionToken !== password) {
      this.logger.warn(`MQTT auth rejected for username=${username}`);
      return { allow: false };
    }
    return { allow: true, superuser: false };
  }

  async authorize(
    username?: string,
    topic?: string,
    action?: string,
  ): Promise<boolean> {
    if (!username || !topic || !action) return false;

    // Belt-and-suspenders alongside authenticate()'s is_superuser: grant the
    // backend's own client full access explicitly rather than relying on
    // EMQX's superuser bypass alone (it needs t/+/d/+/+ subscribe + per-device
    // cmd publish, which no per-device ACL row could express anyway).
    const backendUser = process.env.MQTT_USERNAME;
    if (backendUser && username === backendUser) return true;

    const device = await this.prisma.device.findUnique({
      where: { serial: username },
    });
    if (!device?.tenantId) return false;

    // t/{tenantId}/d/{deviceId}/{channel}
    const parts = topic.split('/');
    if (parts.length !== 5 || parts[0] !== 't' || parts[2] !== 'd') {
      return false;
    }
    const [, tenantId, , deviceId, channel] = parts;
    if (tenantId !== device.tenantId || deviceId !== device.id) return false;

    if (action === 'publish') return PUBLISHABLE_CHANNELS.has(channel);
    if (action === 'subscribe') return SUBSCRIBABLE_CHANNELS.has(channel);
    return false;
  }
}
