"use client";

import Link from "next/link";
import { ShelfRoundel } from "./shelf-roundel";

export function Hero() {
  return (
    <section className="relative page-gutter pb-16 pt-10 md:pb-24 md:pt-16">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16">
        <div className="min-w-0">
          <p className="font-semibold tracking-tight text-[length:var(--text-lg)] text-[var(--color-accent)]">
            Tokinomo
          </p>
          <h1 className="mt-3 max-w-[14ch] text-[length:var(--text-display)] font-semibold tracking-[var(--tracking-display)] text-[var(--color-ink)]">
            Shelf media that proves itself.
          </h1>
          <p className="mt-5 max-w-[42ch] text-[length:var(--text-lg)] text-[var(--color-ink-2)]">
            A robot on the shelf senses a shopper who stops, speaks your line,
            and reports exactly what happened — across every store, from one
            console.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/contact"
              className="inline-flex h-11 items-center rounded-[var(--radius-pill)] bg-[var(--color-accent)] px-6 text-[length:var(--text-sm)] font-semibold text-[var(--color-accent-ink)] shadow-[var(--shadow-layer)] transition-[filter] duration-[var(--dur-micro)] hover:brightness-110"
            >
              Book a demo
            </Link>
            <Link
              href="/features"
              className="inline-flex h-11 items-center rounded-[var(--radius-pill)] border border-[var(--color-rule-2)] bg-[var(--color-paper)] px-6 text-[length:var(--text-sm)] text-[var(--color-ink)] shadow-[var(--shadow-layer)] transition-colors duration-[var(--dur-micro)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              Drive the sandbox
            </Link>
          </div>
          <p className="mt-8 font-mono text-[length:var(--text-xs)] tracking-[var(--tracking-label)] text-[var(--color-muted)] uppercase">
            By Baliyo Ventures · Flexi line · Kathmandu
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div className="paper-layer p-3 md:p-4">
            <ShelfRoundel className="aspect-square w-full" />
          </div>
        </div>
      </div>
    </section>
  );
}
