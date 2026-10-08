export const PLATFORM_ROLES = [
  "PLATFORM_OWNER",
  "PLATFORM_OPERATOR",
] as const;

export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export const BRAND_ROLES = [
  "BRAND_ADMIN",
  "BRAND_STAFF",
  "BRAND_VIEWER",
] as const;

export type BrandRole = (typeof BRAND_ROLES)[number];

export function isPlatformRole(role?: string | null): boolean {
  return !!role && PLATFORM_ROLES.includes(role as PlatformRole);
}

export function canManageUsers(brandRole?: string | null): boolean {
  return brandRole === "BRAND_ADMIN";
}

export function canMutateContent(brandRole?: string | null): boolean {
  return brandRole === "BRAND_ADMIN" || brandRole === "BRAND_STAFF";
}

export function isReadOnlyBrand(brandRole?: string | null): boolean {
  return brandRole === "BRAND_VIEWER";
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role?: string | null;
  emailVerified?: boolean;
};

export type SessionOrg = {
  id: string;
  name: string;
  slug: string;
};

export type AppSession = {
  user: SessionUser;
  session: {
    id: string;
    activeOrganizationId?: string | null;
  };
};
