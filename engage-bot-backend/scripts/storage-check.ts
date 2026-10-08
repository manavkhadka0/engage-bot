import { createHash } from 'crypto';
import { StorageService } from '../src/common/storage/storage.service';

/**
 * Verifies the configured S3-compatible store (MinIO, Cloudflare R2,
 * Backblaze B2, ...) the way the app really uses it: bucket reachable,
 * upload, presigned download URL, download, byte-for-byte comparison.
 *
 * Usage:   pnpm storage:check      (reads S3_* from .env or the environment)
 * In a container (no pnpm in the image):
 *          node_modules/.bin/tsx scripts/storage-check.ts
 *
 * Leaves one tiny object behind (healthcheck/storage-check.txt, overwritten
 * on every run). Never prints credentials or the URL's signature.
 */
async function main() {
  const endpoint = process.env.S3_ENDPOINT ?? 'http://localhost:9000';
  const publicEndpoint = process.env.S3_PUBLIC_ENDPOINT ?? endpoint;
  const bucket = process.env.S3_BUCKET ?? 'engage-bot';
  console.log(`bucket           : ${bucket}`);
  console.log(`S3_ENDPOINT      : ${endpoint}`);
  console.log(`S3_PUBLIC_ENDPOINT: ${publicEndpoint}`);

  const storage = new StorageService();
  // HeadBucket, creating the bucket if allowed. Failure only logs a warning
  // here; the upload below then reports the real error.
  await storage.onModuleInit();

  const body = Buffer.from(
    `engage-bot storage check ${new Date().toISOString()}\n`,
  );
  const sha = createHash('sha256').update(body).digest('hex');
  const key = 'healthcheck/storage-check.txt';

  const put = await storage.putObject(key, body, 'text/plain');
  ok('upload', `${put.size} bytes -> ${key}`);

  const url = await storage.getSignedDownloadUrl(key, 300);
  const origin = new URL(url).origin;
  ok('presigned URL', origin);
  if (origin !== new URL(publicEndpoint).origin) {
    fail('presigned URL host does not match S3_PUBLIC_ENDPOINT');
  }

  const res = await fetch(url);
  if (res.status !== 200)
    fail(`download via presigned URL returned HTTP ${res.status}`);
  const got = Buffer.from(await res.arrayBuffer());
  ok('download', `HTTP ${res.status}, ${got.length} bytes`);

  if (createHash('sha256').update(got).digest('hex') !== sha) {
    fail('downloaded bytes differ from what was uploaded');
  }
  ok('integrity', 'sha256 matches');
  console.log('\nStorage OK — devices can fetch audio from this store.');
}

function ok(step: string, detail: string) {
  console.log(`PASS  ${step.padEnd(14)} ${detail}`);
}

function fail(message: string): never {
  console.error(`FAIL  ${message}`);
  process.exit(1);
}

main().catch((err) => {
  console.error(`FAIL  ${err instanceof Error ? err.message : String(err)}`);
  console.error(
    'Hint: check S3_ENDPOINT / S3_REGION / S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY / S3_BUCKET,\n' +
      '      and that S3_PUBLIC_ENDPOINT is reachable from where devices run.',
  );
  process.exit(1);
});
