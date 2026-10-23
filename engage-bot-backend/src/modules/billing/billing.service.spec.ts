import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../common/prisma/prisma.service';
import { BillingService } from './billing.service';

describe('BillingService.requireFeature', () => {
  const make = (tier: string | null) => {
    const prisma = {
      tenant: {
        findUnique: jest.fn().mockResolvedValue(tier ? { tier } : null),
      },
    };
    return new BillingService(prisma as unknown as PrismaService);
  };

  it('rejects a BASIC tenant for a GROWTH feature, naming the plan', async () => {
    await expect(make('BASIC').requireFeature('t1', 'dwell_analytics')).rejects.toThrow(
      /Basic plan does not include "dwell_analytics"/,
    );
    await expect(make('BASIC').requireFeature('t1', 'dwell_analytics')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('allows GROWTH and BRAND', async () => {
    await expect(make('GROWTH').requireFeature('t1', 'dwell_analytics')).resolves.toBeUndefined();
    await expect(make('BRAND').requireFeature('t1', 'api_access')).resolves.toBeUndefined();
  });

  it('allows BASIC features and 404s on unknown tenant', async () => {
    await expect(make('BASIC').requireFeature('t1', 'device_health')).resolves.toBeUndefined();
    await expect(make(null).requireFeature('x', 'device_health')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
