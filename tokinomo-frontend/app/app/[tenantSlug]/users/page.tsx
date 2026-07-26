"use client";

import { use, useState } from "react";
import { useInviteUser, useMembers } from "@/hooks/use-api";
import { useTenantContext } from "@/hooks/use-tenant";
import { EmptyState, Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";

export default function BrandUsersPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = use(params);
  const { tenantId } = useTenantContext(tenantSlug);
  const members = useMembers(tenantId);
  const invite = useInviteUser(tenantId);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"BRAND_ADMIN" | "BRAND_STAFF" | "BRAND_VIEWER">(
    "BRAND_STAFF",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const list = members.data ?? [];

  async function onInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      await invite.mutateAsync({ email, role });
      setMessage(`Invitation sent to ${email}`);
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invite failed");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[var(--text-sm)] text-[var(--color-muted)]">
          {tenantSlug} --users
        </p>
        <h1 className="mt-1 text-[length:var(--text-2xl)]">Users</h1>
        <p className="mt-2 text-[var(--text-sm)] text-[var(--color-muted)]">
          BRAND_ADMIN can invite. BRAND_STAFF / VIEWER see the roster read-only.
        </p>
      </div>

      <Panel title="invite">
        <form
          onSubmit={onInvite}
          className="grid gap-3 sm:grid-cols-[1fr_10rem_auto]"
        >
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="role">Role</Label>
            <Select
              id="role"
              value={role}
              onChange={(e) =>
                setRole(
                  e.target.value as
                    | "BRAND_ADMIN"
                    | "BRAND_STAFF"
                    | "BRAND_VIEWER",
                )
              }
            >
              <option value="BRAND_ADMIN">BRAND_ADMIN</option>
              <option value="BRAND_STAFF">BRAND_STAFF</option>
              <option value="BRAND_VIEWER">BRAND_VIEWER</option>
            </Select>
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={invite.isPending}>
              {invite.isPending ? "Sending…" : "Invite →"}
            </Button>
          </div>
        </form>
        {message ? (
          <p className="mt-3 text-[var(--color-accent)]">{message}</p>
        ) : null}
        {error ? (
          <p className="mt-3 text-[var(--color-danger)]">{error}</p>
        ) : null}
      </Panel>

      <Panel title={`${list.length} members`}>
        {members.isLoading ? (
          <p className="text-[var(--color-muted)]">Loading…</p>
        ) : list.length === 0 ? (
          <EmptyState
            title="No members listed"
            body="Invite a teammate with BRAND_ADMIN, BRAND_STAFF, or BRAND_VIEWER."
          />
        ) : (
          <ul className="divide-y divide-[var(--color-rule)]">
            {list.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap justify-between gap-2 py-3 text-[var(--text-sm)]"
              >
                <div>
                  <span className="text-[var(--color-ink)]">{m.user.name}</span>
                  <span className="ml-2 text-[var(--color-muted)]">
                    {m.user.email}
                  </span>
                </div>
                <span className="text-[var(--color-accent)]">{m.role}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
