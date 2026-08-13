"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useDevices, useTenants } from "@/hooks/use-api";
import { useLiveDeviceStatus } from "@/hooks/use-live-status";
import { DeviceStatusDot } from "@/components/device-status";
import { EmptyState, Kpi, Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/field";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Leaflet touches window/document on mount — never render it during SSR.
const FleetMap = dynamic(
  () => import("@/components/map/fleet-map").then((m) => m.FleetMap),
  { ssr: false, loading: () => <p className="text-[var(--color-muted)]">Loading map…</p> },
);

const PAGE_SIZE = 100;

export default function FleetPage() {
  const [offset, setOffset] = useState(0);
  const devices = useDevices(null, { limit: PAGE_SIZE, offset });
  const tenants = useTenants();
  useLiveDeviceStatus();
  const [filter, setFilter] = useState("all");

  const page = devices.data;
  const list = useMemo(() => {
    const all = page?.items ?? [];
    if (filter === "all") return all;
    return all.filter((d) => d.tenantId === filter);
  }, [page?.items, filter]);

  const online = list.filter((d) => d.status === "ONLINE").length;
  const offline = list.filter((d) => d.status === "OFFLINE").length;
  const err = list.filter((d) => d.status === "ERROR").length;
  const total = page?.total ?? 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[length:var(--text-2xl)] font-semibold">
            Fleet health
          </h1>
          <p className="mt-1 text-[length:var(--text-sm)] text-[var(--color-muted)]">
            Paginated device grid · {total} total
            {page?.hasMore
              ? ` · showing ${offset + 1}–${offset + page.items.length}`
              : ""}
          </p>
        </div>
        <Select
          className="max-w-xs"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setOffset(0);
          }}
          aria-label="Filter by tenant"
        >
          <option value="all">All tenants (this page)</option>
          {(tenants.data ?? []).map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label="Online (page)" value={online} />
        <Kpi label="Offline (page)" value={offline} />
        <Kpi label="Error (page)" value={err} />
      </div>

      <Panel title="Fleet map">
        <FleetMap
          devices={list}
          showTenant
          linkBase={(d) => (d.tenantId ? `/admin/tenants/${d.tenantId}` : null)}
        />
      </Panel>

      <Panel title="Device grid">
        {devices.isLoading ? (
          <p className="text-[var(--color-muted)]">Loading…</p>
        ) : list.length === 0 ? (
          <EmptyState
            title="Fleet empty"
            body="Provision and assign devices to see live status across tenants."
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((d) => (
              <li
                key={d.id}
                className="border border-[var(--color-rule)] bg-[var(--color-paper)] p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-[var(--color-ink)]">
                    {d.serial}
                  </span>
                  <DeviceStatusDot status={d.status} />
                </div>
                <p className="mt-2 text-[length:var(--text-xs)] text-[var(--color-muted)]">
                  {d.tenant?.name ?? "Unassigned"}
                  {d.location?.name ? ` · ${d.location.name}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
        {page && (page.offset > 0 || page.hasMore) ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              className={cn(
                buttonVariants({ variant: "secondary", size: "sm" }),
              )}
              disabled={offset === 0 || devices.isFetching}
              onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
            >
              Previous
            </button>
            <button
              type="button"
              className={cn(
                buttonVariants({ variant: "secondary", size: "sm" }),
              )}
              disabled={!page.hasMore || devices.isFetching}
              onClick={() => setOffset((o) => o + PAGE_SIZE)}
            >
              Next
            </button>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
