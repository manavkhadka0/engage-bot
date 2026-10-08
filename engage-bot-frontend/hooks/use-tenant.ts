"use client";

import { useEffect, useMemo } from "react";
import { authClient, useSession } from "@/lib/auth";
import { useTenants } from "@/hooks/use-api";
import { isPlatformRole } from "@/lib/roles";

/**
 * Resolves tenantId for API calls from path slug.
 * Brand: active org id (org id === tenant id).
 * Platform: lookup tenant by slug, use as x-tenant-id.
 */
export function useTenantContext(tenantSlug: string) {
  const { data: session, isPending } = useSession();
  const role = session?.user?.role;
  const platform = isPlatformRole(role);
  const tenants = useTenants(platform);

  const tenantId = useMemo(() => {
    if (platform) {
      return tenants.data?.find((t) => t.slug === tenantSlug)?.id ?? null;
    }
    return session?.session?.activeOrganizationId ?? null;
  }, [
    platform,
    tenants.data,
    tenantSlug,
    session?.session?.activeOrganizationId,
  ]);

  useEffect(() => {
    if (platform || !session?.user) return;
    void (async () => {
      const orgs = await authClient.organization.list();
      const match = orgs.data?.find(
        (o: { slug?: string }) => o.slug === tenantSlug,
      ) as { id?: string } | undefined;
      if (match?.id) {
        await authClient.organization.setActive({ organizationId: match.id });
      }
    })();
  }, [platform, session?.user, tenantSlug]);

  return {
    tenantId,
    isPlatform: platform,
    sessionPending: isPending,
    tenantsLoading: platform && tenants.isLoading,
  };
}

export function useBrandRole() {
  const { data } = useSession();
  return {
    isPlatform: isPlatformRole(data?.user?.role),
    email: data?.user?.email,
  };
}
