"use client";

import Link from "next/link";
import { useState } from "react";
import { useCreateTenant, useTenants } from "@/hooks/use-api";
import { EmptyState, Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
import type { TenantTier } from "@/lib/api/types";

export default function TenantsPage() {
  const tenants = useTenants();
  const create = useCreateTenant();
  const [open, setOpen] = useState(false);
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    try {
      const res = await create.mutateAsync(form);
      setOk(`Created ${res.tenant.name} → /app/${res.tenant.slug}`);
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

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[var(--text-sm)] text-[var(--color-muted)]">
            tenants --list
          </p>
          <h1 className="mt-1 text-[length:var(--text-2xl)]">Tenants</h1>
        </div>
        <Button onClick={() => setOpen((v) => !v)}>
          {open ? "Cancel" : "Create tenant →"}
        </Button>
      </div>

      {ok ? (
        <p className="border border-[var(--color-rule)] px-3 py-2 text-[var(--text-sm)] text-[var(--color-accent)]">
          {ok}
        </p>
      ) : null}

      {open ? (
        <Panel title="create tenant">
          <form
            onSubmit={onSubmit}
            className="grid gap-4 md:grid-cols-2"
          >
            <div>
              <Label htmlFor="name">Brand name</Label>
              <Input
                id="name"
                required
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
                <option value="BASIC">BASIC — 500 NPR/device</option>
                <option value="GROWTH">GROWTH — 800 NPR/device ⭐</option>
                <option value="BRAND">BRAND — 1,200 NPR/device</option>
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
                value={form.adminPassword}
                onChange={(e) =>
                  setForm((f) => ({ ...f, adminPassword: e.target.value }))
                }
              />
            </div>
            {error ? (
              <p className="md:col-span-2 text-[var(--color-danger)]">
                {error}
              </p>
            ) : null}
            <div className="md:col-span-2">
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? "Creating…" : "Provision brand →"}
              </Button>
            </div>
          </form>
        </Panel>
      ) : null}

      <Panel title={`${list.length} tenants`}>
        {tenants.isLoading ? (
          <p className="text-[var(--color-muted)]">Loading…</p>
        ) : list.length === 0 ? (
          <EmptyState
            title="Empty registry"
            body="Create the first brand to unlock device assignment and brand login."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-[var(--text-sm)]">
              <thead className="text-[var(--color-muted)]">
                <tr className="border-b border-[var(--color-rule)]">
                  <th className="py-2 pr-4 font-normal">Name</th>
                  <th className="py-2 pr-4 font-normal">Slug</th>
                  <th className="py-2 pr-4 font-normal">Tier</th>
                  <th className="py-2 pr-4 font-normal">Status</th>
                  <th className="py-2 pr-4 font-normal">Devices</th>
                  <th className="py-2 font-normal">Open</th>
                </tr>
              </thead>
              <tbody>
                {list.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-[var(--color-rule)]/60"
                  >
                    <td className="py-3 pr-4 text-[var(--color-ink)]">
                      {t.name}
                    </td>
                    <td className="py-3 pr-4 text-[var(--color-ink-2)]">
                      {t.slug}
                    </td>
                    <td className="py-3 pr-4">{t.tier}</td>
                    <td className="py-3 pr-4">{t.status}</td>
                    <td className="py-3 pr-4 tabular-nums">
                      {t._count?.devices ?? 0}
                    </td>
                    <td className="py-3">
                      <Link
                        href={`/app/${t.slug}`}
                        className="text-[var(--color-accent)] underline"
                      >
                        workspace
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
