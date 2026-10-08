import { Injectable, NotFoundException } from '@nestjs/common';
import { SubscriptionStatus, TenantTier } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  TIER_FEATURES,
  TIER_LABELS,
  TIER_PRICING_NPR,
  addMonths,
  maxAudioClips,
  tierHasFeature,
  type CatalogTier,
  type FeatureKey,
} from './tier-catalog';

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  catalog() {
    return (Object.keys(TIER_PRICING_NPR) as CatalogTier[]).map((tier) => ({
      tier,
      label: TIER_LABELS[tier],
      pricePerDeviceNpr: TIER_PRICING_NPR[tier],
      features: TIER_FEATURES[tier],
      maxAudioClips: maxAudioClips(tier),
    }));
  }

  async getForTenant(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscription: true,
        _count: { select: { devices: true, audioClips: true } },
      },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const sub =
      tenant.subscription ??
      (await this.ensureSubscription(tenantId, tenant.tier));

    const deviceCount = tenant._count.devices;
    const monthlyEstimate =
      sub.status === SubscriptionStatus.TRIAL
        ? 0
        : deviceCount * sub.pricePerDeviceNpr;

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        tier: tenant.tier,
        status: tenant.status,
        brandLogoUrl: tenant.brandLogoUrl,
        brandDomain: tenant.brandDomain,
      },
      subscription: sub,
      usage: {
        devices: deviceCount,
        audioClips: tenant._count.audioClips,
        maxAudioClips: maxAudioClips(tenant.tier),
      },
      features: TIER_FEATURES[tenant.tier as CatalogTier] ?? [],
      monthlyEstimateNpr: monthlyEstimate,
      catalog: this.catalog(),
    };
  }

  async ensureSubscription(tenantId: string, tier: TenantTier = TenantTier.BASIC) {
    const existing = await this.prisma.subscription.findUnique({
      where: { tenantId },
    });
    if (existing) return existing;

    const now = new Date();
    const trialMonths = 6;
    return this.prisma.subscription.create({
      data: {
        tenantId,
        tier,
        status: SubscriptionStatus.TRIAL,
        pricePerDeviceNpr: TIER_PRICING_NPR[tier as CatalogTier] ?? 500,
        trialMonths,
        trialEndsAt: addMonths(now, trialMonths),
        currentPeriodStart: now,
        currentPeriodEnd: addMonths(now, trialMonths),
        notes: '6-month platform included with hardware',
      },
    });
  }

  async changeTier(
    tenantId: string,
    tier: TenantTier,
    opts?: { activateNow?: boolean },
  ) {
    await this.ensureSubscription(tenantId, tier);
    const now = new Date();
    const price = TIER_PRICING_NPR[tier as CatalogTier];

    const [tenant, subscription] = await this.prisma.$transaction([
      this.prisma.tenant.update({
        where: { id: tenantId },
        data: { tier },
      }),
      this.prisma.subscription.update({
        where: { tenantId },
        data: {
          tier,
          pricePerDeviceNpr: price,
          ...(opts?.activateNow
            ? {
                status: SubscriptionStatus.ACTIVE,
                currentPeriodStart: now,
                currentPeriodEnd: addMonths(now, 1),
              }
            : {}),
        },
      }),
    ]);

    return { tenant, subscription };
  }

  async setStatus(tenantId: string, status: SubscriptionStatus) {
    await this.ensureSubscription(tenantId);
    return this.prisma.subscription.update({
      where: { tenantId },
      data: {
        status,
        cancelledAt:
          status === SubscriptionStatus.CANCELLED ? new Date() : null,
      },
    });
  }

  /** End trial early and start paid period (month-6 review conversion). */
  async convertFromTrial(tenantId: string, tier?: TenantTier) {
    const sub = await this.ensureSubscription(tenantId);
    const nextTier = tier ?? sub.tier;
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      await tx.tenant.update({
        where: { id: tenantId },
        data: { tier: nextTier },
      });
      return tx.subscription.update({
        where: { tenantId },
        data: {
          tier: nextTier,
          status: SubscriptionStatus.ACTIVE,
          pricePerDeviceNpr: TIER_PRICING_NPR[nextTier as CatalogTier],
          currentPeriodStart: now,
          currentPeriodEnd: addMonths(now, 1),
          notes: 'Converted from trial after proof window',
        },
      });
    });
  }

  assertFeature(tier: string, feature: FeatureKey) {
    return tierHasFeature(tier, feature);
  }

  async listAll() {
    const tenants = await this.prisma.tenant.findMany({
      include: {
        subscription: true,
        _count: { select: { devices: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return tenants.map((t) => ({
      tenantId: t.id,
      name: t.name,
      slug: t.slug,
      tier: t.tier,
      status: t.status,
      devices: t._count.devices,
      subscription: t.subscription,
      monthlyEstimateNpr:
        t.subscription?.status === SubscriptionStatus.TRIAL
          ? 0
          : t._count.devices * (t.subscription?.pricePerDeviceNpr ?? 0),
    }));
  }
}
