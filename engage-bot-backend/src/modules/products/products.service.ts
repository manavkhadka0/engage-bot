import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthContext } from '../../common/guards/roles.guard';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  private requireTenant(auth: AuthContext) {
    if (!auth.tenantId) throw new ForbiddenException('Active tenant required');
    return auth.tenantId;
  }

  list(auth: AuthContext) {
    const tenantId = this.requireTenant(auth);
    return this.prisma.product.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(
    auth: AuthContext,
    data: { name: string; sku: string; imageKey?: string },
  ) {
    const tenantId = this.requireTenant(auth);
    return this.prisma.product.create({
      data: { ...data, tenantId },
    });
  }

  async update(
    auth: AuthContext,
    id: string,
    data: { name?: string; sku?: string; imageKey?: string },
  ) {
    const tenantId = this.requireTenant(auth);
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId },
    });
    if (!product) throw new NotFoundException('Product not found');
    return this.prisma.product.update({ where: { id }, data });
  }
}
