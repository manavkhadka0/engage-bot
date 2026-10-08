import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthContext } from '../../common/guards/roles.guard';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  private requireTenant(auth: AuthContext) {
    if (!auth.tenantId) throw new ForbiddenException('Active tenant required');
    return auth.tenantId;
  }

  list(auth: AuthContext) {
    const tenantId = this.requireTenant(auth);
    return this.prisma.location.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  }

  create(
    auth: AuthContext,
    data: { name: string; address?: string; lat?: number; lng?: number },
  ) {
    const tenantId = this.requireTenant(auth);
    return this.prisma.location.create({ data: { ...data, tenantId } });
  }

  async update(
    auth: AuthContext,
    id: string,
    data: { name?: string; address?: string; lat?: number; lng?: number },
  ) {
    const tenantId = this.requireTenant(auth);
    const row = await this.prisma.location.findFirst({
      where: { id, tenantId },
    });
    if (!row) throw new NotFoundException('Location not found');
    return this.prisma.location.update({ where: { id }, data });
  }
}
