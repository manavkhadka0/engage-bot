"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient, useSession } from "@/lib/auth";
import { isPlatformRole } from "@/lib/roles";

export function BrandRedirect() {
  const router = useRouter();
  const { data, isPending } = useSession();

  useEffect(() => {
    if (isPending) return;
    void (async () => {
      if (!data?.user) {
        router.replace("/login");
        return;
      }
      if (isPlatformRole(data.user.role)) {
        router.replace("/admin");
        return;
      }
      const orgs = await authClient.organization.list();
      const first = orgs.data?.[0] as { slug?: string; id?: string } | undefined;
      if (first?.id) {
        await authClient.organization.setActive({ organizationId: first.id });
      }
      if (first?.slug) {
        router.replace(`/app/${first.slug}`);
      } else {
        router.replace("/login");
      }
    })();
  }, [data, isPending, router]);

  return (
    <main className="page-gutter flex flex-1 items-center py-20">
      <p className="text-[var(--color-muted)]">Resolving workspace…</p>
    </main>
  );
}
