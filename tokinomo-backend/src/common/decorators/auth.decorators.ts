import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthContext } from '../guards/roles.guard';

export const CurrentAuth = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthContext | undefined => {
    const req = ctx.switchToHttp().getRequest<{ auth?: AuthContext }>();
    return req.auth;
  },
);

export const CurrentTenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | null => {
    const req = ctx.switchToHttp().getRequest<{ auth?: AuthContext }>();
    return req.auth?.tenantId ?? null;
  },
);
