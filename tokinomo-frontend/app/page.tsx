import Link from "next/link";
import type { Metadata } from "next";
import { SiteFooter, SiteNav } from "@/components/marketing/site-chrome";
import { Hero } from "@/components/marketing/landing/hero";
import { Objections } from "@/components/marketing/landing/objections";
import { Tiers } from "@/components/marketing/landing/tiers";
import { Reveal } from "@/components/motion/reveal";

export const metadata: Metadata = {
  description:
    "Shelf robots that sense a shopper, play your line, and report what happened — managed across every store from one console. Built by Baliyo Ventures.",
};

const DIRECTION_CONTRACT = `<!--
IMPECCABLE DIRECTION CONTRACT · surface: app/page.tsx · mode: persuade
THESIS: Neutral showroom, one warm price-tag accent — refuses illustrated cartoon scenes and dark SaaS glow alike.
OWN-WORLD: Dialog (ported from styles.refero.design). Flat Fog/Snow two-tone surfaces, Tangerine Tag as the only color in the room, light-weight geometric-grotesque display type, pill CTAs, one low tight shadow.
STORY: Brand buyer sees the sense-pulse device in the hero, walks objections by demonstration, books a demo.
FIRST VIEWPORT: Left brand + headline + Book a demo; right a device mark with presence rings radiating out, live telemetry chips nearby.
FORM: Dialog · source styles.refero.design/style/c8c22958-ec50-47f1-aedc-a131d7aeb442 · ported 2026-08-17, display font substituted (DM Sans Light for PP Radio Grotesk Light, unlicensed)
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
-->`;

export default function HomePage() {
  return (
    <>
      <div
        hidden
        dangerouslySetInnerHTML={{ __html: DIRECTION_CONTRACT }}
        suppressHydrationWarning
      />
      <SiteNav />
      <main id="content" className="flex-1 overflow-x-clip">
        <Hero />
        <Objections />
        <Tiers />

        <section className="page-gutter border-t border-(--color-rule) py-20 md:py-28">
          <div className="mx-auto max-w-300">
            <Reveal y={40}>
              <h2 className="max-w-[20ch] text-(length:--text-display-s) font-normal tracking-(--tracking-display) text-[var(--color-ink)]">
                Put one on a shelf and watch it report back.
              </h2>
              <p className="mt-4 max-w-[52ch] text-(length:--text-lg) text-sidebar-foreground">
                Tell us the stores, the product and the shelf, and we will scope a
                first deployment — units, mounting and the workspace your team
                logs into.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link
                  href="/contact"
                  className="inline-flex h-11 items-center rounded-(--radius-pill) bg-(--color-accent) px-6 text-[length:var(--text-sm)] font-medium text-[var(--color-accent-ink)] transition-[filter] duration-[var(--dur-micro)] hover:brightness-105"
                >
                  Book a demo
                </Link>
                <Link
                  href="/faqs"
                  className="inline-flex h-11 items-center rounded-(--radius-pill) border border-[var(--color-rule-2)] px-6 text-[length:var(--text-sm)] text-[var(--color-ink)] transition-colors duration-[var(--dur-micro)] hover:border-[var(--color-ink)]"
                >
                  Read the FAQs
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
