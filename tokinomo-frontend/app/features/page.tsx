import Link from "next/link";
import type { Metadata } from "next";
import { SiteFooter, SiteNav } from "@/components/marketing/site-chrome";
import { FeaturesExperience } from "@/components/marketing/features/experience";
import { CapabilityIndex } from "@/components/marketing/features/capability-index";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Drive a simulated Tokinomo fleet from the browser: provision a shelf robot, watch it sense a shopper who stops, push audio to every store, and read back the telemetry it produced.",
};

const DIRECTION_CONTRACT = `<!--
IMPECCABLE DIRECTION CONTRACT · surface: app/features/page.tsx · mode: persuade
THESIS: The Demo Tenant. Capabilities are performed by the visitor inside a working sandbox console, not described in a card grid. Refuses the feature-grid default and refuses repeating the landing page's objection sequence.
OWN-WORLD: Inherited unchanged from DESIGN.md. Midnight instrument deck, one Shelf Cyan accent, hairline rules, flat tonal depth, pill actions, hard-cornered square status dots, uppercase mono labels.
STORY: Provision a serial into a device, move a shopper until the sensor decides the stop is real, push a clip and watch each unit acknowledge, then find those exact interactions in the analytics. Ends on tenant isolation and role scope.
FIRST VIEWPORT: Display headline stating the page is drivable, a subline naming the mechanism, then the act rail and the live console beginning immediately below.
FORM: Persistent console with an explicit act tablist. Deliberately inverts the landing page, where narration was pinned and demos scrolled.
MOTION: Every moment is caused by the visitor or the simulation. No scroll-driven state anywhere on this surface.
TRUTH: Fleet, brands, stores and starting figures are simulated and marked as such. No efficacy, revenue or conversion claim appears. Unbuilt capabilities are listed as unbuilt, without dates.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
-->`;

export default function FeaturesPage() {
  return (
    <>
      <div
        hidden
        dangerouslySetInnerHTML={{ __html: DIRECTION_CONTRACT }}
        suppressHydrationWarning
      />
      <SiteNav />
      <main id="content" className="flex-1 overflow-x-clip">
        <div className="page-gutter py-16 md:py-24">
          <div className="mx-auto max-w-6xl">
            <FeaturesExperience />
          </div>
        </div>

        <div className="page-gutter border-t border-[var(--color-rule)] py-20 md:py-28">
          <div className="mx-auto max-w-6xl">
            <CapabilityIndex />
          </div>
        </div>

        <section className="page-gutter border-t border-[var(--color-rule)] py-20 md:py-28">
          <div className="mx-auto max-w-6xl">
            <h2 className="max-w-[22ch] text-[length:var(--text-display-s)] font-semibold tracking-[var(--tracking-display)] text-[var(--color-ink)]">
              The real one runs on real shelves.
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
                href="/#pricing"
                className="inline-flex h-11 items-center rounded-[var(--radius-pill)] border border-[var(--color-rule-2)] px-6 text-[length:var(--text-sm)] text-[var(--color-ink)] transition-colors duration-[var(--dur-micro)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              >
                See what a tier includes
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
