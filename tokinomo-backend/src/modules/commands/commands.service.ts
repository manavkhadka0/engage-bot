import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CommandStatus, CommandType, Prisma } from '@prisma/client';
import type { AuthContext } from '../../common/guards/roles.guard';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class CommandsService {
  constructor(private readonly prisma: PrismaService) {}

  list(auth: AuthContext, deviceId?: string) {
    const where: Prisma.CommandWhereInput = {};
    if (deviceId) where.deviceId = deviceId;
    if (!auth.isPlatform) {
      if (!auth.tenantId) throw new ForbiddenException('Active tenant required');
      where.device = { tenantId: auth.tenantId };
    } else if (auth.tenantId) {
      where.device = { tenantId: auth.tenantId };
    }
    return this.prisma.command.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { device: { select: { id: true, serial: true, tenantId: true } } },
    });
  }

  async enqueue(
    auth: AuthContext,
    data: { deviceId: string; type: CommandType; payload: Prisma.InputJsonValue },
  ) {
    const device = await this.prisma.device.findUnique({
      where: { id: data.deviceId },
    });
    if (!device) throw new NotFoundException('Device not found');
    if (!auth.isPlatform && device.tenantId !== auth.tenantId) {
      throw new ForbiddenException('Cross-tenant access denied');
    }
    return this.prisma.command.create({
      data: {
        deviceId: data.deviceId,
        type: data.type,
        payload: data.payload,
        status: CommandStatus.QUEUED,
      },
    });
  }
}
