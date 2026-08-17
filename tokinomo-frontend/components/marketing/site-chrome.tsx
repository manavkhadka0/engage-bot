"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/features", label: "Features" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/faqs", label: "FAQs" },
];

export function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-[var(--z-sticky-nav)] page-gutter pt-3">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 py-2 shadow-[var(--shadow-layer)]">
        <Link
          href="/"
          className="rounded-[var(--radius-pill)] px-3 py-1.5 text-[length:var(--text-sm)] font-semibold tracking-tight text-[var(--color-ink)]"
        >
          Tokinomo
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-[var(--radius-pill)] px-3 py-1.5 text-[length:var(--text-sm)] transition-colors",
                pathname === l.href
                  ? "bg-[var(--color-paper-3)] text-[var(--color-accent)]"
                  : "text-[var(--color-ink-2)] hover:text-[var(--color-ink)]",
              )}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden rounded-[var(--radius-pill)] px-3 py-1.5 text-[length:var(--text-sm)] text-[var(--color-ink-2)] transition-colors hover:text-[var(--color-ink)] sm:inline-flex"
          >
            Log in
          </Link>
          <Link
            href="/contact"
            className="rounded-[var(--radius-pill)] bg-[var(--color-accent)] px-4 py-2 text-[length:var(--text-sm)] font-medium text-[var(--color-accent-ink)] transition hover:brightness-110"
          >
            Book a demo
          </Link>
          <button
            type="button"
            className="rounded-[var(--radius-pill)] border border-[var(--color-rule)] px-3 py-2 text-[length:var(--text-xs)] text-[var(--color-ink-2)] md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            Menu
          </button>
        </div>
      </nav>

      {open ? (
        <div className="mt-2 rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] p-3 shadow-[var(--shadow-layer)] md:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="block rounded-lg px-3 py-2.5 text-[var(--color-ink-2)]"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/login"
            className="block rounded-lg px-3 py-2.5 text-[var(--color-ink-2)]"
            onClick={() => setOpen(false)}
          >
            Log in
          </Link>
        </div>
      ) : null}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="page-gutter border-t border-[var(--color-rule)] py-14">
      <div className="mx-auto max-w-6xl">
        <p className="max-w-[18ch] text-[length:var(--text-display-s)] font-semibold tracking-tight text-[var(--color-ink)]">
          Sense. Speak. Prove.
        </p>
        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[length:var(--text-sm)] text-[var(--color-muted)]">
          <Link href="/features" className="hover:text-[var(--color-ink)]">
            Features
          </Link>
          <Link href="/contact" className="hover:text-[var(--color-ink)]">
            Contact
          </Link>
          <Link href="/login" className="hover:text-[var(--color-ink)]">
            Login
          </Link>
          <span>© 2026 Baliyo Ventures</span>
        </div>
      </div>
    </footer>
  );
}
