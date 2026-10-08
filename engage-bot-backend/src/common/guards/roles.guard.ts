import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { isPlatformRole, PLATFORM_ROLES, type PlatformRole } from '../../auth/permissions';

export const TENANT_ID_HEADER = 'x-tenant-id';
export const IS_PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
export const RequireRoles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

export type RequestUser = {
  id: string;
  email: string;
  name: string;
  role?: string | null;
  emailVerified: boolean;
};

export type AuthContext = {
  user: RequestUser;
  session: {
    id: string;
    activeOrganizationId?: string | null;
  };
  /** Effective tenant for this request (org id) */
  tenantId: string | null;
  isPlatform: boolean;
};

declare module 'express' {
  interface Request {
    auth?: AuthContext;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const req = context.switchToHttp().getRequest<{ auth?: AuthContext }>();
    const auth = req.auth;
    if (!auth) throw new UnauthorizedException();

    if (auth.isPlatform) {
      const ok = required.some(
        (r) =>
          auth.user.role === r ||
          (PLATFORM_ROLES as readonly string[]).includes(r) &&
            isPlatformRole(auth.user.role),
      );
      // Platform can access platform-only routes; brand routes need impersonation
      if (required.every((r) => (PLATFORM_ROLES as readonly string[]).includes(r))) {
        if (!isPlatformRole(auth.user.role)) {
          throw new ForbiddenException('Platform role required');
        }
        return true;
      }
    }

    const memberRole = (req as { memberRole?: string }).memberRole;
    const userRole = auth.user.role;
    const has = required.some((r) => r === userRole || r === memberRole);
    if (!has) throw new ForbiddenException('Insufficient role');
    return true;
  }
}

export function resolveTenantId(opts: {
  userRole?: string | null;
  activeOrganizationId?: string | null;
  headerTenantId?: string | null;
}): { tenantId: string | null; isPlatform: boolean } {
  const isPlatform = isPlatformRole(opts.userRole);
  if (isPlatform) {
    return {
      isPlatform: true,
      tenantId: opts.headerTenantId ?? opts.activeOrganizationId ?? null,
    };
  }
  return {
    isPlatform: false,
    tenantId: opts.activeOrganizationId ?? null,
  };
}

export type { PlatformRole };
