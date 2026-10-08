import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { CommandStatus, CommandType, DeviceStatus, Prisma } from '@prisma/client';
import type { AuthContext } from '../../common/guards/roles.guard';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CommandPublisher } from '../../workers/jobs/command-publisher';

export interface SendCommandDto {
  type: 'play' | 'reboot' | 'config';
  clipId?: string;
  dwellMs?: number;
  cooldownMs?: number;
  volume?: number;
  ledColor?: string;
}

const COMMAND_TYPE_MAP: Record<SendCommandDto['type'], CommandType> = {
  play: CommandType.PLAY,
  reboot: CommandType.REBOOT,
  config: CommandType.CONFIG,
};

@Injectable()
export class DevicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commands: CommandPublisher,
  ) {}

  async list(
    auth: AuthContext,
    status?: DeviceStatus,
    opts: { limit?: number; offset?: number } = {},
  ) {
    const where: Prisma.DeviceWhereInput = {};
    if (!auth.isPlatform) {
      if (!auth.tenantId) throw new ForbiddenException('No active tenant');
      where.tenantId = auth.tenantId;
    } else if (auth.tenantId) {
      where.tenantId = auth.tenantId;
    }
    if (status) where.status = status;

    const max = 500;
    const defaultLimit = auth.isPlatform && !auth.tenantId ? 100 : 200;
    const limit = Math.min(Math.max(opts.limit ?? defaultLimit, 1), max);
    const offset = Math.max(opts.offset ?? 0, 0);

    const [items, total] = await Promise.all([
      this.prisma.device.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: { location: true, product: true, tenant: true },
      }),
      this.prisma.device.count({ where }),
    ]);

    return {
      items,
      total,
      limit,
      offset,
      hasMore: offset + items.length < total,
    };
  }

  async get(auth: AuthContext, id: string) {
    const device = await this.prisma.device.findUnique({
      where: { id },
      include: { location: true, product: true, commands: { take: 10, orderBy: { createdAt: 'desc' } } },
    });
    if (!device) throw new NotFoundException('Device not found');
    this.assertAccess(auth, device.tenantId);
    return device;
  }

  provision(serial: string) {
    const provisionToken = randomBytes(24).toString('hex');
    return this.prisma.device.create({
      data: {
        serial,
        provisionToken,
        status: DeviceStatus.PROVISIONING,
      },
    });
  }

  async assign(
    auth: AuthContext,
    id: string,
    data: { tenantId: string; locationId?: string; productId?: string },
  ) {
    if (!auth.isPlatform) throw new ForbiddenException('Platform only');
    await this.get(auth, id);
    return this.prisma.device.update({
      where: { id },
      data: {
        tenantId: data.tenantId,
        locationId: data.locationId,
        productId: data.productId,
        status: DeviceStatus.OFFLINE,
      },
    });
  }

  async setLocation(auth: AuthContext, id: string, locationId: string | null) {
    const device = await this.prisma.device.findUnique({ where: { id } });
    if (!device) throw new NotFoundException('Device not found');
    this.assertAccess(auth, device.tenantId);

    if (locationId) {
      const location = await this.prisma.location.findFirst({
        where: { id: locationId, tenantId: device.tenantId! },
      });
      if (!location) throw new ForbiddenException('Location not in tenant');
    }

    return this.prisma.device.update({
      where: { id },
      data: { locationId },
      include: { location: true },
    });
  }

  async sendCommand(auth: AuthContext, id: string, dto: SendCommandDto) {
    const device = await this.prisma.device.findUnique({ where: { id } });
    if (!device) throw new NotFoundException('Device not found');
    this.assertAccess(auth, device.tenantId);
    if (!device.tenantId) {
      throw new ForbiddenException('Device is not assigned to a tenant');
    }
    if (dto.type === 'play' && !dto.clipId) {
      throw new ForbiddenException('clipId is required for type=play');
    }

    const payload: Prisma.InputJsonValue =
      dto.type === 'play'
        ? { clipId: dto.clipId }
        : dto.type === 'config'
          ? {
              dwellMs: dto.dwellMs,
              cooldownMs: dto.cooldownMs,
              volume: dto.volume,
              ledColor: dto.ledColor,
            }
          : {};

    const command = await this.prisma.command.create({
      data: {
        deviceId: device.id,
        type: COMMAND_TYPE_MAP[dto.type],
        status: CommandStatus.QUEUED,
        payload,
      },
    });

    const published = await this.commands.publishCommands([command.id], {
      simulateAck: true,
    });

    return { command, published };
  }

  private assertAccess(auth: AuthContext, tenantId: string | null) {
    if (auth.isPlatform) return;
    if (!auth.tenantId || auth.tenantId !== tenantId) {
      throw new ForbiddenException('Cross-tenant access denied');
    }
  }
}
