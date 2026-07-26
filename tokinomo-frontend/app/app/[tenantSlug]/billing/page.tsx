"use client";

import { use } from "react";
import { useBillingOverview } from "@/hooks/use-api";
import { useTenantContext } from "@/hooks/use-tenant";
import { EmptyState, Kpi, Panel } from "@/components/ui/panel";

export default function BrandBillingPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = use(params);
  const { tenantId } = useTenantContext(tenantSlug);
  const billing = useBillingOverview(tenantId);
  const data = billing.data;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[var(--text-sm)] text-[var(--color-muted)]">
          {tenantSlug} --billing
        </p>
        <h1 className="mt-1 text-[length:var(--text-2xl)]">Subscription</h1>
      </div>

      {!tenantId || billing.isLoading ? (
        <p className="text-[var(--color-muted)]">Loading…</p>
      ) : !data ? (
        <EmptyState title="No subscription" body="Ask Baliyo to provision this workspace." />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="Tier" value={data.tenant.tier} />
            <Kpi label="Status" value={data.subscription.status} />
            <Kpi label="Devices" value={data.usage.devices} />
            <Kpi
              label="Est. NPR / mo"
              value={data.monthlyEstimateNpr.toLocaleString()}
              hint={
                data.subscription.status === "TRIAL"
                  ? "Trial — currently 0"
                  : undefined
              }
            />
          </div>

          <Panel title="plan">
            <div className="space-y-2 text-[var(--text-sm)] text-[var(--color-ink-2)]">
              <p>
                Price:{" "}
                <span className="text-[var(--color-accent)]">
                  {data.subscription.pricePerDeviceNpr} NPR
                </span>{" "}
                / device / month
              </p>
              <p>
                Trial ends:{" "}
                {new Date(data.subscription.trialEndsAt).toLocaleDateString()}
              </p>
              <p>
                Audio clips: {data.usage.audioClips}
                {Number.isFinite(data.usage.maxAudioClips)
                  ? ` / ${data.usage.maxAudioClips}`
                  : " (unlimited)"}
              </p>
              {data.subscription.notes ? (
                <p className="text-[var(--color-muted)]">
                  {data.subscription.notes}
                </p>
              ) : null}
            </div>
          </Panel>

          <Panel title="included features">
            <ul className="grid gap-2 sm:grid-cols-2">
              {data.features.map((f) => (
                <li
                  key={f}
                  className="border border-[var(--color-rule)] px-3 py-2 text-[var(--text-sm)] text-[var(--color-ink-2)]"
                >
                  <span className="text-[var(--color-accent)]">✓</span> {f}
                </li>
              ))}
            </ul>
          </Panel>
        </>
      )}
    </div>
  );
}
