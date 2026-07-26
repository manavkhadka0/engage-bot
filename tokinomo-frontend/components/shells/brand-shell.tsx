"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient, useSession } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function BrandShell({
  tenantSlug,
  children,
}: {
  tenantSlug: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data } = useSession();
  const base = `/app/${tenantSlug}`;

  const links = [
    { href: base, label: "overview" },
    { href: `${base}/devices`, label: "devices" },
    { href: `${base}/products`, label: "products" },
    { href: `${base}/audio`, label: "audio" },
    { href: `${base}/analytics`, label: "analytics" },
    { href: `${base}/billing`, label: "billing" },
    { href: `${base}/users`, label: "users" },
  ];

  async function logout() {
    await authClient.signOut();
    router.replace("/login");
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-[var(--z-sticky-nav)] border-b border-[var(--color-rule)] bg-[var(--color-paper)]">
        <div className="page-gutter flex h-12 items-center gap-3 overflow-x-auto">
          <Link href={base} className="shrink-0 text-[var(--color-accent)]">
            &gt; {tenantSlug}
          </Link>
          <span className="shrink-0 text-[var(--text-xs)] tracking-[var(--tracking-label)] text-[var(--color-muted)] uppercase">
            brand
          </span>
          <nav className="ml-2 flex shrink-0 gap-4 text-[var(--text-sm)]">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "hover:text-[var(--color-accent)]",
                  pathname === l.href
                    ? "text-[var(--color-accent)]"
                    : "text-[var(--color-ink-2)]",
                )}
              >
                --{l.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-3">
            <span className="hidden text-[var(--text-xs)] text-[var(--color-muted)] sm:inline">
              {data?.user?.email}
            </span>
            <button
              type="button"
              onClick={() => void logout()}
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              logout
            </button>
          </div>
        </div>
      </header>
      <div className="page-gutter flex-1 py-8">{children}</div>
    </div>
  );
}
