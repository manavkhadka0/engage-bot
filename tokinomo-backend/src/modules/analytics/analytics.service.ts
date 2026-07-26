import { ForbiddenException, Injectable } from '@nestjs/common';
import { DeviceEventType, DeviceStatus } from '@prisma/client';
import type { AuthContext } from '../../common/guards/roles.guard';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  private requireTenant(auth: AuthContext) {
    if (!auth.tenantId) throw new ForbiddenException('Active tenant required');
    return auth.tenantId;
  }

  async overview(auth: AuthContext) {
    const tenantId = this.requireTenant(auth);
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [online, offline, detections, plays] = await Promise.all([
      this.prisma.device.count({
        where: { tenantId, status: DeviceStatus.ONLINE },
      }),
      this.prisma.device.count({
        where: { tenantId, status: DeviceStatus.OFFLINE },
      }),
      this.prisma.deviceEvent.count({
        where: {
          tenantId,
          ts: { gte: startOfDay },
          type: { in: [DeviceEventType.DETECTION, DeviceEventType.DWELL] },
        },
      }),
      this.prisma.deviceEvent.count({
        where: {
          tenantId,
          ts: { gte: startOfDay },
          type: DeviceEventType.PLAY,
        },
      }),
    ]);

    return {
      tenantId,
      devices: { online, offline },
      today: { detections, plays },
    };
  }

  async deviceSeries(auth: AuthContext, deviceId: string) {
    const tenantId = this.requireTenant(auth);
    const device = await this.prisma.device.findFirst({
      where: { id: deviceId, tenantId },
    });
    if (!device) throw new ForbiddenException('Device not in tenant');

    const events = await this.prisma.deviceEvent.findMany({
      where: { deviceId, tenantId },
      orderBy: { ts: 'desc' },
      take: 200,
    });
    return { deviceId, events };
  }

  async dwell(auth: AuthContext) {
    const tenantId = this.requireTenant(auth);
    const rows = await this.prisma.deviceEvent.findMany({
      where: { tenantId, type: DeviceEventType.DWELL, dwellMs: { not: null } },
      select: { dwellMs: true, deviceId: true, ts: true },
      orderBy: { ts: 'desc' },
      take: 500,
    });
    const values = rows.map((r) => r.dwellMs!).filter((n) => n > 0);
    const avg =
      values.length === 0
        ? 0
        : Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    return { count: values.length, avgDwellMs: avg, samples: rows.slice(0, 50) };
  }
}
