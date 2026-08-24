/**
 * Jest stub for every `better-auth*` import path used in src/ (see
 * `moduleNameMapper` in package.json's jest config).
 *
 * better-auth ships ESM-only output (`.mjs`, bare `import`), which the
 * project's ts-jest/CJS setup can't parse — any spec that transitively
 * imports it fails with "Cannot use import statement outside a module"
 * before a single test runs. Unit tests exercising our own logic (guards,
 * permission resolution, services) don't need better-auth's real
 * implementation, just something importable with the right shape, so this
 * stub stands in for the whole package rather than the app config being
 * changed to accommodate a dependency the tests don't actually exercise.
 *
 * If a test ever needs to assert on real better-auth behavior, that
 * belongs in an integration/e2e test run against a real server instead of
 * fighting this mock into providing real auth semantics.
 */

export const betterAuth = () => ({});
export const prismaAdapter = () => ({});
export const admin = () => ({});
export const organization = () => ({});

export const createAccessControl = () => ({
  newRole: () => ({}),
});

export const adminAc = { statements: {} };
export const userAc = { statements: {} };
export const memberAc = { statements: {} };
export const ownerAc = { statements: {} };
export const defaultStatements = {};

export const fromNodeHeaders = (headers: unknown) => headers;
