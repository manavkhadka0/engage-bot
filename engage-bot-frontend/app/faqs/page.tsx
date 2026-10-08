import type { Metadata } from "next";
import { SiteFooter, SiteNav } from "@/components/marketing/site-chrome";
import { FaqsPanel } from "@/components/marketing/support/faqs-panel";

export const metadata: Metadata = {
  title: "FAQs",
  description:
    "Answers for brand buyers evaluating Engage Bot: privacy, hardware, remote audio, fleet ops, and how a demo is scoped — without invented performance claims.",
};

const DIRECTION_CONTRACT = `<!--
IMPECCABLE DIRECTION CONTRACT · surface: app/faqs/page.tsx · mode: read
THESIS: Two-pane FAQ — sticky grouped index, answer pane. Refuses admin jargon and accordion-only desktop.
OWN-WORLD: Inherited from DESIGN.md. Midnight instrument deck, Shelf Cyan active rule, hairlines, pill CTA.
STORY: Skeptical brand buyer finds Privacy / Hardware / Ops / Commercial answers, then books a demo.
FIRST VIEWPORT: Display headline Questions brands ask; two-pane begins below the lede.
FORM: Two-pane index · seed 3cce5aa1 · assigned index 5 · craft bar support-comp-a.png
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
-->`;

export default function FaqsPage() {
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
          <FaqsPanel />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
