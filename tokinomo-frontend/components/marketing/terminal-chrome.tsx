"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/features", flag: "--features" },
  { href: "/about", flag: "--about" },
  { href: "/faqs", flag: "--faqs" },
  { href: "/contact", flag: "--contact" },
  { href: "/login", flag: "--login" },
];

export function TerminalNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-[var(--z-sticky-nav)] border-b border-[var(--color-rule)] bg-[var(--color-paper)]/95 backdrop-blur-sm">
      <div className="page-gutter flex h-[var(--banner-height)] items-center justify-between gap-4">
        <pre className="m-0 hidden min-w-0 flex-1 overflow-x-auto font-mono text-[var(--text-sm)] leading-none md:block">
          <Link href="/" className="text-[var(--color-accent)] no-underline">
            &gt;
          </Link>{" "}
          <Link
            href="/"
            className="text-[var(--color-ink)] no-underline hover:text-[var(--color-accent)]"
          >
            tokinomo
          </Link>{" "}
          {links.map((l) => (
            <span key={l.href}>
              <Link
                href={l.href}
                className={cn(
                  "underline-offset-2 hover:underline",
                  pathname === l.href
                    ? "text-[var(--color-accent)]"
                    : "text-[var(--color-ink-2)]",
                )}
              >
                {l.flag}
              </Link>{" "}
            </span>
          ))}
          <span className="term-caret" aria-hidden>
            ▮
          </span>
        </pre>

        <div className="flex w-full items-center justify-between md:hidden">
          <Link href="/" className="font-mono text-[var(--color-accent)]">
            &gt; tokinomo
          </Link>
          <button
            type="button"
            className="border border-[var(--color-rule)] px-2 py-1 font-mono text-[var(--text-xs)] text-[var(--color-ink-2)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
          >
            {open ? "close" : "menu"}
          </button>
        </div>
      </div>

      {open ? (
        <nav
          id="mobile-nav"
          className="border-t border-[var(--color-rule)] page-gutter py-3 md:hidden"
        >
          <ul className="flex flex-col gap-2 font-mono text-[var(--text-sm)]">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={cn(
                    "block py-1",
                    pathname === l.href
                      ? "text-[var(--color-accent)]"
                      : "text-[var(--color-ink-2)]",
                  )}
                  onClick={() => setOpen(false)}
                >
                  {l.flag}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}

export function TerminalFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--color-rule)] page-gutter py-10">
      <p className="max-w-[70ch] font-mono text-[var(--text-xs)] leading-relaxed text-[var(--color-muted)]">
        TOKINOmo · Baliyo Ventures · shelf-edge robots that detect dwell, play
        audio, and report engagement · platform for PLATFORM_OWNER /
        PLATFORM_OPERATOR · brand workspaces for BRAND_ADMIN / BRAND_STAFF /
        BRAND_VIEWER ·{" "}
        <Link href="/login" className="text-[var(--color-ink-2)] underline">
          login
        </Link>{" "}
        ·{" "}
        <Link href="/contact" className="text-[var(--color-ink-2)] underline">
          contact
        </Link>{" "}
        · © {new Date().getFullYear()}
      </p>
    </footer>
  );
}
