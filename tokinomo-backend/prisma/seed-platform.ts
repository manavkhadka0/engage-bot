import { PrismaClient } from '@prisma/client';
import { auth } from '../src/auth/auth';

/**
 * Seeds a Baliyo platform owner.
 * Usage: pnpm seed:platform
 *
 * Env overrides:
 *   PLATFORM_EMAIL, PLATFORM_PASSWORD, PLATFORM_NAME
 */
async function main() {
  const prisma = new PrismaClient();
  const email = (
    process.env.PLATFORM_EMAIL ?? 'admin@baliyo.ventures'
  ).toLowerCase();
  const password = process.env.PLATFORM_PASSWORD ?? '***REMOVED***';
  const name = process.env.PLATFORM_NAME ?? 'Baliyo Platform Owner';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        role: 'PLATFORM_OWNER',
        emailVerified: true,
        name,
      },
    });
    console.log(`Updated existing platform owner: ${email}`);
  } else {
    const created = await auth.api.createUser({
      body: {
        email,
        password,
        name,
        role: 'PLATFORM_OWNER',
      },
    });
    await prisma.user.update({
      where: { id: created.user.id },
      data: { emailVerified: true },
    });
    console.log(`Created platform owner: ${email}`);
  }

  console.log(`Password: ${password}`);
  console.log('Sign in via POST /api/auth/sign-in/email');
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
