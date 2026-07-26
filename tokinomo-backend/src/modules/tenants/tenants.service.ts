import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { fromNodeHeaders } from 'better-auth/node';
import type { Request } from 'express';
import { auth, mailService } from '../../auth/auth';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BillingService } from '../billing/billing.service';
import type { CreateTenantDto, UpdateTenantDto } from './tenants.dto';

@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billing: BillingService,
  ) {}

  list() {
    return this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { devices: true, products: true } },
        subscription: true,
      },
    });
  }

  async get(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: { select: { devices: true, products: true, locations: true } },
        subscription: true,
      },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
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

  async update(id: string, dto: UpdateTenantDto) {
    await this.get(id);
    const tenant = await this.prisma.tenant.update({
      where: { id },
      data: {
        name: dto.name,
        tier: dto.tier,
        status: dto.status,
      },
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
    return tenant;
  }
}
