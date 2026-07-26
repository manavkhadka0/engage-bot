"use client";

import { use } from "react";
import {
  useAnalyticsOverview,
  useDevices,
  useDwell,
} from "@/hooks/use-api";
import { useLiveDeviceStatus } from "@/hooks/use-live-status";
import { useTenantContext } from "@/hooks/use-tenant";
import { DeviceStatusDot } from "@/components/device-status";
import { EmptyState, Kpi, Panel } from "@/components/ui/panel";

export default function BrandOverviewPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = use(params);
  const { tenantId } = useTenantContext(tenantSlug);
  const overview = useAnalyticsOverview(tenantId);
  const dwell = useDwell(tenantId);
  const devices = useDevices(tenantId);
  useLiveDeviceStatus(tenantId);

  const deviceList = devices.data ?? [];
  const o = overview.data;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[var(--text-sm)] text-[var(--color-muted)]">
          {tenantSlug} --overview
        </p>
        <h1 className="mt-1 text-[length:var(--text-2xl)]">Fleet overview</h1>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Online" value={o?.devices.online ?? "—"} />
        <Kpi label="Offline" value={o?.devices.offline ?? "—"} />
        <Kpi label="Detections today" value={o?.today.detections ?? "—"} />
        <Kpi label="Plays today" value={o?.today.plays ?? "—"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="dwell">
          {dwell.isLoading ? (
            <p className="text-[var(--color-muted)]">Loading…</p>
          ) : (
            <div className="space-y-2 text-[var(--text-sm)]">
              <p>
                <span className="text-[var(--color-muted)]">samples</span>{" "}
                <span className="text-[var(--color-accent)]">
                  {dwell.data?.count ?? 0}
                </span>
              </p>
              <p>
                <span className="text-[var(--color-muted)]">avg dwell</span>{" "}
                <span className="text-[var(--color-accent)]">
                  {dwell.data?.avgDwellMs
                    ? `${Math.round(dwell.data.avgDwellMs / 1000)}s`
                    : "—"}
                </span>
              </p>
            </div>
          )}
        </Panel>

        <Panel title="devices">
          {devices.isLoading ? (
            <p className="text-[var(--color-muted)]">Loading…</p>
          ) : deviceList.length === 0 ? (
            <EmptyState
              title="No devices assigned"
              body="Ask Baliyo platform to assign hardware to this brand."
            />
          ) : (
            <ul className="divide-y divide-[var(--color-rule)]">
              {deviceList.slice(0, 8).map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between gap-3 py-2.5 text-[var(--text-sm)]"
                >
                  <span>{d.serial}</span>
                  <DeviceStatusDot status={d.status} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
