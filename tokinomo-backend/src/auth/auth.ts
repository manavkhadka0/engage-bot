import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { admin as adminPlugin, organization } from 'better-auth/plugins';
import { PrismaClient } from '@prisma/client';
import { MailService } from './mail.service';
import {
  ac,
  admin,
  brandAdmin,
  brandStaff,
  brandViewer,
  member,
  owner,
  platformAc,
  platformRoles,
} from './permissions';

const prisma = new PrismaClient();

const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3001';
const secret = process.env.BETTER_AUTH_SECRET;
if (!secret || secret.length < 16) {
  throw new Error('BETTER_AUTH_SECRET must be set (min 16 chars)');
}

export const mailService = new MailService(
  process.env.RESEND_API_KEY || undefined,
  process.env.RESEND_FROM_EMAIL ?? 'Tokinomo <noreply@example.com>',
);

export const auth = betterAuth({
  appName: 'Tokinomo',
  baseURL: process.env.BETTER_AUTH_URL ?? appUrl,
  secret,
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  trustedOrigins: (
    process.env.CORS_ORIGINS ?? `${frontendUrl},http://localhost:3001`
  )
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await mailService.send({
        to: user.email,
        subject: 'Verify your Tokinomo email',
        html: `
          <p>Hi ${user.name},</p>
          <p>Verify your email to access Tokinomo:</p>
          <p><a href="${url}">Verify email</a></p>
          <p>Or open: ${url}</p>
        `,
        text: `Verify your Tokinomo email: ${url}`,
      });
    },
  },
  plugins: [
    adminPlugin({
      defaultRole: 'user',
      adminRoles: ['PLATFORM_OWNER', 'PLATFORM_OPERATOR', 'admin'],
      ac: platformAc,
      roles: platformRoles,
    }),
    organization({
      ac,
      roles: {
        owner,
        admin,
        member,
        BRAND_ADMIN: brandAdmin,
        BRAND_STAFF: brandStaff,
        BRAND_VIEWER: brandViewer,
      },
      creatorRole: 'BRAND_ADMIN',
      allowUserToCreateOrganization: async (user) => {
        const role = (user as { role?: string }).role;
        return role === 'PLATFORM_OWNER' || role === 'PLATFORM_OPERATOR';
      },
      async sendInvitationEmail(data) {
        const inviteUrl = `${frontendUrl}/accept-invite?invitationId=${data.id}`;
        await mailService.send({
          to: data.email,
          subject: `Join ${data.organization.name} on Tokinomo`,
          html: `
            <p>You've been invited to <strong>${data.organization.name}</strong> as ${data.role}.</p>
            <p><a href="${inviteUrl}">Accept invitation</a></p>
          `,
          text: `Join ${data.organization.name}: ${inviteUrl}`,
        });
      },
    }),
  ],
});

export type Auth = typeof auth;
