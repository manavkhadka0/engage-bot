"use client";

import Link from "next/link";
import { useDevices, useTenants } from "@/hooks/use-api";
import { useLiveDeviceStatus } from "@/hooks/use-live-status";
import { EmptyState, Kpi, Panel } from "@/components/ui/panel";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function AdminHomePage() {
  const tenants = useTenants();
  const devices = useDevices();
  useLiveDeviceStatus();

  const tenantList = tenants.data ?? [];
  const deviceList = devices.data ?? [];
  const online = deviceList.filter((d) => d.status === "ONLINE").length;
  const offline = deviceList.filter((d) => d.status === "OFFLINE").length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[var(--text-sm)] text-[var(--color-muted)]">
            platform --overview
          </p>
          <h1 className="mt-1 text-[length:var(--text-2xl)]">Console</h1>
        </div>
        <Link
          href="/admin/tenants"
          className={cn(buttonVariants({ size: "lg" }))}
        >
          Create tenant →
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Tenants" value={tenantList.length} />
        <Kpi label="Devices" value={deviceList.length} />
        <Kpi label="Online" value={online} />
        <Kpi label="Offline" value={offline} />
      </div>

      <Panel
        title="Recent tenants"
        action={
          <Link
            href="/admin/tenants"
            className="text-[var(--text-sm)] text-[var(--color-accent)] underline"
          >
            all →
          </Link>
        }
      >
        {tenants.isLoading ? (
          <p className="text-[var(--color-muted)]">Loading…</p>
        ) : tenantList.length === 0 ? (
          <EmptyState
            title="No tenants yet"
            body="First action after login: create a brand workspace, then assign devices."
            action={
              <Link href="/admin/tenants" className={cn(buttonVariants())}>
                Create tenant
              </Link>
            }
          />
        ) : (
          <ul className="divide-y divide-[var(--color-rule)]">
            {tenantList.slice(0, 6).map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-[var(--text-sm)]"
              >
                <div>
                  <span className="text-[var(--color-ink)]">{t.name}</span>
                  <span className="ml-2 text-[var(--color-muted)]">
                    /{t.slug}
                  </span>
                </div>
                <div className="text-[var(--color-muted)]">
                  {t._count?.devices ?? 0} devices · {t.tier} · {t.status}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
