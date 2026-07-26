"use client";

import { use } from "react";
import { useAnalyticsOverview, useDwell } from "@/hooks/use-api";
import { useTenantContext } from "@/hooks/use-tenant";
import { Kpi, Panel } from "@/components/ui/panel";

export default function BrandAnalyticsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = use(params);
  const { tenantId } = useTenantContext(tenantSlug);
  const overview = useAnalyticsOverview(tenantId);
  const dwell = useDwell(tenantId);
  const o = overview.data;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[var(--text-sm)] text-[var(--color-muted)]">
          {tenantSlug} --analytics
        </p>
        <h1 className="mt-1 text-[length:var(--text-2xl)]">Analytics</h1>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Online" value={o?.devices.online ?? "—"} />
        <Kpi label="Offline" value={o?.devices.offline ?? "—"} />
        <Kpi label="Detections" value={o?.today.detections ?? "—"} hint="today" />
        <Kpi label="Plays" value={o?.today.plays ?? "—"} hint="today" />
      </div>

      <Panel title="dwell distribution">
        {dwell.isLoading ? (
          <p className="text-[var(--color-muted)]">Loading…</p>
        ) : (
          <div className="space-y-4">
            <p className="text-[var(--text-sm)] text-[var(--color-ink-2)]">
              avg{" "}
              <span className="text-[var(--color-accent)]">
                {dwell.data?.avgDwellMs
                  ? `${Math.round(dwell.data.avgDwellMs / 1000)}s`
                  : "—"}
              </span>{" "}
              across {dwell.data?.count ?? 0} samples
            </p>
            <ul className="max-h-64 space-y-1 overflow-y-auto font-mono text-[var(--text-xs)] text-[var(--color-muted)]">
              {(dwell.data?.samples ?? []).slice(0, 20).map((s, i) => (
                <li key={`${s.deviceId}-${s.ts}-${i}`}>
                  {new Date(s.ts).toLocaleString()} · device{" "}
                  {s.deviceId.slice(0, 8)} · {s.dwellMs ?? 0}ms
                </li>
              ))}
            </ul>
          </div>
        )}
      </Panel>
    </div>
  );
}
