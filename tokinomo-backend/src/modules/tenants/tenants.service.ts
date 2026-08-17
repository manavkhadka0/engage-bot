import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CommandStatus,
  DeviceEventType,
  DeviceStatus,
  Prisma,
  TenantStatus,
} from '@prisma/client';
import { fromNodeHeaders } from 'better-auth/node';
import type { Request } from 'express';
import { auth, mailService } from '../../auth/auth';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BillingService } from '../billing/billing.service';
import { DeviceSimulatorService } from '../devices/device-simulator.service';
import { MAX_TENANT_MEMBERS } from '../users/users.service';
import type {
  ArchiveTenantDto,
  CreateTenantDto,
  RenameSlugDto,
  SimulateFleetDto,
  TransferAdminDto,
  UpdateTenantDto,
  WipeTelemetryDto,
} from './tenants.dto';

type Actor = { id?: string } | null | undefined;

@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billing: BillingService,
    private readonly simulator: DeviceSimulatorService,
  ) {}

  async list(includeArchived = false) {
    const where = includeArchived
      ? undefined
      : { status: { not: TenantStatus.ARCHIVED } };

    const tenants = await this.prisma.tenant.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { devices: true, products: true } },
        subscription: true,
        organization: {
          include: {
            members: {
              where: { role: { in: ['BRAND_ADMIN', 'admin', 'owner'] } },
              take: 1,
              include: {
                user: { select: { email: true, name: true } },
              },
            },
            _count: { select: { members: true } },
          },
        },
      },
    });

    const statusByTenant = await this.deviceStatusByTenant(
      tenants.map((t) => t.id),
    );

    return tenants.map((t) => {
      const counts = statusByTenant.get(t.id) ?? {
        online: 0,
        offline: 0,
      };
      const admin = t.organization.members[0]?.user;
      const { organization, ...rest } = t;
      return {
        ...rest,
        adminEmail: admin?.email ?? null,
        adminName: admin?.name ?? null,
        memberCount: organization._count.members,
        deviceStatus: {
          online: counts.online,
          offline: counts.offline,
        },
      };
    });
  }

  /**
   * Platform ops desk payload — aggregates + capped queues.
   * Never returns full device/tenant collections.
   */
  async opsOverview() {
    const ATTENTION_LIMIT = 12;
    const CHART_LIMIT = 8;
    const RECENT_LIMIT = 6;
    const activeWhere = { status: { not: TenantStatus.ARCHIVED } };

    const [
      tenantCount,
      deviceCount,
      statusGroups,
      tenantStatusGroups,
      suspendedTenants,
      emptyTenants,
      recentTenants,
      emptyCount,
      suspendedCount,
      unassignedOffline,
    ] = await Promise.all([
      this.prisma.tenant.count({ where: activeWhere }),
      this.prisma.device.count(),
      this.prisma.device.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.device.groupBy({
        by: ['tenantId', 'status'],
        where: { tenantId: { not: null } },
        _count: { _all: true },
      }),
      this.prisma.tenant.findMany({
        where: { status: TenantStatus.SUSPENDED },
        take: 10,
        orderBy: { updatedAt: 'desc' },
        select: { id: true, name: true, slug: true },
      }),
      this.prisma.tenant.findMany({
        where: { ...activeWhere, devices: { none: {} } },
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, slug: true },
      }),
      this.prisma.tenant.findMany({
        where: activeWhere,
        take: RECENT_LIMIT,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          slug: true,
          tier: true,
          status: true,
          _count: { select: { devices: true } },
        },
      }),
      this.prisma.tenant.count({
        where: { ...activeWhere, devices: { none: {} } },
      }),
      this.prisma.tenant.count({
        where: { status: TenantStatus.SUSPENDED },
      }),
      this.prisma.device.count({
        where: { status: DeviceStatus.OFFLINE, tenantId: null },
      }),
    ]);

    const statusMix: Record<string, number> = {
      ONLINE: 0,
      OFFLINE: 0,
      PROVISIONING: 0,
      UNASSIGNED: 0,
    };
    for (const row of statusGroups) {
      statusMix[row.status] = row._count._all;
    }

    type TenantAgg = {
      online: number;
      offline: number;
      total: number;
    };
    const byTenant = new Map<string, TenantAgg>();
    for (const row of tenantStatusGroups) {
      if (!row.tenantId) continue;
      const cur = byTenant.get(row.tenantId) ?? {
        online: 0,
        offline: 0,
        total: 0,
      };
      const n = row._count._all;
      cur.total += n;
      if (row.status === DeviceStatus.ONLINE) cur.online += n;
      else if (
        row.status === DeviceStatus.OFFLINE ||
        row.status === DeviceStatus.PROVISIONING
      ) {
        cur.offline += n;
      }
      byTenant.set(row.tenantId, cur);
    }

    const allOfflineIds: string[] = [];
    const offlineChartCandidates: Array<{
      tenantId: string;
      offline: number;
      total: number;
    }> = [];
    for (const [tenantId, agg] of byTenant) {
      if (agg.total > 0 && agg.online === 0) {
        allOfflineIds.push(tenantId);
      }
      if (agg.offline > 0) {
        offlineChartCandidates.push({
          tenantId,
          offline: agg.offline,
          total: agg.total,
        });
      }
    }
    offlineChartCandidates.sort((a, b) => b.offline - a.offline);
    const chartSlice = offlineChartCandidates.slice(0, CHART_LIMIT);
    const allOfflineSlice = allOfflineIds.slice(0, 20);

    const nameIds = [
      ...new Set([
        ...chartSlice.map((c) => c.tenantId),
        ...allOfflineSlice,
        ...recentTenants.map((t) => t.id),
      ]),
    ];
    const named =
      nameIds.length === 0
        ? []
        : await this.prisma.tenant.findMany({
            where: { id: { in: nameIds } },
            select: { id: true, name: true, slug: true },
          });
    const names = new Map(named.map((t) => [t.id, t]));

    const coveredOffline = new Set(allOfflineSlice);

    const offlineWhere: Prisma.DeviceWhereInput = {
      status: DeviceStatus.OFFLINE,
    };
    if (coveredOffline.size > 0) {
      offlineWhere.OR = [
        { tenantId: null },
        { tenantId: { notIn: [...coveredOffline] } },
      ];
    }

    const offlineDevices = await this.prisma.device.findMany({
      where: offlineWhere,
      take: 20,
      orderBy: [{ lastSeen: 'asc' }, { updatedAt: 'asc' }],
      select: {
        id: true,
        serial: true,
        lastSeen: true,
        tenantId: true,
        tenant: { select: { id: true, name: true, slug: true } },
      },
    });

    type AttentionItem = {
      id: string;
      severity: 'critical' | 'warn' | 'info';
      title: string;
      detail: string;
      href: string;
    };
    const attention: AttentionItem[] = [];

    for (const tenantId of allOfflineSlice) {
      const t = names.get(tenantId);
      const agg = byTenant.get(tenantId);
      if (!t || !agg) continue;
      attention.push({
        id: `ten-alloff-${tenantId}`,
        severity: 'critical',
        title: t.name,
        detail: `All ${agg.total} device${agg.total === 1 ? '' : 's'} offline`,
        href: `/admin/tenants/${tenantId}`,
      });
    }

    for (const t of suspendedTenants) {
      attention.push({
        id: `ten-sus-${t.id}`,
        severity: 'warn',
        title: t.name,
        detail: `Suspended · /${t.slug}`,
        href: `/admin/tenants/${t.id}`,
      });
    }

    for (const d of offlineDevices) {
      attention.push({
        id: `dev-off-${d.id}`,
        severity: 'warn',
        title: d.serial,
        detail: `${d.tenant?.name ?? 'Unassigned'} · offline${
          d.lastSeen
            ? ` · last seen ${d.lastSeen.toISOString()}`
            : ''
        }`,
        href: d.tenantId
          ? `/admin/tenants/${d.tenantId}`
          : '/admin/devices',
      });
    }

    for (const t of emptyTenants) {
      attention.push({
        id: `ten-empty-${t.id}`,
        severity: 'info',
        title: t.name,
        detail: 'No devices assigned — provision or assign from Devices',
        href: `/admin/tenants/${t.id}`,
      });
    }

    const offlineOnlyByTenant = new Map<string, number>();
    for (const row of tenantStatusGroups) {
      if (row.tenantId && row.status === DeviceStatus.OFFLINE) {
        offlineOnlyByTenant.set(row.tenantId, row._count._all);
      }
    }
    let partialOfflineCount = unassignedOffline;
    for (const [tenantId, agg] of byTenant) {
      if (agg.online > 0) {
        partialOfflineCount += offlineOnlyByTenant.get(tenantId) ?? 0;
      }
    }

    const attentionTotal =
      allOfflineIds.length +
      suspendedCount +
      emptyCount +
      partialOfflineCount;

    const rank = { critical: 0, warn: 1, info: 2 } as const;
    attention.sort((a, b) => rank[a.severity] - rank[b.severity]);

    const recentStatus = await this.deviceStatusByTenant(
      recentTenants.map((t) => t.id),
    );

    const online = statusMix.ONLINE ?? 0;
    const offline = statusMix.OFFLINE ?? 0;
    const provisioning = statusMix.PROVISIONING ?? 0;
    const unassigned = statusMix.UNASSIGNED ?? 0;

    return {
      totals: {
        tenants: tenantCount,
        devices: deviceCount,
        online,
        offline,
        error: 0,
        provisioning,
        unassigned,
        onlineRate:
          deviceCount === 0 ? null : Math.round((online / deviceCount) * 100),
        attentionCount: attentionTotal,
      },
      statusMix: [
        { name: 'Online', value: online },
        { name: 'Offline', value: offline },
        { name: 'Provisioning', value: provisioning },
        { name: 'Unassigned', value: unassigned },
      ].filter((row) => row.value > 0),
      offlineByTenant: chartSlice.map((c) => {
        const t = names.get(c.tenantId);
        const name = t?.name ?? c.tenantId;
        return {
          name: name.length > 14 ? `${name.slice(0, 12)}…` : name,
          offline: c.offline,
          total: c.total,
          tenantId: c.tenantId,
        };
      }),
      attention: attention.slice(0, ATTENTION_LIMIT),
      attentionTruncated: attentionTotal > ATTENTION_LIMIT,
      recentTenants: recentTenants.map((t) => {
        const st = recentStatus.get(t.id) ?? { online: 0, offline: 0 };
        return {
          id: t.id,
          name: t.name,
          slug: t.slug,
          tier: t.tier,
          status: t.status,
          deviceCount: t._count.devices,
          deviceStatus: st,
        };
      }),
    };
  }

  /** Aggregate online/offline counts per tenant without loading device rows. */
  private async deviceStatusByTenant(tenantIds: string[]) {
    const map = new Map<string, { online: number; offline: number }>();
    if (tenantIds.length === 0) return map;

    const rows = await this.prisma.device.groupBy({
      by: ['tenantId', 'status'],
      where: { tenantId: { in: tenantIds } },
      _count: { _all: true },
    });

    for (const id of tenantIds) {
      map.set(id, { online: 0, offline: 0 });
    }
    for (const row of rows) {
      if (!row.tenantId) continue;
      const cur = map.get(row.tenantId) ?? { online: 0, offline: 0 };
      if (row.status === DeviceStatus.ONLINE) {
        cur.online += row._count._all;
      } else if (
        row.status === DeviceStatus.OFFLINE ||
        row.status === DeviceStatus.PROVISIONING
      ) {
        cur.offline += row._count._all;
      }
      map.set(row.tenantId, cur);
    }
    return map;
  }

  async get(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: { select: { devices: true, products: true, locations: true } },
        subscription: true,
        devices: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            serial: true,
            status: true,
            lastSeen: true,
            fwVersion: true,
            createdAt: true,
          },
        },
        organization: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    createdAt: true,
                  },
                },
              },
            },
            invitations: {
              where: { status: 'pending' },
              orderBy: { createdAt: 'desc' },
              take: 20,
            },
          },
        },
      },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const deviceIds = tenant.devices.map((d) => d.id);

    const [online, offline, detections, plays, queuedCmds, failedCmds, audits, events] =
      await Promise.all([
        this.prisma.device.count({
          where: { tenantId: id, status: DeviceStatus.ONLINE },
        }),
        this.prisma.device.count({
          where: { tenantId: id, status: DeviceStatus.OFFLINE },
        }),
        this.prisma.deviceEvent.count({
          where: {
            tenantId: id,
            ts: { gte: startOfDay },
            type: { in: [DeviceEventType.DETECTION, DeviceEventType.DWELL] },
          },
        }),
        this.prisma.deviceEvent.count({
          where: {
            tenantId: id,
            ts: { gte: startOfDay },
            type: DeviceEventType.PLAY,
          },
        }),
        deviceIds.length
          ? this.prisma.command.count({
              where: {
                deviceId: { in: deviceIds },
                status: { in: [CommandStatus.QUEUED, CommandStatus.SENT] },
              },
            })
          : Promise.resolve(0),
        deviceIds.length
          ? this.prisma.command.count({
              where: { deviceId: { in: deviceIds }, status: CommandStatus.FAILED },
            })
          : Promise.resolve(0),
        this.prisma.tenantAuditLog.findMany({
          where: { tenantId: id },
          orderBy: { createdAt: 'desc' },
          take: 30,
        }),
        this.prisma.deviceEvent.findMany({
          where: { tenantId: id },
          orderBy: { ts: 'desc' },
          take: 20,
          select: { ts: true, type: true, deviceId: true, dwellMs: true },
        }),
      ]);

    const lastSeenDates = tenant.devices
      .map((d) => d.lastSeen)
      .filter((d): d is Date => !!d)
      .sort((a, b) => b.getTime() - a.getTime());
    const lastDeviceSeen = lastSeenDates[0] ?? null;
    const deviceTotal = tenant.devices.length;
    const offlineRatio = deviceTotal === 0 ? 0 : offline / deviceTotal;

    const health = {
      lastDeviceSeen,
      online,
      offline,
      deviceTotal,
      offlineRatio,
      queuedCommands: queuedCmds,
      failedCommands: failedCmds,
    };

    const memberCount = tenant.organization.members.length;
    const hasAdmin = tenant.organization.members.some((m) =>
      ['BRAND_ADMIN', 'admin', 'owner'].includes(m.role),
    );
    const sub = tenant.subscription;
    const now = Date.now();
    const trialEnds = sub?.trialEndsAt ? sub.trialEndsAt.getTime() : null;
    const risks: Array<{ code: string; label: string; severity: 'info' | 'warn' | 'critical' }> =
      [];

    if (tenant.status === TenantStatus.ARCHIVED) {
      risks.push({ code: 'archived', label: 'Tenant is archived', severity: 'critical' });
    }
    if (tenant.status === TenantStatus.SUSPENDED) {
      risks.push({ code: 'suspended', label: 'Tenant suspended', severity: 'warn' });
    }
    if (deviceTotal === 0) {
      risks.push({ code: 'zero_devices', label: 'No devices assigned', severity: 'warn' });
    }
    if (deviceTotal > 0 && online === 0) {
      risks.push({ code: 'all_offline', label: 'All devices offline', severity: 'warn' });
    }
    if (!hasAdmin) {
      risks.push({ code: 'no_admin', label: 'No brand admin member', severity: 'critical' });
    }
    if (memberCount >= MAX_TENANT_MEMBERS) {
      risks.push({
        code: 'member_slots_full',
        label: `Member slots full (${MAX_TENANT_MEMBERS})`,
        severity: 'info',
      });
    }
    if (sub?.status === 'TRIAL' && trialEnds !== null) {
      if (trialEnds < now) {
        risks.push({ code: 'trial_expired', label: 'Trial expired', severity: 'critical' });
      } else if (trialEnds - now <= 7 * 24 * 60 * 60 * 1000) {
        risks.push({
          code: 'trial_ending',
          label: 'Trial ends within 7 days',
          severity: 'warn',
        });
      }
    }
    if (failedCmds > 0) {
      risks.push({
        code: 'failed_commands',
        label: `${failedCmds} failed command(s)`,
        severity: 'warn',
      });
    }

    const inviteActivity = tenant.organization.invitations.map((inv) => ({
      at: inv.createdAt.toISOString(),
      kind: 'invite' as const,
      label: `Invite pending → ${inv.email} (${inv.role ?? 'member'})`,
    }));

    const auditActivity = audits.map((a) => ({
      at: a.createdAt.toISOString(),
      kind: 'audit' as const,
      label: `${a.action}: ${a.message}`,
    }));

    const eventActivity = events.map((e) => ({
      at: e.ts.toISOString(),
      kind: 'device' as const,
      label: `${e.type} · device ${e.deviceId.slice(0, 8)}${e.dwellMs ? ` (${e.dwellMs}ms)` : ''}`,
    }));

    const activity = [...auditActivity, ...eventActivity, ...inviteActivity]
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 30);

    const adminMember = tenant.organization.members.find((m) =>
      ['BRAND_ADMIN', 'admin', 'owner'].includes(m.role),
    );

    const trialDaysLeft =
      sub?.status === 'TRIAL' && trialEnds !== null
        ? Math.max(0, Math.ceil((trialEnds - now) / (24 * 60 * 60 * 1000)))
        : null;

    const { organization, ...tenantRest } = tenant;

    return {
      ...tenantRest,
      adminEmail: adminMember?.user.email ?? null,
      adminName: adminMember?.user.name ?? null,
      members: organization.members.map((m) => ({
        id: m.id,
        role: m.role,
        createdAt: m.createdAt,
        user: m.user,
      })),
      invitations: organization.invitations,
      memberCount,
      analytics: {
        devices: { online, offline },
        today: { detections, plays },
      },
      health,
      risks,
      activity,
      trialDaysLeft,
    };
  }

  async create(dto: CreateTenantDto, req: Request) {
    const existing = await this.prisma.organization.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new BadRequestException(`Slug "${dto.slug}" is already taken`);
    }

    const headers = fromNodeHeaders(req.headers);

    const created = await auth.api.createUser({
      body: {
        email: dto.adminEmail,
        password: dto.adminPassword,
        name: dto.adminName,
        role: 'user',
      },
      headers,
    });

    const userId = created.user.id;

    await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });

    const org = await this.prisma.organization.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        members: {
          create: {
            userId,
            role: 'BRAND_ADMIN',
          },
        },
      },
    });

    const tenant = await this.prisma.tenant.create({
      data: {
        id: org.id,
        organizationId: org.id,
        name: dto.name,
        slug: dto.slug,
        tier: dto.tier,
      },
    });

    const subscription = await this.billing.ensureSubscription(
      tenant.id,
      dto.tier,
    );

    await this.writeAudit(tenant.id, req.auth?.user?.id, 'created', `Tenant created (${dto.tier})`, {
      slug: dto.slug,
      adminEmail: dto.adminEmail,
    });

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3001';
    await mailService.send({
      to: dto.adminEmail,
      subject: `Welcome to Tokinomo — ${dto.name}`,
      html: `
        <p>Hi ${dto.adminName},</p>
        <p>Your brand workspace <strong>${dto.name}</strong> is ready (${dto.tier}, 6-month trial).</p>
        <p><strong>Email:</strong> ${dto.adminEmail}<br/>
        <strong>Password:</strong> ${dto.adminPassword}</p>
        <p>Sign in: <a href="${frontendUrl}/login">${frontendUrl}/login</a></p>
      `,
      text: `Your Tokinomo workspace "${dto.name}" is ready. Login: ${frontendUrl}/login`,
    });

    return {
      tenant,
      subscription,
      organizationId: org.id,
      admin: {
        id: userId,
        email: dto.adminEmail,
        name: dto.adminName,
        role: 'BRAND_ADMIN',
      },
    };
  }

  async update(id: string, dto: UpdateTenantDto, actor?: Actor) {
    await this.requireTenant(id);

    const sensitive =
      dto.tier !== undefined || dto.status !== undefined;
    if (sensitive && !dto.auditNote?.trim()) {
      throw new BadRequestException(
        'auditNote is required when changing tier or status',
      );
    }

    const data: {
      name?: string;
      notes?: string | null;
      brandLogoUrl?: string | null;
      brandDomain?: string | null;
      tier?: UpdateTenantDto['tier'];
      status?: UpdateTenantDto['status'];
    } = {};

    if (dto.name !== undefined) data.name = dto.name;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.brandLogoUrl !== undefined) {
      data.brandLogoUrl = dto.brandLogoUrl === '' ? null : dto.brandLogoUrl;
    }
    if (dto.brandDomain !== undefined) {
      data.brandDomain = dto.brandDomain === '' ? null : dto.brandDomain;
    }
    if (dto.tier !== undefined) data.tier = dto.tier;
    if (dto.status !== undefined) data.status = dto.status;

    const tenant = await this.prisma.tenant.update({
      where: { id },
      data,
    });

    if (dto.name) {
      await this.prisma.organization.update({
        where: { id },
        data: { name: dto.name },
      });
    }
    if (dto.tier) {
      await this.billing.changeTier(id, dto.tier);
    }

    const parts: string[] = [];
    if (dto.name) parts.push(`name→${dto.name}`);
    if (dto.tier) parts.push(`tier→${dto.tier}`);
    if (dto.status) parts.push(`status→${dto.status}`);
    if (dto.notes !== undefined) parts.push('notes updated');
    if (dto.brandLogoUrl !== undefined) parts.push('logo updated');
    if (dto.brandDomain !== undefined) parts.push('domain updated');

    await this.writeAudit(
      id,
      actor?.id,
      'updated',
      dto.auditNote?.trim() || parts.join(', ') || 'Tenant updated',
      { fields: Object.keys(data) },
    );

    return tenant;
  }

  async renameSlug(id: string, dto: RenameSlugDto, actor?: Actor) {
    const tenant = await this.requireTenant(id);
    if (tenant.slug === dto.slug) {
      throw new BadRequestException('Slug is unchanged');
    }

    const taken = await this.prisma.tenant.findFirst({
      where: { slug: dto.slug, NOT: { id } },
    });
    if (taken) {
      throw new ConflictException(`Slug "${dto.slug}" is already taken`);
    }
    const orgTaken = await this.prisma.organization.findFirst({
      where: { slug: dto.slug, NOT: { id } },
    });
    if (orgTaken) {
      throw new ConflictException(`Slug "${dto.slug}" is already taken`);
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.tenant.update({
        where: { id },
        data: { slug: dto.slug },
      }),
      this.prisma.organization.update({
        where: { id },
        data: { slug: dto.slug },
      }),
    ]);

    await this.writeAudit(
      id,
      actor?.id,
      'slug_renamed',
      dto.auditNote,
      { from: tenant.slug, to: dto.slug },
    );

    return updated;
  }

  async archive(id: string, dto: ArchiveTenantDto, actor?: Actor) {
    await this.requireTenant(id);
    const tenant = await this.prisma.tenant.update({
      where: { id },
      data: {
        status: TenantStatus.ARCHIVED,
        archivedAt: new Date(),
      },
    });
    await this.writeAudit(id, actor?.id, 'archived', dto.auditNote);
    return tenant;
  }

  async unarchive(id: string, dto: ArchiveTenantDto, actor?: Actor) {
    await this.requireTenant(id);
    const tenant = await this.prisma.tenant.update({
      where: { id },
      data: {
        status: TenantStatus.ACTIVE,
        archivedAt: null,
      },
    });
    await this.writeAudit(id, actor?.id, 'unarchived', dto.auditNote);
    return tenant;
  }

  async wipeTelemetry(id: string, dto: WipeTelemetryDto, actor?: Actor) {
    await this.requireTenant(id);
    const result = await this.prisma.deviceEvent.deleteMany({
      where: { tenantId: id },
    });
    await this.writeAudit(
      id,
      actor?.id,
      'wipe_telemetry',
      dto.auditNote,
      { deleted: result.count },
    );
    return { ok: true, deleted: result.count };
  }

  async simulateFleet(id: string, dto: SimulateFleetDto) {
    await this.requireTenant(id);
    const devices = await this.prisma.device.findMany({
      where: { tenantId: id },
      select: { id: true, serial: true },
    });
    if (devices.length === 0) {
      throw new BadRequestException('No devices assigned to this tenant');
    }
    const action = dto.action ?? 'loop';
    const results = [];
    for (const d of devices) {
      results.push(await this.simulator.simulate(d.id, action));
    }
    return { ok: true, action, count: results.length, results };
  }

  async transferAdmin(id: string, dto: TransferAdminDto, req: Request) {
    await this.requireTenant(id);

    const existingMember = await this.prisma.member.findFirst({
      where: {
        organizationId: id,
        user: { email: dto.email },
      },
      include: { user: true },
    });

    if (existingMember) {
      await this.prisma.member.updateMany({
        where: {
          organizationId: id,
          role: { in: ['BRAND_ADMIN', 'admin', 'owner'] },
          NOT: { id: existingMember.id },
        },
        data: { role: 'BRAND_STAFF' },
      });
      await this.prisma.member.update({
        where: { id: existingMember.id },
        data: { role: 'BRAND_ADMIN' },
      });
      await this.writeAudit(
        id,
        req.auth?.user?.id,
        'transfer_admin',
        dto.auditNote,
        { email: dto.email, mode: 'promote_existing' },
      );
      return { ok: true, mode: 'promoted', email: dto.email };
    }

    const memberCount = await this.prisma.member.count({
      where: { organizationId: id },
    });
    if (memberCount >= MAX_TENANT_MEMBERS) {
      throw new BadRequestException(
        `Tenant member limit reached (${MAX_TENANT_MEMBERS}). Free a slot before transferring.`,
      );
    }

    const headers = fromNodeHeaders(req.headers);
    const invitation = await auth.api.createInvitation({
      body: {
        email: dto.email,
        role: 'BRAND_ADMIN',
        organizationId: id,
      },
      headers,
    });

    await this.writeAudit(
      id,
      req.auth?.user?.id,
      'transfer_admin',
      dto.auditNote,
      { email: dto.email, mode: 'invited', name: dto.name },
    );

    return { ok: true, mode: 'invited', email: dto.email, invitation };
  }

  private async requireTenant(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  private writeAudit(
    tenantId: string,
    actorUserId: string | undefined,
    action: string,
    message: string,
    meta?: Record<string, unknown>,
  ) {
    return this.prisma.tenantAuditLog.create({
      data: {
        tenantId,
        actorUserId: actorUserId ?? null,
        action,
        message,
        meta: meta
          ? (meta as Prisma.InputJsonValue)
          : undefined,
      },
    });
  }
}
