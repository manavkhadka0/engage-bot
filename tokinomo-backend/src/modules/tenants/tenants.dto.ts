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
  notes: z.string().max(4000).nullable().optional(),
  brandLogoUrl: z.string().url().nullable().optional().or(z.literal('')),
  brandDomain: z.string().max(120).nullable().optional().or(z.literal('')),
  tier: z.enum(['BASIC', 'GROWTH', 'BRAND']).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
  auditNote: z.string().min(1).max(500).optional(),
});

export class UpdateTenantDto extends createZodDto(UpdateTenantSchema) {}

export const RenameSlugSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be lowercase kebab-case'),
  confirm: z.literal(true),
  auditNote: z.string().min(1).max(500),
});

export class RenameSlugDto extends createZodDto(RenameSlugSchema) {}

export const ArchiveTenantSchema = z.object({
  auditNote: z.string().min(1).max(500),
});

export class ArchiveTenantDto extends createZodDto(ArchiveTenantSchema) {}

export const WipeTelemetrySchema = z.object({
  auditNote: z.string().min(1).max(500),
  confirm: z.literal(true),
});

export class WipeTelemetryDto extends createZodDto(WipeTelemetrySchema) {}

export const SimulateFleetSchema = z.object({
  action: z.enum(['loop', 'online', 'offline']).default('loop'),
});

export class SimulateFleetDto extends createZodDto(SimulateFleetSchema) {}

export const TransferAdminSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120).optional(),
  auditNote: z.string().min(1).max(500),
});

export class TransferAdminDto extends createZodDto(TransferAdminSchema) {}
