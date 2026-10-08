"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCreateTenant, useTenants } from "@/hooks/use-api";
import { EmptyState, Panel } from "@/components/ui/panel";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import type {
  SubscriptionStatus,
  Tenant,
  TenantTier,
} from "@/lib/api/types";

type SortKey = "newest" | "devices" | "trial" | "az";
type SavedView = "all" | "trials_week" | "zero_devices" | "archived";

const VIEW_KEY = "engage-bot.tenants.view";
const PAGE_SIZE = 25;

function daysUntil(iso?: string | null) {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

function applyFilters(
  list: Tenant[],
  opts: {
    q: string;
    tier: TenantTier | "all";
    subStatus: SubscriptionStatus | "all";
    sort: SortKey;
    view: SavedView;
  },
) {
  let rows = [...list];

  if (opts.view === "archived") {
    rows = rows.filter((t) => t.status === "ARCHIVED");
  } else if (opts.view === "zero_devices") {
    rows = rows.filter((t) => (t._count?.devices ?? 0) === 0);
  } else if (opts.view === "trials_week") {
    rows = rows.filter((t) => {
      const d = daysUntil(t.subscription?.trialEndsAt);
      return (
        t.subscription?.status === "TRIAL" && d !== null && d >= 0 && d <= 7
      );
    });
  } else {
    rows = rows.filter((t) => t.status !== "ARCHIVED");
  }

  const q = opts.q.trim().toLowerCase();
  if (q) {
    rows = rows.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        (t.adminEmail ?? "").toLowerCase().includes(q),
    );
  }

  if (opts.tier !== "all") {
    rows = rows.filter((t) => t.tier === opts.tier);
  }
  if (opts.subStatus !== "all") {
    rows = rows.filter((t) => t.subscription?.status === opts.subStatus);
  }

  rows.sort((a, b) => {
    if (opts.sort === "az") return a.name.localeCompare(b.name);
    if (opts.sort === "devices") {
      return (b._count?.devices ?? 0) - (a._count?.devices ?? 0);
    }
    if (opts.sort === "trial") {
      const da = daysUntil(a.subscription?.trialEndsAt) ?? 9999;
      const db = daysUntil(b.subscription?.trialEndsAt) ?? 9999;
      return da - db;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return rows;
}

function StatusPill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "ok" | "warn" | "danger" | "accent";
}) {
  const tones = {
    neutral: "bg-[var(--color-paper-3)] text-[var(--color-ink-2)]",
    ok: "bg-[var(--color-online)]/15 text-[var(--color-online)]",
    warn: "bg-[var(--color-warn)]/20 text-[var(--color-ink)]",
    danger: "bg-[var(--color-danger)]/12 text-[var(--color-danger)]",
    accent: "bg-[var(--color-accent)]/12 text-[var(--color-accent)]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[var(--radius-input)] px-2 py-0.5 font-mono text-[length:var(--text-xs)] tracking-[var(--tracking-label)] uppercase",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

function SubPill({ status }: { status?: string | null }) {
  if (!status) return <span className="text-[var(--color-muted)]">—</span>;
  const tone =
    status === "ACTIVE"
      ? "ok"
      : status === "TRIAL"
        ? "accent"
        : status === "PAST_DUE" || status === "SUSPENDED"
          ? "danger"
          : "neutral";
  return <StatusPill tone={tone}>{status.replace("_", " ")}</StatusPill>;
}

export default function TenantsPage() {
  const [view, setView] = useState<SavedView>("all");
  const includeArchived = view === "archived";
  const tenants = useTenants(true, includeArchived);
  const create = useCreateTenant();

  const [open, setOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [q, setQ] = useState("");
  const [tier, setTier] = useState<TenantTier | "all">("all");
  const [subStatus, setSubStatus] = useState<SubscriptionStatus | "all">(
    "all",
  );
  const [sort, setSort] = useState<SortKey>("newest");
  const [page, setPage] = useState(0);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    tier: "GROWTH" as TenantTier,
    adminName: "",
    adminEmail: "",
    adminPassword: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    try {
      const v = localStorage.getItem(VIEW_KEY) as SavedView | null;
      if (v) setView(v);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_KEY, view);
    } catch {
      /* ignore */
    }
  }, [view]);

  useEffect(() => {
    setPage(0);
  }, [q, tier, subStatus, sort, view]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    try {
      const res = await create.mutateAsync(form);
      setOk(`Created ${res.tenant.name} — open Detail to finish setup.`);
      setForm({
        name: "",
        slug: "",
        tier: "GROWTH",
        adminName: "",
        adminEmail: "",
        adminPassword: "",
      });
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    }
  }

  const list = tenants.data ?? [];
  const filtered = useMemo(
    () =>
      applyFilters(list, {
        q,
        tier,
        subStatus,
        sort,
        view,
      }),
    [list, q, tier, subStatus, sort, view],
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  );

  const filtersActive = tier !== "all" || subStatus !== "all";

  const views: Array<{ id: SavedView; label: string }> = [
    { id: "all", label: "All" },
    { id: "zero_devices", label: "No devices" },
    { id: "trials_week", label: "Trials ≤7d" },
    { id: "archived", label: "Archived" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[length:var(--text-2xl)] font-semibold tracking-tight text-[var(--color-ink)]">
            Tenants
          </h1>
          <p className="mt-1 text-[length:var(--text-sm)] text-[var(--color-muted)]">
            {tenants.isLoading
              ? "Loading brand workspaces…"
              : `${filtered.length} shown${list.length !== filtered.length ? ` · ${list.length} loaded` : ""}`}
          </p>
        </div>
        <Button
          onClick={() => {
            setOpen((v) => !v);
            setOk(null);
            setError(null);
          }}
        >
          {open ? "Cancel create" : "Create tenant"}
        </Button>
      </div>

      {ok ? (
        <p
          role="status"
          className="rounded-[var(--radius-input)] border border-[var(--color-online)]/30 bg-[var(--color-online)]/10 px-3 py-2 text-[length:var(--text-sm)] text-[var(--color-ink)]"
        >
          {ok}
        </p>
      ) : null}

      {open ? (
        <section className="rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] p-4 shadow-[var(--shadow-layer)] md:p-5">
          <h2 className="text-[length:var(--text-lg)] font-semibold text-[var(--color-ink)]">
            Create tenant
          </h2>
          <p className="mt-1 text-[length:var(--text-sm)] text-[var(--color-muted)]">
            Provisions a brand workspace and a brand-admin login. Share the
            temp password securely.
          </p>
          <form
            onSubmit={onSubmit}
            className="mt-5 grid gap-4 sm:grid-cols-2"
          >
            <div>
              <Label htmlFor="name">Brand name</Label>
              <Input
                id="name"
                required
                autoFocus
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((f) => ({
                    ...f,
                    name,
                    slug:
                      f.slug ||
                      name
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/^-|-$/g, ""),
                  }));
                }}
              />
            </div>
            <div>
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                required
                pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                value={form.slug}
                onChange={(e) =>
                  setForm((f) => ({ ...f, slug: e.target.value }))
                }
              />
              <p className="mt-1 text-[length:var(--text-xs)] text-[var(--color-muted)]">
                Workspace URL: /app/{form.slug || "…"}
              </p>
            </div>
            <div>
              <Label htmlFor="tier">Tier</Label>
              <Select
                id="tier"
                value={form.tier}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    tier: e.target.value as TenantTier,
                  }))
                }
              >
                <option value="BASIC">Basic — 500 NPR/device</option>
                <option value="GROWTH">Growth — 800 NPR/device</option>
                <option value="BRAND">Brand — 1,200 NPR/device</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="adminName">Brand admin name</Label>
              <Input
                id="adminName"
                required
                value={form.adminName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, adminName: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="adminEmail">Brand admin email</Label>
              <Input
                id="adminEmail"
                type="email"
                required
                value={form.adminEmail}
                onChange={(e) =>
                  setForm((f) => ({ ...f, adminEmail: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="adminPassword">Temp password</Label>
              <Input
                id="adminPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={form.adminPassword}
                onChange={(e) =>
                  setForm((f) => ({ ...f, adminPassword: e.target.value }))
                }
              />
            </div>
            {error ? (
              <p
                role="alert"
                className="sm:col-span-2 text-[length:var(--text-sm)] text-[var(--color-danger)]"
              >
                {error}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? "Creating…" : "Provision brand"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      <div className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <Input
            className="lg:max-w-sm"
            placeholder="Search name, slug, or admin email…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search tenants"
          />
          <div
            className="flex flex-wrap gap-1 rounded-[var(--radius-input)] border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-1"
            role="tablist"
            aria-label="Saved views"
          >
            {views.map((v) => (
              <button
                key={v.id}
                type="button"
                role="tab"
                aria-selected={view === v.id}
                className={cn(
                  "rounded-[calc(var(--radius-input)-2px)] px-3 py-1.5 text-[length:var(--text-sm)] transition-colors",
                  view === v.id
                    ? "bg-[var(--color-paper)] font-medium text-[var(--color-accent)] shadow-[var(--shadow-layer)]"
                    : "text-[var(--color-ink-2)] hover:text-[var(--color-ink)]",
                )}
                onClick={() => setView(v.id)}
              >
                {v.label}
              </button>
            ))}
          </div>
          <div className="flex flex-1 flex-wrap items-center gap-2 lg:justify-end">
            <Select
              className="w-auto min-w-[9.5rem]"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label="Sort tenants"
            >
              <option value="newest">Newest</option>
              <option value="devices">Most devices</option>
              <option value="trial">Trial ending soon</option>
              <option value="az">Name A–Z</option>
            </Select>
            <button
              type="button"
              className={cn(
                buttonVariants({ variant: "secondary", size: "sm" }),
                filtersActive && "border-[var(--color-accent)] text-[var(--color-accent)]",
              )}
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen((v) => !v)}
            >
              {filtersOpen ? "Hide filters" : filtersActive ? "Filters · on" : "Filters"}
            </button>
          </div>
        </div>

        {filtersOpen ? (
          <div className="grid gap-3 rounded-[var(--radius-input)] border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="filter-tier">Tier</Label>
              <Select
                id="filter-tier"
                value={tier}
                onChange={(e) =>
                  setTier(e.target.value as TenantTier | "all")
                }
              >
                <option value="all">Any tier</option>
                <option value="BASIC">Basic</option>
                <option value="GROWTH">Growth</option>
                <option value="BRAND">Brand</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="filter-sub">Subscription</Label>
              <Select
                id="filter-sub"
                value={subStatus}
                onChange={(e) =>
                  setSubStatus(e.target.value as SubscriptionStatus | "all")
                }
              >
                <option value="all">Any status</option>
                <option value="TRIAL">Trial</option>
                <option value="ACTIVE">Active</option>
                <option value="PAST_DUE">Past due</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="CANCELLED">Cancelled</option>
              </Select>
            </div>
            {filtersActive ? (
              <div className="sm:col-span-2">
                <button
                  type="button"
                  className="text-[length:var(--text-sm)] text-[var(--color-accent)]"
                  onClick={() => {
                    setTier("all");
                    setSubStatus("all");
                  }}
                >
                  Clear filters
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <Panel>
        {tenants.isLoading ? (
          <ul className="space-y-3" aria-busy="true" aria-label="Loading">
            {[0, 1, 2, 3].map((i) => (
              <li
                key={i}
                className="h-14 animate-pulse rounded-[var(--radius-input)] bg-[var(--color-paper-3)]"
              />
            ))}
          </ul>
        ) : tenants.isError ? (
          <EmptyState
            title="Couldn’t load tenants"
            body="Check the API connection, then try again."
            action={
              <Button onClick={() => void tenants.refetch()}>Retry</Button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={list.length === 0 ? "No tenants yet" : "No matches"}
            body={
              list.length === 0
                ? "Create a brand workspace, then assign devices from Devices."
                : "Clear search or filters, or switch the view tab."
            }
            action={
              list.length === 0 ? (
                <Button onClick={() => setOpen(true)}>Create tenant</Button>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQ("");
                    setTier("all");
                    setSubStatus("all");
                    setView("all");
                  }}
                >
                  Reset filters
                </Button>
              )
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] text-left text-[length:var(--text-sm)]">
                <thead>
                  <tr className="border-b border-[var(--color-rule)] text-[var(--color-muted)]">
                    <th className="pb-2 pr-4 font-mono text-[length:var(--text-xs)] font-normal tracking-[var(--tracking-label)] uppercase">
                      Brand
                    </th>
                    <th className="hidden pb-2 pr-4 font-mono text-[length:var(--text-xs)] font-normal tracking-[var(--tracking-label)] uppercase md:table-cell">
                      Admin
                    </th>
                    <th className="pb-2 pr-4 font-mono text-[length:var(--text-xs)] font-normal tracking-[var(--tracking-label)] uppercase">
                      Plan
                    </th>
                    <th className="pb-2 pr-4 font-mono text-[length:var(--text-xs)] font-normal tracking-[var(--tracking-label)] uppercase">
                      Fleet
                    </th>
                    <th className="pb-2 font-mono text-[length:var(--text-xs)] font-normal tracking-[var(--tracking-label)] uppercase">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((t) => {
                    const online = t.deviceStatus?.online ?? 0;
                    const offline = t.deviceStatus?.offline ?? 0;
                    const total = t._count?.devices ?? online + offline;
                    const trialDays = daysUntil(t.subscription?.trialEndsAt);
                    return (
                      <tr
                        key={t.id}
                        className="border-b border-[var(--color-rule)]/70 last:border-0 hover:bg-[var(--color-paper-3)]/40"
                      >
                        <td className="py-3 pr-4 align-middle">
                          <Link
                            href={`/admin/tenants/${t.id}`}
                            className="font-medium text-[var(--color-ink)] hover:text-[var(--color-accent)]"
                          >
                            {t.name}
                          </Link>
                          <p className="mt-0.5 text-[length:var(--text-xs)] text-[var(--color-muted)]">
                            /{t.slug}
                            {t.status !== "ACTIVE" ? ` · ${t.status}` : ""}
                          </p>
                        </td>
                        <td className="hidden py-3 pr-4 align-middle text-[var(--color-ink-2)] md:table-cell">
                          <span className="line-clamp-1">
                            {t.adminEmail ?? "—"}
                          </span>
                        </td>
                        <td className="py-3 pr-4 align-middle">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <StatusPill tone="neutral">{t.tier}</StatusPill>
                            <SubPill status={t.subscription?.status} />
                            {t.subscription?.status === "TRIAL" &&
                            trialDays !== null ? (
                              <span className="text-[length:var(--text-xs)] text-[var(--color-muted)]">
                                {trialDays < 0
                                  ? "ended"
                                  : `${trialDays}d left`}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="py-3 pr-4 align-middle">
                          {total === 0 ? (
                            <StatusPill tone="warn">No devices</StatusPill>
                          ) : offline > 0 && online === 0 ? (
                            <StatusPill tone="danger">
                              {total} offline
                            </StatusPill>
                          ) : offline > 0 ? (
                            <span className="tabular-nums text-[var(--color-ink-2)]">
                              <span className="text-[var(--color-online)]">
                                {online}
                              </span>
                              <span className="text-[var(--color-muted)]">
                                {" "}
                                online ·{" "}
                              </span>
                              <span className="text-[var(--color-danger)]">
                                {offline}
                              </span>
                              <span className="text-[var(--color-muted)]">
                                {" "}
                                off
                              </span>
                            </span>
                          ) : (
                            <span className="tabular-nums text-[var(--color-online)]">
                              {online}/{total} online
                            </span>
                          )}
                        </td>
                        <td className="py-3 align-middle">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Link
                              href={`/admin/tenants/${t.id}`}
                              className={cn(
                                buttonVariants({
                                  variant: "secondary",
                                  size: "sm",
                                }),
                              )}
                            >
                              Detail
                            </Link>
                            {t.status !== "ARCHIVED" ? (
                              <Link
                                href={`/app/${t.slug}`}
                                className={cn(
                                  buttonVariants({
                                    variant: "ghost",
                                    size: "sm",
                                  }),
                                )}
                              >
                                Workspace
                              </Link>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filtered.length > PAGE_SIZE ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-rule)] pt-4">
                <p className="text-[length:var(--text-xs)] text-[var(--color-muted)]">
                  {safePage * PAGE_SIZE + 1}–
                  {Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} of{" "}
                  {filtered.length}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={safePage === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={safePage >= pageCount - 1}
                    onClick={() =>
                      setPage((p) => Math.min(pageCount - 1, p + 1))
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </Panel>
    </div>
  );
}
