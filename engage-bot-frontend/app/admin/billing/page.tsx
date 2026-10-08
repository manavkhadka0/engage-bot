"use client";

import {
  useChangeTier,
  useConvertTrial,
  usePlatformBilling,
} from "@/hooks/use-api";
import { EmptyState, Kpi, Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import type { TenantTier } from "@/lib/api/types";
import { useState } from "react";

export default function AdminBillingPage() {
  const billing = usePlatformBilling();
  const changeTier = useChangeTier();
  const convert = useConvertTrial();
  const [msg, setMsg] = useState<string | null>(null);

  const rows = billing.data ?? [];
  const trial = rows.filter((r) => r.subscription?.status === "TRIAL").length;
  const paid = rows.filter((r) => r.subscription?.status === "ACTIVE").length;
  const mrr = rows.reduce((sum, r) => sum + (r.monthlyEstimateNpr || 0), 0);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[var(--text-sm)] text-[var(--color-muted)]">
          billing --subscriptions
        </p>
        <h1 className="mt-1 text-[length:var(--text-2xl)]">Subscriptions</h1>
        <p className="mt-2 max-w-[60ch] text-[var(--text-sm)] text-[var(--color-muted)]">
          6-month trial bundled with hardware, then per-device monthly —
          Basic 500 · Growth 800 · Brand 1,200 NPR.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label="On trial" value={trial} />
        <Kpi label="Paid active" value={paid} />
        <Kpi label="Est. MRR (NPR)" value={mrr.toLocaleString()} />
      </div>

      {msg ? <p className="text-[var(--color-accent)]">{msg}</p> : null}

      <Panel title="tenant subscriptions">
        {billing.isLoading ? (
          <p className="text-[var(--color-muted)]">Loading…</p>
        ) : rows.length === 0 ? (
          <EmptyState
            title="No tenants yet"
            body="Create a tenant to start a 6-month trial subscription."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-left text-[var(--text-sm)]">
              <thead className="text-[var(--color-muted)]">
                <tr className="border-b border-[var(--color-rule)]">
                  <th className="py-2 pr-3 font-normal">Brand</th>
                  <th className="py-2 pr-3 font-normal">Tier</th>
                  <th className="py-2 pr-3 font-normal">Status</th>
                  <th className="py-2 pr-3 font-normal">Devices</th>
                  <th className="py-2 pr-3 font-normal">NPR / mo</th>
                  <th className="py-2 pr-3 font-normal">Trial ends</th>
                  <th className="py-2 font-normal">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.tenantId}
                    className="border-b border-[var(--color-rule)]/60"
                  >
                    <td className="py-3 pr-3">
                      {r.name}
                      <span className="ml-2 text-[var(--color-muted)]">
                        /{r.slug}
                      </span>
                    </td>
                    <td className="py-3 pr-3">
                      <Select
                        className="h-8 w-auto"
                        value={r.tier}
                        onChange={(e) => {
                          void changeTier
                            .mutateAsync({
                              tenantId: r.tenantId,
                              tier: e.target.value as TenantTier,
                            })
                            .then(() => setMsg(`Tier updated for ${r.name}`));
                        }}
                      >
                        <option value="BASIC">BASIC</option>
                        <option value="GROWTH">GROWTH</option>
                        <option value="BRAND">BRAND</option>
                      </Select>
                    </td>
                    <td className="py-3 pr-3 text-[var(--color-accent)]">
                      {r.subscription?.status ?? "—"}
                    </td>
                    <td className="py-3 pr-3 tabular-nums">{r.devices}</td>
                    <td className="py-3 pr-3 tabular-nums">
                      {r.monthlyEstimateNpr.toLocaleString()}
                    </td>
                    <td className="py-3 pr-3 text-[var(--color-muted)]">
                      {r.subscription?.trialEndsAt
                        ? new Date(
                            r.subscription.trialEndsAt,
                          ).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="py-3">
                      {r.subscription?.status === "TRIAL" ? (
                        <Button
                          size="xs"
                          onClick={() =>
                            void convert
                              .mutateAsync({
                                tenantId: r.tenantId,
                                tier: r.tier,
                              })
                              .then(() =>
                                setMsg(`Converted ${r.name} to paid`),
                              )
                          }
                        >
                          Convert → paid
                        </Button>
                      ) : (
                        <span className="text-[var(--color-muted)]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="feature matrix">
        <dl className="divide-y divide-[var(--color-rule)] text-[var(--text-sm)]">
          <div className="grid gap-2 py-3 md:grid-cols-[8rem_1fr]">
            <dt className="text-[var(--color-accent)]">BASIC</dt>
            <dd className="text-[var(--color-ink-2)]">
              Device health · 1 remote clip · plays + uptime · email support
            </dd>
          </div>
          <div className="grid gap-2 py-3 md:grid-cols-[8rem_1fr]">
            <dt className="text-[var(--color-accent)]">GROWTH</dt>
            <dd className="text-[var(--color-ink-2)]">
              Multi-clip campaigns · dwell analytics · per-store · monthly
              report · priority support
            </dd>
          </div>
          <div className="grid gap-2 py-3 md:grid-cols-[8rem_1fr]">
            <dt className="text-[var(--color-accent)]">BRAND</dt>
            <dd className="text-[var(--color-ink-2)]">
              Adaptive audio · API access · white-label · dedicated onboarding
            </dd>
          </div>
        </dl>
      </Panel>
    </div>
  );
}
