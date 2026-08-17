import Link from "next/link";
import type { Metadata } from "next";
import { SiteFooter, SiteNav } from "@/components/marketing/site-chrome";

export const metadata: Metadata = {
  title: "About",
  description:
    "Tokinomo is built by Baliyo Ventures in Kathmandu — shelf robots that sense shoppers, speak a campaign, and prove engagement from a multi-tenant console.",
};

const DIRECTION_CONTRACT = `<!--
IMPECCABLE DIRECTION CONTRACT · surface: app/about/page.tsx · mode: persuade
THESIS: Split ledger — maker narrative left, verified fact ledger right. Refuses manifesto, values wall, and invented team metrics.
OWN-WORLD: Inherited from DESIGN.md. Midnight instrument deck, Shelf Cyan actions, hairline rules, soft-rectangle containers, pill CTAs, uppercase mono labels.
STORY: Visitor learns who builds Tokinomo (Baliyo / Flexi / Kathmandu), what the system is (Sense → Speak → Prove), and books a demo.
FIRST VIEWPORT: Display headline Built by Baliyo Ventures; two-column ledger begins immediately; Book a demo is the close action.
FORM: Split ledger · seed f6c8c050 · assigned index 4 · craft bar support-comp-a.png
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
-->`;

const LEDGER: Array<{ label: string; value: string }> = [
  { label: "Maker", value: "Baliyo Ventures · Flexi line" },
  { label: "Built in", value: "Kathmandu, Nepal" },
  { label: "Presence", value: "24 GHz mmWave — no camera, no mic" },
  { label: "Loop", value: "Sense → Speak → Prove" },
  { label: "Connectivity", value: "Store Wi-Fi only — no SIM" },
  { label: "Tenancy", value: "One brand, one workspace — never another fleet" },
  { label: "Stack", value: "Shelf unit · NestJS platform · Next.js console" },
  { label: "Commercial", value: "Hardware + subscription · Basic / Growth / Brand" },
];

export default function AboutPage() {
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
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:gap-16 lg:items-start">
            <div>
              <h1 className="max-w-[14ch] text-[length:var(--text-display)] font-semibold tracking-[var(--tracking-display)] text-[var(--color-ink)]">
                Built by Baliyo Ventures
              </h1>
              <div className="mt-6 max-w-[42ch] space-y-5 text-[length:var(--text-lg)] text-[var(--color-ink-2)]">
                <p>
                  Tokinomo is a shelf-advertising robot and the platform that
                  runs it. A unit grips a product, senses a shopper who stops,
                  speaks your line, and reports what happened — across every
                  store, from one console.
                </p>
                <p>
                  We build connected devices on purpose. A shelf gadget you never
                  hear from again cannot defend a renewal. A measured fleet can.
                </p>
                <p>
                  Baliyo runs the platform. Brands run their workspace. Nobody
                  sees another tenant&apos;s fleet.
                </p>
              </div>
              <div className="mt-10 flex flex-wrap items-center gap-3">
                <Link
                  href="/contact"
                  className="inline-flex h-11 items-center rounded-[var(--radius-pill)] bg-[var(--color-accent)] px-6 text-[length:var(--text-sm)] font-semibold text-[var(--color-accent-ink)] transition-[filter] duration-[var(--dur-micro)] hover:brightness-110"
                >
                  Book a demo
                </Link>
                <Link
                  href="/features"
                  className="inline-flex h-11 items-center rounded-[var(--radius-pill)] border border-[var(--color-rule-2)] px-6 text-[length:var(--text-sm)] text-[var(--color-ink)] transition-colors duration-[var(--dur-micro)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                >
                  Drive the sandbox
                </Link>
              </div>
            </div>

            <aside
              aria-label="Verified facts"
              className="paper-layer-2"
            >
              <div className="border-b border-[var(--color-rule)] px-5 py-3">
                <p className="font-mono text-[length:var(--text-xs)] tracking-[var(--tracking-label)] text-[var(--color-muted)] uppercase">
                  Ledger · verified
                </p>
              </div>
              <dl className="divide-y divide-[var(--color-rule)]">
                {LEDGER.map((row) => (
                  <div
                    key={row.label}
                    className="grid gap-1 px-5 py-3.5 sm:grid-cols-[7.5rem_1fr] sm:gap-4"
                  >
                    <dt className="font-mono text-[length:var(--text-xs)] tracking-[var(--tracking-label)] text-[var(--color-muted)] uppercase">
                      {row.label}
                    </dt>
                    <dd className="text-[length:var(--text-sm)] text-[var(--color-ink)]">
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </aside>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
