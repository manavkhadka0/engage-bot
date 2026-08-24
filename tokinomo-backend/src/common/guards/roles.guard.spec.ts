import {
  ForbiddenException,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  RolesGuard,
  resolveTenantId,
  ROLES_KEY,
  type AuthContext,
} from './roles.guard';

/**
 * resolveTenantId decides which tenant a request is scoped to — the exact
 * decision that was previously (wrongly) trusted straight from an MQTT
 * topic segment. Platform vs. brand users must resolve differently: a
 * platform user's tenant comes from an explicit header (impersonation),
 * never silently guessed.
 */
describe('resolveTenantId', () => {
  it('scopes a platform user to the header tenant when impersonating', () => {
    const result = resolveTenantId({
      userRole: 'PLATFORM_OWNER',
      activeOrganizationId: 'org-session',
      headerTenantId: 'org-header',
    });
    expect(result).toEqual({ isPlatform: true, tenantId: 'org-header' });
  });

  it('falls back to the session org when a platform user sends no header', () => {
    const result = resolveTenantId({
      userRole: 'PLATFORM_OPERATOR',
      activeOrganizationId: 'org-session',
      headerTenantId: null,
    });
    expect(result).toEqual({ isPlatform: true, tenantId: 'org-session' });
  });

  it('leaves a platform user unscoped (platform-wide view) when neither is set', () => {
    const result = resolveTenantId({ userRole: 'PLATFORM_OWNER' });
    expect(result).toEqual({ isPlatform: true, tenantId: null });
  });

  it('ignores the header entirely for a non-platform user (cannot impersonate via header)', () => {
    const result = resolveTenantId({
      userRole: 'BRAND_ADMIN',
      activeOrganizationId: 'org-session',
      headerTenantId: 'org-someone-elses',
    });
    expect(result).toEqual({ isPlatform: false, tenantId: 'org-session' });
  });

  it('leaves a non-platform user with no active org unscoped', () => {
    const result = resolveTenantId({
      userRole: 'BRAND_ADMIN',
      activeOrganizationId: null,
    });
    expect(result).toEqual({ isPlatform: false, tenantId: null });
  });
});

describe('RolesGuard', () => {
  function makeContext(opts: {
    auth?: AuthContext;
    memberRole?: string;
  }): ExecutionContext {
    const request: Record<string, unknown> = {
      auth: opts.auth,
      memberRole: opts.memberRole,
    };
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
  }

  function makeReflector(required: string[] | undefined): {
    reflector: Reflector;
    getAllAndOverride: jest.Mock;
  } {
    const getAllAndOverride = jest.fn().mockReturnValue(required);
    return {
      reflector: { getAllAndOverride } as unknown as Reflector,
      getAllAndOverride,
    };
  }

  const platformAuth = (role: string): AuthContext => ({
    user: { id: 'u1', email: 'a@b.com', name: 'A', role, emailVerified: true },
    session: { id: 's1' },
    tenantId: null,
    isPlatform: true,
  });

  const brandAuth = (role: string): AuthContext => ({
    user: { id: 'u1', email: 'a@b.com', name: 'A', role, emailVerified: true },
    session: { id: 's1' },
    tenantId: 'org-1',
    isPlatform: false,
  });

  it('allows the request through when the route has no @RequireRoles', () => {
    const guard = new RolesGuard(makeReflector(undefined).reflector);
    expect(guard.canActivate(makeContext({}))).toBe(true);
  });

  it('throws UnauthorizedException when a role is required but req.auth is missing', () => {
    const guard = new RolesGuard(makeReflector(['BRAND_ADMIN']).reflector);
    expect(() => guard.canActivate(makeContext({}))).toThrow(
      UnauthorizedException,
    );
  });

  it('lets a platform user through on a platform-only route', () => {
    const guard = new RolesGuard(makeReflector(['PLATFORM_OWNER']).reflector);
    const ctx = makeContext({ auth: platformAuth('PLATFORM_OWNER') });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('rejects a signed-in but non-platform user on a platform-only route', () => {
    const guard = new RolesGuard(makeReflector(['PLATFORM_OWNER']).reflector);
    const ctx = makeContext({ auth: platformAuth('user') });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('lets a brand admin through on a brand-role route via user.role', () => {
    const guard = new RolesGuard(makeReflector(['BRAND_ADMIN']).reflector);
    const ctx = makeContext({ auth: brandAuth('BRAND_ADMIN') });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('lets a platform user through a brand-role route only via an impersonated memberRole', () => {
    const guard = new RolesGuard(makeReflector(['BRAND_ADMIN']).reflector);
    const ctx = makeContext({
      auth: platformAuth('PLATFORM_OWNER'),
      memberRole: 'BRAND_ADMIN',
    });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('rejects a platform user on a brand-role route with no impersonated memberRole', () => {
    const guard = new RolesGuard(makeReflector(['BRAND_ADMIN']).reflector);
    const ctx = makeContext({ auth: platformAuth('PLATFORM_OWNER') });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('rejects a brand user whose role does not match any required role', () => {
    const guard = new RolesGuard(makeReflector(['BRAND_ADMIN']).reflector);
    const ctx = makeContext({ auth: brandAuth('BRAND_VIEWER') });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('reads roles metadata from both the handler and the class', () => {
    const { reflector, getAllAndOverride } = makeReflector(['BRAND_ADMIN']);
    const guard = new RolesGuard(reflector);
    const ctx = makeContext({ auth: brandAuth('BRAND_ADMIN') });
    guard.canActivate(ctx);
    expect(getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
  });
});
