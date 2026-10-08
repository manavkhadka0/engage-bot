export { AuthModule, AuthService, AllowAnonymous, OptionalAuth, Session, Roles, OrgRoles, AuthGuard, RequireActiveOrg } from '@thallesp/nestjs-better-auth';
export type { UserSession } from '@thallesp/nestjs-better-auth';
export { auth, mailService } from './auth';
export type { Auth } from './auth';
export * from './permissions';
