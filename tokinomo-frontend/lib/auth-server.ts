import { headers } from "next/headers";
import { env } from "@/lib/env";
import type { AppSession } from "@/lib/roles";

export async function getServerSession(): Promise<AppSession | null> {
  const h = await headers();
  const cookie = h.get("cookie") ?? "";

  const res = await fetch(`${env.NEXT_PUBLIC_APP_URL}/api/auth/get-session`, {
    headers: { cookie },
    cache: "no-store",
  });

  if (!res.ok) return null;
  const data = (await res.json()) as AppSession | null;
  if (!data?.user) return null;
  return data;
}
