"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { authClient } from "@/lib/auth";
import { isPlatformRole } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { SiteNav } from "@/components/marketing/site-chrome";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data, error: authError } = await authClient.signIn.email({
        email,
        password,
      });
      if (authError) {
        setError(authError.message ?? "Sign-in failed");
        return;
      }
      const role = (data?.user as { role?: string } | undefined)?.role;
      if (next) {
        router.replace(next);
        return;
      }
      if (isPlatformRole(role)) {
        router.replace("/admin");
        return;
      }
      const orgs = await authClient.organization.list();
      const first = orgs.data?.[0] as { slug?: string; id?: string } | undefined;
      if (first?.id) {
        await authClient.organization.setActive({ organizationId: first.id });
      }
      router.replace(first?.slug ? `/app/${first.slug}` : "/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />
      </div>
      {error ? (
        <p className="rounded-xl border border-[var(--color-danger)] px-3 py-2 text-[var(--text-sm)] text-[var(--color-danger)]">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <>
      <SiteNav />
      <main className="page-gutter flex flex-1 flex-col justify-center py-16">
        <div className="mx-auto w-full max-w-md">
          <h1 className="text-[length:var(--text-display-s)] font-semibold">
            Sign in
          </h1>
          <p className="mt-2 text-[var(--text-sm)] text-[var(--color-ink-2)]">
            Platform → admin · Brand → workspace
          </p>
          <div className="mt-8 rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-6">
            <Suspense fallback={<p className="text-[var(--color-muted)]">Loading…</p>}>
              <LoginForm />
            </Suspense>
          </div>
          <p className="mt-6 text-[var(--text-sm)] text-[var(--color-muted)]">
            <Link href="/" className="underline">
              ← home
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
