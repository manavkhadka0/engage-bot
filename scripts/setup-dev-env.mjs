#!/usr/bin/env node
/**
 * Creates / completes engage-bot-backend/.env from .env.example without ever
 * committing a secret: blank secrets get random per-machine values, {{NAME}}
 * placeholders are resolved, and S3_PUBLIC_ENDPOINT gets this machine's LAN IP.
 *
 *   pnpm setup:env                 (from engage-bot-backend/)  — idempotent: only fills
 *                                  missing/blank keys, never overwrites a set value
 *   node scripts/setup-dev-env.mjs --reset-secrets
 *                                  regenerate every generated secret (infrastructure
 *                                  volumes created with the old ones must be recreated);
 *                                  keeps RESEND_*, LEADS_EMAIL, PLATFORM_EMAIL, COOKIE_DOMAIN
 *
 * The generated .env is gitignored. Values are never printed.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(here, '..', 'engage-bot-backend');
const examplePath = path.join(dir, '.env.example');
const envPath = path.join(dir, '.env');
const reset = process.argv.includes('--reset-secrets');
const existed = fs.existsSync(envPath);

// secret name -> random bytes (hex-encoded, so safe in URLs and shell)
const GENERATED = {
  POSTGRES_PASSWORD: 24,
  MINIO_ROOT_PASSWORD: 24,
  EMQX_DASHBOARD_PASSWORD: 24,
  EMQX_NODE_COOKIE: 24,
  MQTT_PASSWORD: 24,
  BETTER_AUTH_SECRET: 32,
  PLATFORM_PASSWORD: 18,
};
const KEEP_ON_RESET = new Set(['RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'LEADS_EMAIL', 'PLATFORM_EMAIL', 'COOKIE_DOMAIN']);
const isPlaceholder = (v) => v === '' || /^change-?me/i.test(v);

const parse = (text) => {
  const map = {};
  for (const line of text.split('\n')) {
    const m = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    if (m) map[m[1]] = m[2];
  }
  return map;
};

function lanIp() {
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const a of addrs ?? []) if (a.family === 'IPv4' && !a.internal) return a.address;
  }
  return 'localhost';
}

const exampleText = fs.readFileSync(examplePath, 'utf8');
const existing = fs.existsSync(envPath) ? parse(fs.readFileSync(envPath, 'utf8')) : {};
const generated = [];

// Pass 1: decide each key's value.
const values = {};
for (const line of exampleText.split('\n')) {
  const m = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
  if (!m) continue;
  const [, key, exampleValue] = m;
  const old = existing[key];
  const keepOld = old !== undefined && !isPlaceholder(old) && (!reset || KEEP_ON_RESET.has(key));
  if (keepOld) values[key] = old;
  else if (key in GENERATED) { values[key] = randomBytes(GENERATED[key]).toString('hex'); generated.push(key); }
  else if (key === 'S3_PUBLIC_ENDPOINT') { values[key] = `http://${lanIp()}:9000`; generated.push(key); }
  else if (old !== undefined && !reset) values[key] = old;
  else values[key] = exampleValue;
}
// Pass 2: resolve {{NAME}} templates (only for values we did not keep from an existing file).
const resolve = (v) => v.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_, n) => values[n] ?? '');
for (const k of Object.keys(values)) values[k] = resolve(values[k]);

// Write: keep the example's layout/comments; append unknown keys the user already had.
const out = exampleText.split('\n').map((line) => {
  const m = line.match(/^([A-Z][A-Z0-9_]*)=/);
  return m ? `${m[1]}=${values[m[1]]}` : line;
});
const extras = Object.keys(existing).filter((k) => !(k in values));
if (extras.length) out.push('', '# Additional settings carried over from your previous .env', ...extras.map((k) => `${k}=${existing[k]}`));
fs.writeFileSync(envPath, out.join('\n'), { mode: 0o600 });

console.log(`${existed ? 'Updated' : 'Created'} engage-bot-backend/.env (gitignored, mode 600).`);
console.log(generated.length ? `Generated: ${generated.join(', ')}` : 'Nothing to generate — every value was already set.');
if (generated.includes('PLATFORM_PASSWORD')) console.log('The platform-owner password is in that file as PLATFORM_PASSWORD (not printed).');
if (reset) console.log('Secrets were regenerated: recreate local infrastructure volumes (docker compose down -v) so they match.');
