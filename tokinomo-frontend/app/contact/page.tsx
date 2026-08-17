import type { Metadata } from "next";
import { SiteFooter, SiteNav } from "@/components/marketing/site-chrome";
import { DemoRequest } from "@/components/marketing/support/demo-request";

export const metadata: Metadata = {
  title: "Book a demo",
  description:
    "Request a Tokinomo fleet demo from Baliyo Ventures. Bring brand, store count, product, and timeline — we will scope units and the workspace.",
};

const DIRECTION_CONTRACT = `<!--
IMPECCABLE DIRECTION CONTRACT · surface: app/contact/page.tsx · mode: persuade
THESIS: Checklist + scoped demo form. Refuses generic inbox and fake booking calendar.
OWN-WORLD: Inherited from DESIGN.md. Midnight instrument deck, hard-cornered cyan markers, soft inputs, pill submit.
STORY: Visitor brings brand/stores/product/timeline, submits a scoped request, understands the queue is local until email is wired.
FIRST VIEWPORT: Display headline Book a demo; checklist and form begin immediately below the lede.
FORM: Checklist + form · seed 8e8edf48 · assigned index 6 · craft bar support-comp-a.png
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
-->`;

export default function ContactPage() {
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
            <h1 className="max-w-[12ch] text-[length:var(--text-display)] font-semibold tracking-[var(--tracking-display)] text-[var(--color-ink)]">
              Book a demo
            </h1>
            <p className="mt-4 max-w-[46ch] text-[length:var(--text-lg)] text-[var(--color-ink-2)]">
              Tell us the brand, the stores, and the shelf. We will scope a first
              conversation — units, mounting, and the workspace your team logs
              into.
            </p>
            <div className="mt-12 md:mt-14">
              <DemoRequest />
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
