"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import {
  useArchiveTenant,
  useAssignDevice,
  useBillingCatalog,
  useChangeTier,
  useConvertTrial,
  useInviteUser,
  usePlaysSeries,
  useProvisionDevice,
  useRenameTenantSlug,
  useSetSubscriptionStatus,
  useSimulateFleet,
  useTenant,
  useTransferAdmin,
  useUpdateTenant,
  useWipeTelemetry,
} from "@/hooks/use-api";
import { Kpi, Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { PlaysAreaChart } from "@/components/charts/fleet-charts";
import { cn } from "@/lib/utils";
import type { TenantTier } from "@/lib/api/types";

const TIER_PRICE: Record<TenantTier, number> = {
  BASIC: 500,
  GROWTH: 800,
  BRAND: 1200,
};

const TIER_LIMITS: Record<TenantTier, string> = {
  BASIC: "1 clip · health · plays/uptime",
  GROWTH: "Multi-clip · dwell · per-store",
  BRAND: "White-label · API · priority support",
};

export default function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const detail = useTenant(id);
  const update = useUpdateTenant(id);
  const rename = useRenameTenantSlug(id);
  const archive = useArchiveTenant(id);
  const wipe = useWipeTelemetry(id);
  const simulateFleet = useSimulateFleet(id);
  const transfer = useTransferAdmin(id);
  const changeTier = useChangeTier();
  const setSubStatus = useSetSubscriptionStatus();
  const convert = useConvertTrial();
  const provision = useProvisionDevice();
  const assign = useAssignDevice();
  const invite = useInviteUser(id);
  const catalog = useBillingCatalog();
  const playsSeries = usePlaysSeries(id);

  const t = detail.data;

  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState("");
  const [logo, setLogo] = useState("");
  const [domain, setDomain] = useState("");
  const [notes, setNotes] = useState("");
  const [auditNote, setAuditNote] = useState("");

  const [slugOpen, setSlugOpen] = useState(false);
  const [newSlug, setNewSlug] = useState("");
  const [slugNote, setSlugNote] = useState("");

  const [tierOpen, setTierOpen] = useState(false);
  const [nextTier, setNextTier] = useState<TenantTier>("GROWTH");
  const [tierNote, setTierNote] = useState("");

  const [serial, setSerial] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [transferEmail, setTransferEmail] = useState("");
  const [dangerNote, setDangerNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!t) return;
    setName(t.name);
    setLogo(t.brandLogoUrl ?? "");
    setDomain(t.brandDomain ?? "");
    setNotes(t.notes ?? "");
    setNewSlug(t.slug);
    setNextTier(t.tier);
  }, [t]);

  async function flash(fn: () => Promise<unknown>, ok = "Saved") {
    setErr(null);
    setMsg(null);
    try {
      await fn();
      setMsg(ok);
      setAuditNote("");
      setTierNote("");
      setSlugNote("");
      void detail.refetch();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Action failed");
    }
  }

  function copyWorkspace() {
    if (!t) return;
    const url = `${window.location.origin}/app/${t.slug}`;
    void navigator.clipboard.writeText(url);
    setMsg("Workspace URL copied");
  }

  if (detail.isLoading) {
    return <p className="text-[var(--color-muted)]">Loading tenant…</p>;
  }
  if (!t) {
    return (
      <div className="space-y-4">
        <p className="text-[var(--color-danger)]">Tenant not found</p>
        <Link href="/admin/tenants" className="underline">
          ← Tenants
        </Link>
      </div>
    );
  }

  const series = playsSeries.data ?? [];

  return (
    <div className="relative mx-auto max-w-6xl space-y-6 pb-28">
      {/* 9 breadcrumb */}
      <nav className="text-[var(--text-sm)] text-[var(--color-muted)]">
        <Link href="/admin/tenants" className="hover:text-[var(--color-accent)]">
          Tenants
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[var(--color-ink)]">{t.name}</span>
      </nav>

      {(msg || err) && (
        <p
          className={cn(
            "rounded-xl border px-3 py-2 text-[var(--text-sm)]",
            err
              ? "border-[var(--color-danger)] text-[var(--color-danger)]"
              : "border-[var(--color-rule)] text-[var(--color-accent)]",
          )}
        >
          {err ?? msg}
        </p>
      )}

      {/* 6 hero + 7 health + 24 risks */}
      <header className="rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-3)]">
              {t.brandLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={t.brandLogoUrl}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <span className="text-lg font-semibold text-[var(--color-accent)]">
                  {t.name.slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-[length:var(--text-2xl)] font-semibold">
                {t.name}
              </h1>
              <p className="mt-1 text-[var(--text-sm)] text-[var(--color-ink-2)]">
                /{t.slug} · {t.tier} · {t.status}
                {t.subscription ? ` · sub ${t.subscription.status}` : ""}
              </p>
              {/* 7 one-line health */}
              <p className="mt-2 text-[var(--text-sm)] text-[var(--color-muted)]">
                {t.health.online} online · {t.health.offline} offline
                {t.trialDaysLeft !== null
                  ? ` · trial ${t.trialDaysLeft}d left`
                  : ""}
                {t.adminEmail ? ` · ${t.adminEmail}` : ""}
              </p>
            </div>
          </div>
        </div>

        {t.risks.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {t.risks.map((r) => (
              <span
                key={r.code}
                className={cn(
                  "rounded-[var(--radius-pill)] border px-2.5 py-1 text-[var(--text-xs)]",
                  r.severity === "critical" &&
                    "border-[var(--color-danger)] text-[var(--color-danger)]",
                  r.severity === "warn" &&
                    "border-[var(--color-warn)] text-[var(--color-warn)]",
                  r.severity === "info" &&
                    "border-[var(--color-rule-2)] text-[var(--color-ink-2)]",
                )}
              >
                {r.label}
              </span>
            ))}
          </div>
        ) : null}
      </header>

      {/* 20 KPIs + chart */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Online" value={t.health.online} />
        <Kpi label="Devices" value={t.health.deviceTotal} />
        <Kpi label="Detections" value={t.analytics.today.detections} hint="today" />
        <Kpi label="Plays" value={t.analytics.today.plays} hint="today" />
      </div>
      <Panel title="Plays & detections">
        <PlaysAreaChart data={series} />
      </Panel>

      {/* 11 inline edit */}
      <Panel
        title="Profile"
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditOpen((v) => !v)}
          >
            {editOpen ? "Close" : "Edit"}
          </Button>
        }
      >
        {editOpen ? (
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              void flash(
                () =>
                  update.mutateAsync({
                    name,
                    brandLogoUrl: logo || null,
                    brandDomain: domain || null,
                    notes: notes || null,
                    auditNote: auditNote || undefined,
                  }),
                "Profile saved",
              ).then(() => setEditOpen(false));
            }}
          >
            <div>
              <Label htmlFor="tname">Name</Label>
              <Input
                id="tname"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="logo">Logo URL</Label>
              <Input
                id="logo"
                value={logo}
                onChange={(e) => setLogo(e.target.value)}
                placeholder="https://…"
              />
            </div>
            <div>
              <Label htmlFor="domain">Brand domain</Label>
              <Input
                id="domain"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="notes">CRM notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="audit">Audit note (optional)</Label>
              <Input
                id="audit"
                value={auditNote}
                onChange={(e) => setAuditNote(e.target.value)}
                placeholder="Why this change?"
              />
            </div>
            <Button type="submit" disabled={update.isPending}>
              Save profile
            </Button>
          </form>
        ) : (
          <div className="space-y-2 text-[var(--text-sm)] text-[var(--color-ink-2)]">
            <p>
              <span className="text-[var(--color-muted)]">Notes:</span>{" "}
              {t.notes || "—"}
            </p>
            <p>
              <span className="text-[var(--color-muted)]">Domain:</span>{" "}
              {t.brandDomain || "—"}
            </p>
          </div>
        )}
      </Panel>

      {/* 12 tier + 13 status/convert + 14 slug */}
      <Panel title="Billing & access">
        <div className="space-y-4 text-[var(--text-sm)]">
          <p className="text-[var(--color-ink-2)]">
            {t.subscription?.status ?? "—"} ·{" "}
            {t.subscription?.pricePerDeviceNpr ?? TIER_PRICE[t.tier]} NPR/device
            {t.subscription?.trialEndsAt
              ? ` · trial ends ${new Date(t.subscription.trialEndsAt).toLocaleDateString()}`
              : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setTierOpen((v) => !v)}
            >
              Change tier
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                void flash(
                  () =>
                    update.mutateAsync({
                      status: t.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED",
                      auditNote:
                        t.status === "SUSPENDED"
                          ? "Reactivated tenant"
                          : "Paused tenant",
                    }),
                  t.status === "SUSPENDED" ? "Reactivated" : "Paused",
                )
              }
            >
              {t.status === "SUSPENDED" ? "Reactivate" : "Pause tenant"}
            </Button>
            {t.subscription?.status === "TRIAL" ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  void flash(
                    () => convert.mutateAsync({ tenantId: id }),
                    "Converted to paid",
                  )
                }
              >
                Convert trial → paid
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                void flash(
                  () =>
                    setSubStatus.mutateAsync({
                      tenantId: id,
                      status:
                        t.subscription?.status === "SUSPENDED"
                          ? "ACTIVE"
                          : "SUSPENDED",
                    }),
                  "Subscription status updated",
                )
              }
            >
              {t.subscription?.status === "SUSPENDED"
                ? "Unsuspend sub"
                : "Suspend sub"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSlugOpen((v) => !v)}
            >
              Rename slug
            </Button>
          </div>

          {tierOpen ? (
            <div className="rounded-xl border border-[var(--color-rule)] p-4 space-y-3">
              <Label htmlFor="nextTier">New tier</Label>
              <Select
                id="nextTier"
                value={nextTier}
                onChange={(e) => setNextTier(e.target.value as TenantTier)}
              >
                {(catalog.data ?? Object.keys(TIER_PRICE)).map((item) => {
                  const tier =
                    typeof item === "string"
                      ? (item as TenantTier)
                      : item.tier;
                  const price =
                    typeof item === "string"
                      ? TIER_PRICE[tier]
                      : item.pricePerDeviceNpr;
                  return (
                    <option key={tier} value={tier}>
                      {tier} — {price} NPR · {TIER_LIMITS[tier]}
                    </option>
                  );
                })}
              </Select>
              <p className="text-[var(--text-xs)] text-[var(--color-muted)]">
                Preview: {TIER_PRICE[nextTier]} NPR/device · {TIER_LIMITS[nextTier]}
              </p>
              <Label htmlFor="tierNote">Audit note (required)</Label>
              <Input
                id="tierNote"
                value={tierNote}
                onChange={(e) => setTierNote(e.target.value)}
                required
              />
              <Button
                size="sm"
                disabled={!tierNote.trim() || changeTier.isPending}
                onClick={() =>
                  void flash(async () => {
                    await changeTier.mutateAsync({
                      tenantId: id,
                      tier: nextTier,
                    });
                    await update.mutateAsync({
                      tier: nextTier,
                      auditNote: tierNote,
                    });
                    setTierOpen(false);
                  }, `Tier → ${nextTier}`)
                }
              >
                Confirm tier change
              </Button>
            </div>
          ) : null}

          {slugOpen ? (
            <div className="rounded-xl border border-[var(--color-warn)]/50 p-4 space-y-3">
              <p className="text-[var(--color-warn)]">
                Renaming slug breaks bookmarks and deep links to /app/{t.slug}.
              </p>
              <Label htmlFor="newSlug">New slug</Label>
              <Input
                id="newSlug"
                value={newSlug}
                pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                onChange={(e) => setNewSlug(e.target.value)}
              />
              <Label htmlFor="slugNote">Audit note (required)</Label>
              <Input
                id="slugNote"
                value={slugNote}
                onChange={(e) => setSlugNote(e.target.value)}
              />
              <Button
                size="sm"
                disabled={!slugNote.trim() || rename.isPending}
                onClick={() =>
                  void flash(
                    () =>
                      rename.mutateAsync({
                        slug: newSlug,
                        confirm: true,
                        auditNote: slugNote,
                      }),
                    "Slug renamed",
                  ).then(() => setSlugOpen(false))
                }
              >
                Confirm rename
              </Button>
            </div>
          ) : null}
        </div>
      </Panel>

      {/* 16 devices + 22 quick provision */}
      <Panel title={`Devices (${t.devices.length})`}>
        <form
          className="mb-4 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void flash(async () => {
              const d = await provision.mutateAsync(serial);
              await assign.mutateAsync({ deviceId: d.id, tenantId: id });
              setSerial("");
            }, "Device provisioned & assigned");
          }}
        >
          <Input
            placeholder="Serial e.g. TK-0002"
            value={serial}
            onChange={(e) => setSerial(e.target.value)}
            required
            className="max-w-xs"
          />
          <Button type="submit" size="sm" disabled={provision.isPending}>
            Provision + assign
          </Button>
        </form>
        {t.devices.length === 0 ? (
          <p className="text-[var(--color-muted)]">No devices yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left text-[var(--text-sm)]">
              <thead className="text-[var(--color-muted)]">
                <tr className="border-b border-[var(--color-rule)]">
                  <th className="py-2 pr-3 font-normal">Serial</th>
                  <th className="py-2 pr-3 font-normal">Status</th>
                  <th className="py-2 font-normal">Last seen</th>
                </tr>
              </thead>
              <tbody>
                {t.devices.map((d) => (
                  <tr
                    key={d.id}
                    className="border-b border-[var(--color-rule)]/50"
                  >
                    <td className="py-2.5 pr-3">{d.serial}</td>
                    <td className="py-2.5 pr-3">
                      <span
                        className={cn(
                          "inline-block size-2 rounded-full mr-2",
                          d.status === "ONLINE"
                            ? "bg-[var(--color-online)]"
                            : "bg-[var(--color-offline)]",
                        )}
                      />
                      {d.status}
                    </td>
                    <td className="py-2.5 text-[var(--color-muted)]">
                      {d.lastSeen
                        ? new Date(d.lastSeen).toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* 17 people */}
      <Panel title={`People (${t.memberCount}/${3})`}>
        <ul className="space-y-2 text-[var(--text-sm)]">
          {t.members.map((m) => (
            <li
              key={m.id}
              className="flex flex-wrap justify-between gap-2 border-b border-[var(--color-rule)]/40 py-2"
            >
              <span>
                {m.user.name} · {m.user.email}
              </span>
              <span className="text-[var(--color-muted)]">{m.role}</span>
            </li>
          ))}
        </ul>
        {t.invitations.length > 0 ? (
          <div className="mt-4">
            <p className="text-[var(--text-xs)] text-[var(--color-muted)] uppercase tracking-wide">
              Pending invites
            </p>
            <ul className="mt-2 space-y-1 text-[var(--text-sm)] text-[var(--color-ink-2)]">
              {t.invitations.map((inv) => (
                <li key={inv.id}>
                  {inv.email} · {inv.role ?? "member"}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <form
          className="mt-4 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void flash(
              () =>
                invite.mutateAsync({
                  email: inviteEmail,
                  role: "BRAND_STAFF",
                }),
              "Invite sent",
            ).then(() => setInviteEmail(""));
          }}
        >
          <Input
            type="email"
            placeholder="Invite email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
            className="max-w-xs"
          />
          <Button type="submit" size="sm">
            Invite staff
          </Button>
        </form>
      </Panel>

      {/* 23 health */}
      <Panel title="Health checks">
        <dl className="grid gap-3 text-[var(--text-sm)] sm:grid-cols-2">
          <div>
            <dt className="text-[var(--color-muted)]">Last device seen</dt>
            <dd>
              {t.health.lastDeviceSeen
                ? new Date(t.health.lastDeviceSeen).toLocaleString()
                : "Never"}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--color-muted)]">Offline ratio</dt>
            <dd>{Math.round(t.health.offlineRatio * 100)}%</dd>
          </div>
          <div>
            <dt className="text-[var(--color-muted)]">Queued / sent cmds</dt>
            <dd>{t.health.queuedCommands}</dd>
          </div>
          <div>
            <dt className="text-[var(--color-muted)]">Failed cmds</dt>
            <dd>{t.health.failedCommands}</dd>
          </div>
        </dl>
      </Panel>

      {/* 19 activity */}
      <Panel title="Activity">
        {t.activity.length === 0 ? (
          <p className="text-[var(--color-muted)]">No activity yet.</p>
        ) : (
          <ul className="max-h-80 space-y-2 overflow-y-auto text-[var(--text-sm)]">
            {t.activity.map((a, i) => (
              <li
                key={`${a.at}-${i}`}
                className="border-b border-[var(--color-rule)]/40 pb-2"
              >
                <span className="text-[var(--color-muted)]">
                  {new Date(a.at).toLocaleString()}
                </span>
                <span className="mx-2 text-[var(--color-accent)]">{a.kind}</span>
                {a.label}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* 25 danger zone */}
      <Panel title="Danger zone">
        <div className="space-y-4">
          <div>
            <Label htmlFor="dangerNote">Audit note (required for danger ops)</Label>
            <Input
              id="dangerNote"
              value={dangerNote}
              onChange={(e) => setDangerNote(e.target.value)}
              placeholder="Reason…"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {t.status === "ARCHIVED" ? (
              <Button
                variant="destructive"
                size="sm"
                disabled={!dangerNote.trim()}
                onClick={() =>
                  void flash(
                    () =>
                      archive.mutateAsync({
                        auditNote: dangerNote,
                        unarchive: true,
                      }),
                    "Unarchived",
                  )
                }
              >
                Unarchive
              </Button>
            ) : (
              <Button
                variant="destructive"
                size="sm"
                disabled={!dangerNote.trim()}
                onClick={() =>
                  void flash(
                    () =>
                      archive.mutateAsync({ auditNote: dangerNote }),
                    "Archived",
                  )
                }
              >
                Archive tenant
              </Button>
            )}
            <Button
              variant="destructive"
              size="sm"
              disabled={!dangerNote.trim()}
              onClick={() => {
                if (
                  !window.confirm(
                    "Delete all device telemetry events for this tenant?",
                  )
                )
                  return;
                void flash(
                  () =>
                    wipe.mutateAsync({
                      auditNote: dangerNote,
                      confirm: true,
                    }),
                  "Telemetry wiped",
                );
              }}
            >
              Wipe telemetry
            </Button>
          </div>
          <form
            className="flex flex-wrap gap-2 border-t border-[var(--color-rule)] pt-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!dangerNote.trim()) {
                setErr("Audit note required for transfer");
                return;
              }
              void flash(
                () =>
                  transfer.mutateAsync({
                    email: transferEmail,
                    auditNote: dangerNote,
                  }),
                "Admin transfer started",
              ).then(() => setTransferEmail(""));
            }}
          >
            <Input
              type="email"
              placeholder="New brand admin email"
              value={transferEmail}
              onChange={(e) => setTransferEmail(e.target.value)}
              required
              className="max-w-xs"
            />
            <Button type="submit" variant="destructive" size="sm">
              Transfer admin
            </Button>
          </form>
        </div>
      </Panel>

      {/* 8 + 10 sticky action bar (mobile-friendly) */}
      <div className="fixed inset-x-0 bottom-0 z-[200] border-t border-[var(--color-rule)] bg-[var(--color-paper)]/95 px-4 py-3 backdrop-blur md:sticky md:inset-auto md:bottom-auto md:z-auto md:rounded-[var(--radius-card)] md:border md:bg-[var(--color-paper-2)]">
        <div className="mx-auto flex max-w-6xl flex-wrap gap-2">
          <Link
            href={`/app/${t.slug}`}
            className="inline-flex h-9 items-center rounded-[var(--radius-pill)] bg-[var(--color-accent)] px-4 text-[var(--text-sm)] font-medium text-[var(--color-accent-ink)]"
          >
            Open workspace
          </Link>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditOpen(true)}
          >
            Edit
          </Button>
          <Button size="sm" variant="outline" onClick={copyWorkspace}>
            Copy URL
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={simulateFleet.isPending || t.devices.length === 0}
            onClick={() =>
              void flash(() => simulateFleet.mutateAsync("loop"), "Fleet simulated")
            }
          >
            Simulate fleet
          </Button>
        </div>
      </div>
    </div>
  );
}
