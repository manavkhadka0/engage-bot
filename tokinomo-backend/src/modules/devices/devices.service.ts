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

  list(auth: AuthContext, status?: DeviceStatus) {
    const where: Prisma.DeviceWhereInput = {};
    if (!auth.isPlatform) {
      if (!auth.tenantId) throw new ForbiddenException('No active tenant');
      where.tenantId = auth.tenantId;
    } else if (auth.tenantId) {
      where.tenantId = auth.tenantId;
    }
    if (status) where.status = status;
    return this.prisma.device.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { location: true, product: true, tenant: true },
    });
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
