import Link from "next/link";
import type { Metadata } from "next";
import { SiteFooter, SiteNav } from "@/components/marketing/site-chrome";
import { Hero } from "@/components/marketing/landing/hero";
import { Objections } from "@/components/marketing/landing/objections";
import { Tiers } from "@/components/marketing/landing/tiers";

export const metadata: Metadata = {
  description:
    "Shelf robots that sense a shopper, play your line, and report what happened — managed across every store from one console. Built by Baliyo Ventures.",
};

const DIRECTION_CONTRACT = `<!--
IMPECCABLE DIRECTION CONTRACT · surface: app/page.tsx · mode: persuade
THESIS: Roundel + type — shelf mechanism as concentric papercut layers; refuses dark SaaS glow and metric heroes.
OWN-WORLD: Layered Papercut. Light paper field, unmixed madder/green/gold/navy plates, soft paper-edge shadows, geometric sans, pill CTAs, hard-cornered status dots.
STORY: Brand buyer sees Sense→Speak→Prove in the roundel, walks objections by demonstration, books a demo.
FIRST VIEWPORT: Left brand + headline + Book a demo; right concentric papercut roundel encoding Sense / Speak / Prove.
FORM: Layered Papercut · seed e5153db1 · challenger craft-making-lowicz-layered-papercut · approved .impeccable/mocks/papercut-comp-c.png
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

        <section className="page-gutter border-t border-[var(--color-rule)] py-20 md:py-28">
          <div className="mx-auto max-w-6xl">
            <h2 className="max-w-[20ch] text-[length:var(--text-display-s)] font-semibold tracking-[var(--tracking-display)] text-[var(--color-ink)]">
              Put one on a shelf and watch it report back.
            </h2>
            <p className="mt-4 max-w-[52ch] text-[length:var(--text-lg)] text-[var(--color-ink-2)]">
              Tell us the stores, the product and the shelf, and we will scope a
              first deployment — units, mounting and the workspace your team
              logs into.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/contact"
                className="inline-flex h-11 items-center rounded-[var(--radius-pill)] bg-[var(--color-accent)] px-6 text-[length:var(--text-sm)] font-semibold text-[var(--color-accent-ink)] transition-[filter] duration-[var(--dur-micro)] hover:brightness-110"
              >
                Book a demo
              </Link>
              <Link
                href="/faqs"
                className="inline-flex h-11 items-center rounded-[var(--radius-pill)] border border-[var(--color-rule-2)] px-6 text-[length:var(--text-sm)] text-[var(--color-ink)] transition-colors duration-[var(--dur-micro)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              >
                Read the FAQs
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
