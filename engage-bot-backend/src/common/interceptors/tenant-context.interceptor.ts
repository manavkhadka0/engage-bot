import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { PrismaService } from '../prisma/prisma.service';
import {
  resolveTenantId,
  type AuthContext,
  TENANT_ID_HEADER,
} from '../guards/roles.guard';

/**
 * Sets Postgres RLS session vars when a tenant context is known.
 * Platform users may pass x-tenant-id to impersonate.
 */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{
      auth?: AuthContext;
      headers: Record<string, string | string[] | undefined>;
      user?: {
        id: string;
        email: string;
        name: string;
        role?: string;
        emailVerified?: boolean;
      };
      session?: {
        id: string;
        activeOrganizationId?: string | null;
        user?: {
          id: string;
          email: string;
          name: string;
          role?: string;
          emailVerified?: boolean;
        };
        session?: { id: string; activeOrganizationId?: string | null };
      };
    }>();

    if (!req.auth) {
      const user = req.user ?? req.session?.user;
      const sess = req.session?.session ?? req.session;
      if (user && sess && 'id' in sess) {
        const headerRaw = req.headers[TENANT_ID_HEADER];
        const headerTenantId = Array.isArray(headerRaw)
          ? headerRaw[0]
          : headerRaw;
        const activeOrganizationId =
          'activeOrganizationId' in sess
            ? (sess.activeOrganizationId as string | null | undefined)
            : undefined;
        const { tenantId, isPlatform } = resolveTenantId({
          userRole: user.role,
          activeOrganizationId,
          headerTenantId: headerTenantId ?? null,
        });
        req.auth = {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            emailVerified: !!user.emailVerified,
          },
          session: {
            id: String(sess.id ?? ''),
            activeOrganizationId,
          },
          tenantId,
          isPlatform,
        };
      }
    }

    const auth = req.auth;
    if (!auth) return next.handle();

    const tenantId = auth.tenantId ?? '';
    const isPlatform = auth.isPlatform ? 'true' : 'false';

    return from(
      this.prisma.$executeRaw`
        SELECT set_config('app.tenant_id', ${tenantId}, true),
               set_config('app.is_platform', ${isPlatform}, true)
      `,
    ).pipe(switchMap(() => next.handle()));
  }
}
