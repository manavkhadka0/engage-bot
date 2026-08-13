"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard,
  Building2,
  Cpu,
  Radio,
  CreditCard,
  Menu,
  X,
  LogOut,
  Package,
  Music2,
  ChartNoAxesCombined,
  Users,
  Map as MapIcon,
} from "lucide-react";
import { authClient, useSession } from "@/lib/auth";
import { isPlatformRole } from "@/lib/roles";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: React.ReactNode };
type NavGroup = { label: string; items: NavItem[] };

function isNavActive(pathname: string, href: string, siblings: NavItem[]) {
  if (pathname === href) return true;
  if (!pathname.startsWith(href + "/")) return false;
  return !siblings.some(
    (other) =>
      other.href !== href &&
      other.href.startsWith(href) &&
      (pathname === other.href || pathname.startsWith(other.href + "/")),
  );
}

function SidebarNav({
  items,
  groups,
  pathname,
  onNavigate,
}: {
  items?: NavItem[];
  groups?: NavGroup[];
  pathname: string;
  onNavigate?: () => void;
}) {
  const flat = groups?.flatMap((g) => g.items) ?? items ?? [];

  function link(item: NavItem) {
    const active = isNavActive(pathname, item.href, flat);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center gap-3 rounded-[var(--radius-input)] px-3 py-2 text-[length:var(--text-sm)] transition-colors duration-[var(--dur-micro)]",
          active
            ? "bg-[var(--color-paper-3)] font-medium text-[var(--color-accent)] shadow-[var(--shadow-layer)]"
            : "text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)]/70 hover:text-[var(--color-ink)]",
        )}
      >
        <span className={cn("shrink-0", active ? "opacity-100" : "opacity-70")}>
          {item.icon}
        </span>
        {item.label}
      </Link>
    );
  }

  if (groups?.length) {
    return (
      <nav className="flex flex-col gap-5 p-3" aria-label="Admin">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="px-3 pb-1.5 font-mono text-[length:var(--text-xs)] tracking-[var(--tracking-label)] text-[var(--color-muted)] uppercase">
              {group.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => link(item))}
            </div>
          </div>
        ))}
      </nav>
    );
  }

  return (
    <nav className="flex flex-col gap-0.5 p-3" aria-label="Workspace">
      {(items ?? []).map((item) => link(item))}
    </nav>
  );
}

function ShellFrame({
  title,
  badge,
  items,
  groups,
  children,
  topBanner,
}: {
  title: string;
  badge: string;
  items?: NavItem[];
  groups?: NavGroup[];
  children: React.ReactNode;
  topBanner?: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data } = useSession();
  const [open, setOpen] = useState(false);

  async function logout() {
    await authClient.signOut();
    router.replace("/login");
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-[var(--color-paper-2)]">
      <div className="border-b border-[var(--color-rule)] px-4 py-4">
        <Link
          href="/"
          className="text-[length:var(--text-sm)] font-semibold text-[var(--color-ink)]"
        >
          Tokinomo
        </Link>
        <p className="mt-1 font-mono text-[length:var(--text-xs)] tracking-[var(--tracking-label)] text-[var(--color-muted)] uppercase">
          {badge}
        </p>
        <p className="mt-2 truncate text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
          {title}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto">
        <SidebarNav
          items={items}
          groups={groups}
          pathname={pathname}
          onNavigate={() => setOpen(false)}
        />
      </div>
      <div className="border-t border-[var(--color-rule)] p-3">
        <p className="truncate px-3 text-[length:var(--text-xs)] text-[var(--color-muted)]">
          {data?.user?.email}
        </p>
        <button
          type="button"
          onClick={() => void logout()}
          className="mt-2 flex w-full items-center gap-2 rounded-[var(--radius-input)] px-3 py-2.5 text-left text-[length:var(--text-sm)] text-[var(--color-ink-2)] transition-colors hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)]"
        >
          <LogOut className="size-4" /> Log out
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative flex min-h-full flex-1 flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside
        className="sticky top-0 hidden h-svh w-[var(--sidebar-width)] shrink-0 border-r border-[var(--color-rule)] shadow-[var(--shadow-layer)] md:block"
        style={{ zIndex: "var(--z-sidebar)" as unknown as number }}
      >
        {sidebar}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col bg-[var(--color-paper)]">
        {topBanner}
        <div className="sticky top-0 z-[var(--z-sticky-nav)] flex items-center justify-between border-b border-[var(--color-rule)] bg-[var(--color-paper)] px-4 py-3 shadow-[var(--shadow-layer)] md:hidden">
          <div>
            <p className="text-[length:var(--text-sm)] font-semibold">Tokinomo</p>
            <p className="font-mono text-[length:var(--text-xs)] tracking-[var(--tracking-label)] text-[var(--color-muted)] uppercase">
              {badge}
            </p>
          </div>
          <button
            type="button"
            className="rounded-[var(--radius-input)] border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-2"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            aria-expanded={open}
          >
            <Menu className="size-5" />
          </button>
        </div>

        <AnimatePresence>
          {open ? (
            <>
              <motion.button
                type="button"
                aria-label="Close menu"
                className="fixed inset-0 z-[var(--z-drawer)] bg-[var(--color-ink)]/40 md:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setOpen(false)}
              />
              <motion.aside
                className="fixed inset-y-0 left-0 z-[var(--z-drawer)] w-[min(86vw,20rem)] border-r border-[var(--color-rule)] shadow-[var(--shadow-layer-lg)] md:hidden"
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", stiffness: 380, damping: 36 }}
              >
                <button
                  type="button"
                  className="absolute top-3 right-3 z-10 rounded-[var(--radius-input)] p-2 text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)]"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                >
                  <X className="size-5" />
                </button>
                {sidebar}
              </motion.aside>
            </>
          ) : null}
        </AnimatePresence>

        <div className="page-gutter min-w-0 flex-1 py-6 md:py-8">{children}</div>
      </div>
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const groups: NavGroup[] = [
    {
      label: "Desk",
      items: [
        {
          href: "/admin",
          label: "Ops desk",
          icon: <LayoutDashboard className="size-4" />,
        },
        {
          href: "/admin/tenants",
          label: "Tenants",
          icon: <Building2 className="size-4" />,
        },
      ],
    },
    {
      label: "Fleet",
      items: [
        {
          href: "/admin/devices",
          label: "Devices",
          icon: <Cpu className="size-4" />,
        },
        {
          href: "/admin/fleet",
          label: "Fleet map",
          icon: <Radio className="size-4" />,
        },
      ],
    },
    {
      label: "Billing",
      items: [
        {
          href: "/admin/billing",
          label: "Billing",
          icon: <CreditCard className="size-4" />,
        },
      ],
    },
  ];
  return (
    <ShellFrame title="Platform ops" badge="Baliyo" groups={groups}>
      {children}
    </ShellFrame>
  );
}

export function BrandShell({
  tenantSlug,
  children,
}: {
  tenantSlug: string;
  children: React.ReactNode;
}) {
  const { data } = useSession();
  const platform = isPlatformRole(data?.user?.role);
  const base = `/app/${tenantSlug}`;
  const items: NavItem[] = [
    { href: base, label: "Overview", icon: <LayoutDashboard className="size-4" /> },
    { href: `${base}/devices`, label: "Devices", icon: <Cpu className="size-4" /> },
    { href: `${base}/map`, label: "Map", icon: <MapIcon className="size-4" /> },
    { href: `${base}/products`, label: "Products", icon: <Package className="size-4" /> },
    { href: `${base}/audio`, label: "Audio", icon: <Music2 className="size-4" /> },
    {
      href: `${base}/analytics`,
      label: "Analytics",
      icon: <ChartNoAxesCombined className="size-4" />,
    },
    { href: `${base}/billing`, label: "Billing", icon: <CreditCard className="size-4" /> },
    { href: `${base}/users`, label: "Users", icon: <Users className="size-4" /> },
  ];

  return (
    <ShellFrame
      title={tenantSlug}
      badge={platform ? "Platform → brand" : "Brand"}
      items={items}
      topBanner={
        platform ? (
          <div className="border-b border-[var(--color-warn)]/50 bg-[var(--color-warn)]/12 px-4 py-2 text-center text-[length:var(--text-xs)] text-[var(--color-ink)]">
            Viewing as platform ·{" "}
            <Link href="/admin/tenants" className="font-medium text-[var(--color-accent)] underline">
              back to tenants
            </Link>
          </div>
        ) : undefined
      }
    >
      {children}
    </ShellFrame>
  );
}
