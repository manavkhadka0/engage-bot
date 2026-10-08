"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth";
import { Button } from "@/components/ui/button";

function AcceptInviteForm() {
  const router = useRouter();
  const search = useSearchParams();
  const invitationId = search.get("invitationId");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function accept() {
    if (!invitationId) {
      setError("Missing invitationId");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await authClient.organization.acceptInvitation({
        invitationId,
      });
      if (res.error) {
        setError(res.error.message ?? "Could not accept invitation");
        return;
      }
      setDone(true);
      const org = res.data?.member?.organizationId;
      if (org) {
        await authClient.organization.setActive({ organizationId: org });
      }
      setTimeout(() => router.replace("/app"), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Accept failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-4 border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-6">
      <h1 className="text-[length:var(--text-xl)]">Accept invite</h1>
      {!invitationId ? (
        <p className="text-[var(--color-danger)]">
          No invitationId in the URL. Open the link from your email.
        </p>
      ) : done ? (
        <p className="text-[var(--color-accent)]">Joined — redirecting…</p>
      ) : (
        <>
          <p className="text-[var(--text-sm)] text-[var(--color-muted)]">
            Invitation: {invitationId.slice(0, 12)}…
          </p>
          <Button onClick={() => void accept()} disabled={loading}>
            {loading ? "Joining…" : "Accept →"}
          </Button>
        </>
      )}
      {error ? <p className="text-[var(--color-danger)]">{error}</p> : null}
      <p className="text-[var(--text-sm)] text-[var(--color-muted)]">
        Not signed in?{" "}
        <Link href="/login" className="underline">
          Login first
        </Link>
        , then reopen this link.
      </p>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <main className="page-gutter flex flex-1 flex-col justify-center py-16">
      <Suspense fallback={<p className="text-[var(--color-muted)]">Loading…</p>}>
        <AcceptInviteForm />
      </Suspense>
    </main>
  );
}
