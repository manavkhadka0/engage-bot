"use client";

import Link from "next/link";
import { useOpsOverview } from "@/hooks/use-api";
import { useLiveDeviceStatus } from "@/hooks/use-live-status";
import type { OpsAttentionItem } from "@/lib/api/types";
import { EmptyState, Panel } from "@/components/ui/panel";
import {
  StatusBarChart,
  TenantAttentionChart,
} from "@/components/charts/fleet-charts";
import { DeviceStatusDot } from "@/components/device-status";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function severityClass(severity: OpsAttentionItem["severity"]) {
  if (severity === "critical") return "text-[var(--color-danger)]";
  if (severity === "warn") return "text-[var(--color-warn)]";
  return "text-[var(--color-layer-navy)]";
}

function severityLabel(severity: OpsAttentionItem["severity"]) {
  if (severity === "critical") return "Critical";
  if (severity === "warn") return "Watch";
  return "Next";
}

export default function AdminHomePage() {
  const overview = useOpsOverview();
  useLiveDeviceStatus();

  const data = overview.data;
  const loading = overview.isLoading;
  const errored = overview.isError;
  const totals = data?.totals;
  const attention = data?.attention ?? [];
  const attentionCount = totals?.attentionCount ?? 0;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[length:var(--text-2xl)] font-semibold tracking-tight text-[var(--color-ink)]">
            Ops desk
          </h1>
          <p className="mt-1 max-w-xl text-[length:var(--text-sm)] text-[var(--color-muted)]">
            Server aggregates across the fleet — capped queues, not full device
            dumps. Jump to the fix.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/fleet"
            className={cn(buttonVariants({ variant: "secondary", size: "lg" }))}
          >
            Open fleet
          </Link>
          <Link
            href="/admin/tenants"
            className={cn(buttonVariants({ size: "lg" }))}
          >
            Create tenant
          </Link>
        </div>
      </div>

      {errored ? (
        <Panel>
          <EmptyState
            title="Couldn’t load ops data"
            body="Check that you’re signed in as a platform user and the API is reachable, then refresh."
            action={
              <button
                type="button"
                className={cn(buttonVariants())}
                onClick={() => void overview.refetch()}
              >
                Retry
              </button>
            }
          />
        </Panel>
      ) : null}

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Needs attention"
          value={loading ? "…" : attentionCount}
          tone={attentionCount > 0 ? "danger" : "ok"}
        />
        <Stat
          label="Online"
          value={loading ? "…" : (totals?.online ?? 0)}
          tone="ok"
        />
        <Stat
          label="Offline"
          value={loading ? "…" : (totals?.offline ?? 0)}
          tone={(totals?.offline ?? 0) > 0 ? "warn" : "neutral"}
        />
        <Stat
          label="Online rate"
          value={
            loading
              ? "…"
              : totals?.onlineRate == null
                ? "—"
                : `${totals.onlineRate}%`
          }
          tone="neutral"
        />
      </div>

      <Panel
        title="Needs attention"
        action={
          <Link
            href="/admin/fleet"
            className="text-[length:var(--text-sm)] font-medium text-[var(--color-accent)]"
          >
            Fleet map
          </Link>
        }
      >
        {loading ? (
          <ul className="space-y-3" aria-busy="true" aria-label="Loading">
            {[0, 1, 2].map((i) => (
              <li
                key={i}
                className="h-12 animate-pulse rounded-[var(--radius-input)] bg-[var(--color-paper-3)]"
              />
            ))}
          </ul>
        ) : attention.length === 0 ? (
          (totals?.tenants ?? 0) === 0 && (totals?.devices ?? 0) === 0 ? (
            <EmptyState
              title="Nothing to triage yet"
              body="Create a tenant and provision devices to populate the ops queue."
              action={
                <Link href="/admin/tenants" className={cn(buttonVariants())}>
                  Create tenant
                </Link>
              }
            />
          ) : (
            <EmptyState
              title="Fleet looks clear"
              body="No errors, offline devices, suspended tenants, or empty workspaces in the live aggregates."
              action={
                <Link href="/admin/fleet" className={cn(buttonVariants())}>
                  Review fleet
                </Link>
              }
            />
          )
        ) : (
          <>
            <ul className="divide-y divide-[var(--color-rule)]">
              {attention.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="flex flex-wrap items-center justify-between gap-2 py-3 transition-colors hover:bg-[var(--color-paper-3)]/50"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "font-mono text-[length:var(--text-xs)] tracking-[var(--tracking-label)] uppercase",
                            severityClass(item.severity),
                          )}
                        >
                          {severityLabel(item.severity)}
                        </span>
                        <span className="font-medium text-[var(--color-ink)]">
                          {item.title}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[length:var(--text-sm)] text-[var(--color-muted)]">
                        {item.detail}
                      </p>
                    </div>
                    <span className="shrink-0 text-[length:var(--text-sm)] text-[var(--color-accent)]">
                      Open →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {data?.attentionTruncated ? (
              <p className="mt-3 text-[length:var(--text-xs)] text-[var(--color-muted)]">
                Showing top {attention.length} of {attentionCount} issues · open
                Fleet or Devices for the rest.
              </p>
            ) : null}
          </>
        )}
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Fleet status mix">
          {loading ? (
            <div className="h-48 animate-pulse rounded-[var(--radius-input)] bg-[var(--color-paper-3)]" />
          ) : !data?.statusMix.length ? (
            <p className="py-8 text-center text-[length:var(--text-sm)] text-[var(--color-muted)]">
              No devices yet — status mix appears after provisioning.
            </p>
          ) : (
            <StatusBarChart data={data.statusMix} />
          )}
        </Panel>
        <Panel
          title="Offline by tenant"
          action={
            <span className="text-[length:var(--text-xs)] text-[var(--color-muted)]">
              Top {data?.offlineByTenant.length ?? 0} · live
            </span>
          }
        >
          {loading ? (
            <div className="h-52 animate-pulse rounded-[var(--radius-input)] bg-[var(--color-paper-3)]" />
          ) : (
            <TenantAttentionChart data={data?.offlineByTenant ?? []} />
          )}
        </Panel>
      </div>

      <Panel
        title="Recent tenants"
        action={
          <Link
            href="/admin/tenants"
            className="text-[length:var(--text-sm)] font-medium text-[var(--color-accent)]"
          >
            All
          </Link>
        }
      >
        {loading ? (
          <p className="text-[length:var(--text-sm)] text-[var(--color-muted)]">
            Loading…
          </p>
        ) : !data?.recentTenants.length ? (
          <EmptyState
            title="No tenants yet"
            body="Create a brand workspace, then assign devices."
            action={
              <Link href="/admin/tenants" className={cn(buttonVariants())}>
                Create tenant
              </Link>
            }
          />
        ) : (
          <ul className="divide-y divide-[var(--color-rule)]">
            {data.recentTenants.map((t) => {
              const on = t.deviceStatus.online;
              const off = t.deviceStatus.offline;
              return (
                <li key={t.id}>
                  <Link
                    href={`/admin/tenants/${t.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 py-3 text-[length:var(--text-sm)] transition-colors hover:bg-[var(--color-paper-3)]/50"
                  >
                    <div>
                      <span className="font-medium text-[var(--color-ink)]">
                        {t.name}
                      </span>
                      <span className="ml-2 text-[var(--color-muted)]">
                        /{t.slug}
                      </span>
                    </div>
                    <span className="flex items-center gap-3 text-[var(--color-muted)]">
                      <span>
                        {on} online · {off} offline · {t.tier}
                      </span>
                      {off > 0 ? (
                        <DeviceStatusDot status="OFFLINE" />
                      ) : on > 0 ? (
                        <DeviceStatusDot status="ONLINE" />
                      ) : null}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  className,
}: {
  label: string;
  value: string | number;
  tone: "ok" | "warn" | "danger" | "neutral";
  className?: string;
}) {
  const valueColor =
    tone === "danger"
      ? "text-[var(--color-danger)]"
      : tone === "warn"
        ? "text-[var(--color-warn)]"
        : tone === "ok"
          ? "text-[var(--color-online)]"
          : "text-[var(--color-ink)]";

  return (
    <div
      className={cn(
        "min-w-0 rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper-2)] px-4 py-3 shadow-[var(--shadow-layer)]",
        className,
      )}
    >
      <div className="font-mono text-[length:var(--text-xs)] tracking-[var(--tracking-label)] text-[var(--color-muted)] uppercase">
        {label}
      </div>
      <div
        className={cn(
          "mt-1.5 text-[length:var(--text-xl)] font-semibold tabular-nums leading-none",
          valueColor,
        )}
      >
        {value}
      </div>
    </div>
  );
}
