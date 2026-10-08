"use client";

import { use } from "react";
import {
  useAnalyticsOverview,
  useDevices,
  useDwell,
  usePlaysSeries,
} from "@/hooks/use-api";
import { useLiveDeviceStatus } from "@/hooks/use-live-status";
import { useTenantContext } from "@/hooks/use-tenant";
import { DeviceStatusDot } from "@/components/device-status";
import { EmptyState, Kpi, Panel } from "@/components/ui/panel";
import { PlaysAreaChart, StatusBarChart } from "@/components/charts/fleet-charts";

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
  const playsSeries = usePlaysSeries(tenantId);
  useLiveDeviceStatus(tenantId);

  const deviceList = devices.data?.items ?? [];
  const o = overview.data;
  const series = playsSeries.data ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <p className="text-[var(--text-sm)] text-[var(--color-muted)]">
          {tenantSlug}
        </p>
        <h1 className="mt-1 text-[length:var(--text-2xl)] font-semibold">
          Fleet overview
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Online" value={o?.devices.online ?? "—"} />
        <Kpi label="Offline" value={o?.devices.offline ?? "—"} />
        <Kpi label="Detections" value={o?.today.detections ?? "—"} hint="today" />
        <Kpi label="Plays" value={o?.today.plays ?? "—"} hint="today" />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Panel title="Engagement today" className="lg:col-span-3">
          <PlaysAreaChart data={series} />
        </Panel>
        <Panel title="Device mix" className="lg:col-span-2">
          <StatusBarChart
            data={[
              { name: "On", value: o?.devices.online ?? 0 },
              { name: "Off", value: o?.devices.offline ?? 0 },
            ]}
          />
          <p className="mt-3 text-[var(--text-xs)] text-[var(--color-muted)]">
            Avg dwell:{" "}
            {dwell.data?.avgDwellMs
              ? `${Math.round(dwell.data.avgDwellMs / 1000)}s`
              : "—"}{" "}
            · {dwell.data?.count ?? 0} samples
          </p>
        </Panel>
      </div>

      <Panel title="Devices">
        {devices.isLoading ? (
          <p className="text-[var(--color-muted)]">Loading…</p>
        ) : deviceList.length === 0 ? (
          <EmptyState
            title="No devices assigned"
            body="Ask Baliyo to assign hardware, or open Simulate from the platform console."
          />
        ) : (
          <ul className="divide-y divide-[var(--color-rule)]">
            {deviceList.slice(0, 8).map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-3 py-3 text-[var(--text-sm)]"
              >
                <span className="font-medium">{d.serial}</span>
                <DeviceStatusDot status={d.status} />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
