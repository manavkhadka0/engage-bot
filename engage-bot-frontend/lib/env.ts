import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().catch("http://localhost:3001"),
  /** Direct backend origin (used by Next rewrites). Browser calls go via /api/be + /api/auth. */
  NEXT_PUBLIC_API_URL: z.string().url().catch("http://localhost:3000"),
});

export type PublicEnv = z.infer<typeof envSchema>;

export const env: PublicEnv = envSchema.parse({
  NEXT_PUBLIC_APP_URL:
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001",
  NEXT_PUBLIC_API_URL:
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000",
});

/** Same-origin browser base — cookies stay on the frontend host. */
export function browserApiBase(): string {
  if (typeof window !== "undefined") return "";
  return env.NEXT_PUBLIC_APP_URL;
}
