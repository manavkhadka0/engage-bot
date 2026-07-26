import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { DeviceStatus, Prisma } from '@prisma/client';
import type { AuthContext } from '../../common/guards/roles.guard';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

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

  private assertAccess(auth: AuthContext, tenantId: string | null) {
    if (auth.isPlatform) return;
    if (!auth.tenantId || auth.tenantId !== tenantId) {
      throw new ForbiddenException('Cross-tenant access denied');
    }
  }
}
