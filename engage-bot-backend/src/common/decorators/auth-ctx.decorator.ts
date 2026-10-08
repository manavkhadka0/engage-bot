import { createParamDecorator, ExecutionContext, Headers } from '@nestjs/common';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import {
  resolveTenantId,
  TENANT_ID_HEADER,
  type AuthContext,
} from '../guards/roles.guard';

export function sessionToAuth(
  session: UserSession,
  tenantHeader?: string | null,
): AuthContext {
  const roleRaw = session.user.role;
  const role = Array.isArray(roleRaw) ? roleRaw[0] : roleRaw;
  const { tenantId, isPlatform } = resolveTenantId({
    userRole: role,
    activeOrganizationId: session.session.activeOrganizationId,
    headerTenantId: tenantHeader ?? null,
  });
  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role,
      emailVerified: session.user.emailVerified,
    },
    session: {
      id: session.session.id,
      activeOrganizationId: session.session.activeOrganizationId,
    },
    tenantId,
    isPlatform,
  };
}

export const AuthCtx = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthContext => {
    const req = ctx.switchToHttp().getRequest<{
      session?: UserSession;
      headers: Record<string, string | string[] | undefined>;
    }>();
    const headerRaw = req.headers[TENANT_ID_HEADER];
    const header =
      typeof headerRaw === 'string'
        ? headerRaw
        : Array.isArray(headerRaw)
          ? headerRaw[0]
          : undefined;
    if (!req.session) {
      throw new Error('Missing session — AuthGuard should have run');
    }
    return sessionToAuth(req.session, header);
  },
);

export { TENANT_ID_HEADER };
