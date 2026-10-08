#!/usr/bin/env node
/**
 * End-to-end smoke test for a deployed Engage Bot stack, acting like the browser and
 * a device would: sign in through the web app, open the realtime socket, create a
 * throwaway tenant + device, log the device into the MQTT broker, upload a ~3.5 MB
 * clip, push it, and download it from the presigned URL the device receives.
 *
 *   API_URL=https://api.example.com \
 *   APP_URL=https://app.example.com \
 *   MQTT_URL=mqtts://mqtt.example.com:8883 \
 *   PLATFORM_EMAIL=you@example.com PLATFORM_PASSWORD='...' \
 *   REQUIRE_EMAIL=1 \
 *   node scripts/prod-smoke.mjs
 *
 * Optional: KEEP=1 skips archiving the test tenant; REQUIRE_EMAIL=1 makes a failed
 * welcome email a failure (otherwise it is only a warning).
 *
 * Needs `pnpm install` in engage-bot-backend (mqtt) and engage-bot-frontend (socket.io-client).
 * Creates tenant "smoke-<id>" (soft-archived at the end) and one clip in storage.
 * The tenant's welcome email goes to PLATFORM_EMAIL via plus-addressing
 * (you+smoke<id>@domain), so it lands in your own inbox. Never prints secrets.
 */
import { createRequire } from 'node:module';
import { createHash, randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const need = (name) => {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing required environment variable ${name} (see the header of this file).`);
    process.exit(2);
  }
  return v;
};
const API_URL = need('API_URL').replace(/\/$/, '');
const APP_URL = need('APP_URL').replace(/\/$/, '');
const MQTT_URL = need('MQTT_URL');
const EMAIL = need('PLATFORM_EMAIL');
const PASSWORD = need('PLATFORM_PASSWORD');
const KEEP = process.env.KEEP === '1';
const REQUIRE_EMAIL = process.env.REQUIRE_EMAIL === '1';

const requireFrom = (rel) => createRequire(path.resolve(here, rel));
const mqtt = requireFrom('../engage-bot-backend/package.json')('mqtt');
const { io } = requireFrom('../engage-bot-frontend/package.json')('socket.io-client');

const results = [];
const step = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
  return ok;
};
const warn = (name, detail = '') => console.log(`WARN  ${name}${detail ? '  — ' + detail : ''}`);
const die = (msg) => {
  console.log(`\nStopping: ${msg}`);
  summarize(1);
};
function summarize(forceCode) {
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} steps passed`);
  process.exit(forceCode ?? (failed.length ? 1 : 0));
}

let cookie = '';
async function call(method, url, { body, headers = {}, form, origin = APP_URL } = {}) {
  const res = await fetch(url, {
    method,
    redirect: 'manual',
    headers: { origin, ...(cookie ? { cookie } : {}), ...(body ? { 'content-type': 'application/json' } : {}), ...headers },
    body: form ?? (body ? JSON.stringify(body) : undefined),
  });
  const setCookies = res.headers.getSetCookie?.() ?? [];
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, json, setCookies, headers: res.headers };
}
// Same path the browser uses: web app -> /api/be/* -> API.
const be = (method, p, opts) => call(method, `${APP_URL}/api/be${p}`, opts);

function makeWav(targetBytes = 3.5 * 1024 * 1024) {
  const rate = 22050;
  const samples = Math.floor((targetBytes - 44) / 2);
  const data = Buffer.alloc(samples * 2);
  for (let i = 0; i < samples; i++) data.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 440 * i) / rate) * 12000), i * 2);
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

// 1. services are up
let r = await call('GET', `${API_URL}/health`);
step('API /health', r.status === 200, `HTTP ${r.status}`);
r = await call('GET', `${APP_URL}/login`);
step('web app serves /login', r.status === 200, `HTTP ${r.status}`);
r = await call('GET', `${APP_URL}/admin`);
step('web app redirects anonymous /admin to /login', r.status >= 300 && r.status < 400 && /\/login/.test(r.headers.get('location') ?? ''), `HTTP ${r.status}`);

// 2. sign in through the web app, exactly like the browser
r = await call('POST', `${APP_URL}/api/auth/sign-in/email`, { body: { email: EMAIL, password: PASSWORD } });
const session = r.setCookies.find((c) => /session_token/.test(c));
if (!step('platform owner signs in through the web app', r.status === 200 && !!session, `HTTP ${r.status}`)) {
  die('cannot continue without a session (check PLATFORM_EMAIL / PLATFORM_PASSWORD)');
}
cookie = r.setCookies.map((c) => c.split(';')[0]).join('; ');

// 3. the session cookie must reach the API host, or realtime silently never authenticates
const apiHost = new URL(API_URL).hostname;
const appHost = new URL(APP_URL).hostname;
const domain = (session.match(/;\s*domain=([^;]+)/i) ?? [])[1]?.replace(/^\./, '').toLowerCase();
const reachesApi = apiHost === appHost || (!!domain && (apiHost === domain || apiHost.endsWith('.' + domain)));
step(
  'session cookie is sent to the API host (realtime needs it)',
  reachesApi,
  reachesApi ? (domain ? `Domain=${domain}` : 'same host') : `cookie is host-only for ${appHost}; set COOKIE_DOMAIN=.<parent domain> on the API`,
);

// 4. realtime websocket authenticates with that cookie
const socket = io(`${API_URL}/realtime`, {
  transports: ['websocket'],
  extraHeaders: reachesApi ? { cookie } : {},
});
const ack = await new Promise((resolve) => {
  socket.on('connect', () => socket.emit('subscribe.platform', {}, resolve));
  socket.on('connect_error', (e) => resolve({ connect_error: e.message }));
  setTimeout(() => resolve({ timeout: true }), 10000);
});
step('realtime websocket authenticates and joins the platform room', ack?.ok === true, JSON.stringify(ack));
socket.close();

// 5. tenant + device
const stamp = Date.now().toString(36);
const [local, mailDomain] = EMAIL.split('@');
r = await be('POST', '/tenants', {
  body: { name: `Smoke ${stamp}`, slug: `smoke-${stamp}`, tier: 'GROWTH', adminName: 'Smoke Admin', adminEmail: `${local}+smoke${stamp}@${mailDomain}`, adminPassword: `Pw-${randomBytes(12).toString('base64url')}` },
});
const tenantId = r.json?.tenant?.id ?? r.json?.id;
if (!step('create tenant', (r.status === 201 || r.status === 200) && !!tenantId, `HTTP ${r.status}`)) die(JSON.stringify(r.json));
if (r.json?.emailSent === true) step('welcome email accepted by the mail provider', true);
else if (REQUIRE_EMAIL) step('welcome email accepted by the mail provider', false, 'emailSent=false — check RESEND_API_KEY and that the sending domain is verified in Resend');
else warn('welcome email was not sent (emailSent=false)', 'check RESEND_*; set REQUIRE_EMAIL=1 to make this a failure');

const serial = `TK-SMOKE-${stamp.toUpperCase()}`;
r = await be('POST', '/devices/provision', { body: { serial } });
const deviceId = r.json?.id ?? r.json?.device?.id;
const token = r.json?.provisionToken ?? r.json?.device?.provisionToken ?? r.json?.token;
if (!step('provision device', !!deviceId && !!token, `HTTP ${r.status}`)) die(JSON.stringify(r.json));
r = await be('POST', `/devices/${deviceId}/assign`, { body: { tenantId } });
step('assign device to tenant', r.status === 200 || r.status === 201, `HTTP ${r.status}`);

// 6. the device connects to the broker the way firmware will (TLS verified for mqtts://)
const topic = `t/${tenantId}/d/${deviceId}/cmd`;
let gotMsg;
const msgPromise = new Promise((resolve) => { gotMsg = resolve; });
const timeout = new Promise((resolve) => setTimeout(() => resolve(null), 45000));
const dev = mqtt.connect(MQTT_URL, { username: serial, password: token, clientId: `smoke-${serial}`, reconnectPeriod: 0 });
const connected = await new Promise((res) => {
  dev.once('connect', () => res(true));
  dev.once('error', (e) => res(String(e.message)));
  setTimeout(() => res('timeout'), 15000);
});
step(`device logs into the broker (${MQTT_URL.split(':')[0]})`, connected === true, connected === true ? '' : String(connected));
dev.on('message', (t, buf) => gotMsg({ t, buf }));
const sub = await new Promise((res) => dev.subscribe(topic, (err, g) => res(err ? err.message : g)));
step('device may subscribe to its own cmd topic', Array.isArray(sub) && sub[0]?.qos !== 128, JSON.stringify(sub));
const other = await new Promise((res) => dev.subscribe(`t/${tenantId}/d/not-my-device/cmd`, (err, g) => res(err ? err.message : g)));
step("device may NOT subscribe to another device's topic", (Array.isArray(other) && other[0]?.qos === 128) || (typeof other === 'string' && /Subscribe error/i.test(other)), JSON.stringify(other));

r = await be('POST', `/devices/${deviceId}/simulate`, { body: { action: 'online' } });
step('simulate device online', r.status === 200 || r.status === 201, `HTTP ${r.status}`);

// 7. upload through the web proxy, push, device downloads via the presigned URL
const wav = makeWav();
const sha = createHash('sha256').update(wav).digest('hex');
const form = new FormData();
form.append('file', new Blob([wav], { type: 'audio/wav' }), `smoke-${stamp}.wav`);
form.append('name', `Smoke clip ${stamp}`);
r = await be('POST', '/audio/upload', { form, headers: { 'x-tenant-id': tenantId } });
const clip = r.json;
if (!step(`upload ${(wav.length / 1048576).toFixed(1)} MB WAV via the web proxy to object storage`, (r.status === 200 || r.status === 201) && !!clip?.id, `HTTP ${r.status}`)) die(JSON.stringify(r.json));
step('stored checksum equals sha256 of the uploaded bytes', clip.checksum === sha);

r = await be('POST', `/audio/${clip.id}/push`, { body: { deviceIds: [deviceId] }, headers: { 'x-tenant-id': tenantId } });
step('push audio to device', r.status === 200 || r.status === 201, `HTTP ${r.status}`);
const msg = await Promise.race([msgPromise, timeout]);
step('device receives the audio_update command over MQTT', !!msg);
if (msg) {
  const payload = JSON.parse(msg.buf.toString());
  const url = payload.url ?? payload.payload?.url ?? '';
  step('command carries an http(s) presigned URL', /^https?:\/\//.test(url), url ? new URL(url).origin : '');
  if (/^https?:\/\//.test(url)) {
    const dl = await fetch(url);
    const bytes = Buffer.from(await dl.arrayBuffer());
    step('device can download the clip from that URL', dl.status === 200, `HTTP ${dl.status}, ${bytes.length} bytes`);
    step('downloaded bytes match the uploaded file (sha256)', createHash('sha256').update(bytes).digest('hex') === sha);
  }
}
dev.end(true);

// 8. tidy up (soft-archive; the clip stays in storage)
if (KEEP) warn(`KEEP=1: leaving tenant smoke-${stamp} active`);
else {
  r = await be('POST', `/tenants/${tenantId}/archive`, { body: { auditNote: 'automated smoke test cleanup' } });
  step('archive the smoke-test tenant', r.status === 200 || r.status === 201, `HTTP ${r.status}`);
}
summarize();
