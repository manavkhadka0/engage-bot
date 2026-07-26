import { ForbiddenException, Injectable } from '@nestjs/common';
import { fromNodeHeaders } from 'better-auth/node';
import type { Request } from 'express';
import { auth } from '../../auth/auth';
import type { AuthContext } from '../../common/guards/roles.guard';
import { PrismaService } from '../../common/prisma/prisma.service';

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
