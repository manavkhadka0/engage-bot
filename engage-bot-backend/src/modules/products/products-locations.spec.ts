import { NotFoundException } from '@nestjs/common';
import type { AuthContext } from '../../common/guards/roles.guard';
import type { PrismaService } from '../../common/prisma/prisma.service';
import { LocationsService } from '../locations/locations.service';
import { ProductsService } from './products.service';

const auth = (tenantId: string | null): AuthContext => ({
  user: { id: 'u', email: 'a@b.c', name: 'U', role: 'BRAND_ADMIN', emailVerified: true },
  session: { id: 's' },
  tenantId,
  isPlatform: false,
});

describe.each([
  ['product', (p: any) => new ProductsService(p as PrismaService)],
  ['location', (p: any) => new LocationsService(p as PrismaService)],
] as const)('%s remove', (model, build) => {
  it('deletes only inside the caller\'s tenant', async () => {
    const prisma = { [model]: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) } };
    const out = await (build(prisma) as any).remove(auth('t1'), 'x1');
    expect(out).toEqual({ id: 'x1', deleted: true });
    expect((prisma as any)[model].deleteMany).toHaveBeenCalledWith({ where: { id: 'x1', tenantId: 't1' } });
  });

  it('404s when the row belongs to another tenant (nothing deleted)', async () => {
    const prisma = { [model]: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) } };
    await expect((build(prisma) as any).remove(auth('t1'), 'other')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('requires an active tenant', async () => {
    const prisma = { [model]: { deleteMany: jest.fn() } };
    await expect((build(prisma) as any).remove(auth(null), 'x')).rejects.toThrow(/Active tenant/);
    expect((prisma as any)[model].deleteMany).not.toHaveBeenCalled();
  });
});
