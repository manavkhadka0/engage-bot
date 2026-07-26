import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const CreateTenantSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be lowercase kebab-case'),
  tier: z.enum(['BASIC', 'GROWTH', 'BRAND']).default('GROWTH'),
  adminName: z.string().min(1).max(120),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8).max(128),
});

export class CreateTenantDto extends createZodDto(CreateTenantSchema) {}

export const UpdateTenantSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  tier: z.enum(['BASIC', 'GROWTH', 'BRAND']).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
});

export class UpdateTenantDto extends createZodDto(UpdateTenantSchema) {}
