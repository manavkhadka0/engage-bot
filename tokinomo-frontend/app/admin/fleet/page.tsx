"use client";

import { useMemo, useState } from "react";
import { useDevices, useTenants } from "@/hooks/use-api";
import { useLiveDeviceStatus } from "@/hooks/use-live-status";
import { DeviceStatusDot } from "@/components/device-status";
import { EmptyState, Kpi, Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/field";

export default function FleetPage() {
  const devices = useDevices();
  const tenants = useTenants();
  useLiveDeviceStatus();
  const [filter, setFilter] = useState("all");

  const list = useMemo(() => {
    const all = devices.data ?? [];
    if (filter === "all") return all;
    return all.filter((d) => d.tenantId === filter);
  }, [devices.data, filter]);

  const online = list.filter((d) => d.status === "ONLINE").length;
  const offline = list.filter((d) => d.status === "OFFLINE").length;
  const err = list.filter((d) => d.status === "ERROR").length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[var(--text-sm)] text-[var(--color-muted)]">
            fleet --global
          </p>
          <h1 className="mt-1 text-[length:var(--text-2xl)]">Fleet health</h1>
        </div>
        <Select
          className="max-w-xs"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Filter by tenant"
        >
          <option value="all">All tenants</option>
          {(tenants.data ?? []).map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label="Online" value={online} />
        <Kpi label="Offline" value={offline} />
        <Kpi label="Error" value={err} />
      </div>

      <Panel title="device grid">
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
                <p className="mt-2 text-[var(--text-xs)] text-[var(--color-muted)]">
                  {d.tenant?.name ?? "Unassigned"}
                  {d.location?.name ? ` · ${d.location.name}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
