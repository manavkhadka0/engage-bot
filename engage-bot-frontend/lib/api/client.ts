import createClient from "openapi-fetch";
import { env } from "@/lib/env";
import type { paths } from "@/lib/api/schema";

/**
 * Typed OpenAPI client.
 * Regenerate types when backend publishes OpenAPI:
 *   pnpm api:gen
 *
 * Until then, `schema.ts` is a minimal stub so the app compiles.
 */
export const api = createClient<paths>({
  baseUrl: env.NEXT_PUBLIC_API_URL,
});
