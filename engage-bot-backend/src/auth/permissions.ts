import { createAccessControl } from 'better-auth/plugins/access';
import {
  adminAc as adminPluginAdminAc,
  defaultStatements as adminDefaultStatements,
  userAc as adminPluginUserAc,
} from 'better-auth/plugins/admin/access';
import {
  defaultStatements,
  adminAc,
  memberAc,
  ownerAc,
} from 'better-auth/plugins/organization/access';

/**
 * Platform roles live on User.role (admin plugin):
 *   PLATFORM_OWNER | PLATFORM_OPERATOR | user
 *
 * Brand roles live on Member.role (organization plugin):
 *   BRAND_ADMIN | BRAND_STAFF | BRAND_VIEWER
 */

export const PLATFORM_ROLES = [
  'PLATFORM_OWNER',
  'PLATFORM_OPERATOR',
] as const;

export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export const BRAND_ROLES = [
  'BRAND_ADMIN',
  'BRAND_STAFF',
  'BRAND_VIEWER',
] as const;

export type BrandRole = (typeof BRAND_ROLES)[number];

// ─── Admin plugin (platform) ────────────────────────────────────────────────

export const platformAc = createAccessControl({
  ...adminDefaultStatements,
});

export const platformOwner = platformAc.newRole({
  ...adminPluginAdminAc.statements,
});

export const platformOperator = platformAc.newRole({
  ...adminPluginAdminAc.statements,
});

export const platformUser = platformAc.newRole({
  ...adminPluginUserAc.statements,
});

export const platformRoles = {
  PLATFORM_OWNER: platformOwner,
  PLATFORM_OPERATOR: platformOperator,
  admin: platformOwner,
  user: platformUser,
};

// ─── Organization plugin (brand) ────────────────────────────────────────────

const orgStatement = {
  ...defaultStatements,
  device: ['read', 'create', 'update', 'assign', 'provision'],
  product: ['read', 'create', 'update', 'delete'],
  location: ['read', 'create', 'update', 'delete'],
  audio: ['read', 'upload', 'assign', 'push'],
  analytics: ['read'],
  user: ['read', 'invite', 'update', 'remove'],
  tenant: ['read', 'create', 'update', 'suspend'],
} as const;

export const ac = createAccessControl(orgStatement);

export const brandViewer = ac.newRole({
  device: ['read'],
  product: ['read'],
  location: ['read'],
  audio: ['read'],
  analytics: ['read'],
  ...memberAc.statements,
});

export const brandStaff = ac.newRole({
  device: ['read'],
  product: ['read', 'create', 'update'],
  location: ['read'],
  audio: ['read', 'upload', 'assign', 'push'],
  analytics: ['read'],
  user: ['read'],
  ...memberAc.statements,
});

export const brandAdmin = ac.newRole({
  device: ['read', 'update'],
  product: ['read', 'create', 'update', 'delete'],
  location: ['read', 'create', 'update', 'delete'],
  audio: ['read', 'upload', 'assign', 'push'],
  analytics: ['read'],
  user: ['read', 'invite', 'update', 'remove'],
  ...adminAc.statements,
});

export const owner = ac.newRole({
  ...ownerAc.statements,
  device: ['read', 'create', 'update', 'assign', 'provision'],
  product: ['read', 'create', 'update', 'delete'],
  location: ['read', 'create', 'update', 'delete'],
  audio: ['read', 'upload', 'assign', 'push'],
  analytics: ['read'],
  user: ['read', 'invite', 'update', 'remove'],
  tenant: ['read', 'update'],
});

export const admin = brandAdmin;
export const member = brandViewer;

export const orgRoles = {
  owner,
  admin,
  member,
  BRAND_ADMIN: brandAdmin,
  BRAND_STAFF: brandStaff,
  BRAND_VIEWER: brandViewer,
};

export function isPlatformRole(role?: string | null): boolean {
  return !!role && PLATFORM_ROLES.includes(role as PlatformRole);
}
