import { ForbiddenException, Injectable } from '@nestjs/common';
import { fromNodeHeaders } from 'better-auth/node';
import type { Request } from 'express';
import { auth } from '../../auth/auth';
import type { AuthContext } from '../../common/guards/roles.guard';
import { PrismaService } from '../../common/prisma/prisma.service';

/** Brand admin + at most 2 invited members (pilot cap). */
export const MAX_TENANT_MEMBERS = 3;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async listMembers(authCtx: AuthContext) {
    if (!authCtx.tenantId) {
      throw new ForbiddenException('Active tenant required');
    }
    return this.prisma.member.findMany({
      where: { organizationId: authCtx.tenantId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            emailVerified: true,
            role: true,
            createdAt: true,
          },
        },
      },
    });
  }

  async invite(
    authCtx: AuthContext,
    req: Request,
    data: {
      email: string;
      role: 'BRAND_ADMIN' | 'BRAND_STAFF' | 'BRAND_VIEWER' | 'admin' | 'member';
    },
  ) {
    if (!authCtx.tenantId) {
      throw new ForbiddenException('Active tenant required');
    }

    if (!authCtx.isPlatform) {
      const me = await this.prisma.member.findFirst({
        where: {
          organizationId: authCtx.tenantId,
          userId: authCtx.user.id,
        },
      });
      if (
        !me ||
        (me.role !== 'BRAND_ADMIN' &&
          me.role !== 'admin' &&
          me.role !== 'owner')
      ) {
        throw new ForbiddenException('Only BRAND_ADMIN can invite members');
      }
    }

    const memberCount = await this.prisma.member.count({
      where: { organizationId: authCtx.tenantId },
    });
    if (memberCount >= MAX_TENANT_MEMBERS) {
      throw new ForbiddenException(
        `Tenant member limit reached (${MAX_TENANT_MEMBERS}: brand admin + up to 2 members)`,
      );
    }

    const headers = fromNodeHeaders(req.headers);
    return auth.api.createInvitation({
      body: {
        email: data.email,
        role: data.role as 'BRAND_ADMIN',
        organizationId: authCtx.tenantId,
      },
      headers,
    });
  }
}
