"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Faq = { id: string; q: string; a: string };
type Group = { id: string; label: string; items: Faq[] };

const GROUPS: Group[] = [
  {
    id: "privacy",
    label: "Privacy",
    items: [
      {
        id: "camera",
        q: "Is there a camera on the shelf?",
        a: "No. Tokinomo uses a 24 GHz millimetre-wave sensor to detect presence and distance. There is no camera and no microphone. It can tell that somebody stopped and for how long — and nothing else.",
      },
      {
        id: "data",
        q: "What does the unit report?",
        a: "Presence detections, dwell time, audio plays, and online or offline status. That telemetry stays inside the brand’s own workspace. Another tenant cannot see it.",
      },
    ],
  },
  {
    id: "hardware",
    label: "Hardware",
    items: [
      {
        id: "power",
        q: "Does every shelf need a free outlet?",
        a: "Units are battery-powered with mains charging, so a short power cut does not kill the campaign and the device is not trapped to one free outlet on the bay.",
      },
      {
        id: "wifi",
        q: "Do you need cellular SIM cards?",
        a: "No. Connectivity is store Wi-Fi only. Per-unit cellular cost was rejected at fleet scale.",
      },
      {
        id: "notice",
        q: "Will shoppers notice it?",
        a: "The unit grips the product, swings it forward, lights up, and speaks when someone stops in front of it. On a shelf where nothing else moves, motion is the argument.",
      },
    ],
  },
  {
    id: "ops",
    label: "Ops",
    items: [
      {
        id: "audio",
        q: "Can we change the message without visiting stores?",
        a: "Yes. Upload a clip, choose the devices, and push. Each unit acknowledges on its own — queued, sent, then acked or failed — so you know which shelves actually received the new line.",
      },
      {
        id: "down",
        q: "What if a unit goes dark?",
        a: "The console shows online and offline status live. Baliyo can see a unit is down before a brand has to complain — that is the point of shipping connected devices.",
      },
      {
        id: "phone",
        q: "Can brand teams run this on a phone?",
        a: "Yes. Brand staff often work standing in an aisle. The workspace is built for that posture; Baliyo operators use the denser laptop console.",
      },
    ],
  },
  {
    id: "commercial",
    label: "Commercial",
    items: [
      {
        id: "model",
        q: "How is it sold?",
        a: "Hardware plus a platform subscription. Tiers are Basic, Growth, and Brand — differentiated by what each includes (clips, theming). Exact prices are confirmed on a demo, not listed as invented figures here.",
      },
      {
        id: "proof",
        q: "What proof will we have at renewal?",
        a: "Detections, dwell, audio plays, and fleet health from your own stores — numbers your team caused and can defend. We do not invent sales-lift claims on this site.",
      },
      {
        id: "demo",
        q: "What should we bring to a demo?",
        a: "Brand name, approximate store count, the product on the shelf, and a rough timeline. That is enough to scope units, mounting, and the workspace your team would log into.",
      },
    ],
  },
];

const ALL = GROUPS.flatMap((g) => g.items);

export function FaqsPanel() {
  const baseId = useId();
  const [activeId, setActiveId] = useState(ALL[0].id);
  const active = ALL.find((item) => item.id === activeId) ?? ALL[0];

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="max-w-[16ch] text-[length:var(--text-display)] font-semibold tracking-[var(--tracking-display)] text-[var(--color-ink)]">
        Questions brands ask
      </h1>
      <p className="mt-4 max-w-[48ch] text-[length:var(--text-lg)] text-[var(--color-ink-2)]">
        Straight answers for a skeptical trade-marketing buyer. No admin jargon,
        no invented performance claims.
      </p>

      {/* Mobile: native accordion */}
      <div className="mt-12 space-y-0 lg:hidden">
        {GROUPS.map((group) => (
          <div key={group.id} className="border-t border-[var(--color-rule)]">
            <p className="pt-6 pb-2 font-mono text-[length:var(--text-xs)] tracking-[var(--tracking-label)] text-[var(--color-muted)] uppercase">
              {group.label}
            </p>
            {group.items.map((item) => (
              <details
                key={item.id}
                className="group border-b border-[var(--color-rule)] py-4"
              >
                <summary className="cursor-pointer list-none text-[length:var(--text-base)] font-medium text-[var(--color-ink)] marker:content-none [&::-webkit-details-marker]:hidden">
                  {item.q}
                </summary>
                <p className="mt-3 max-w-[52ch] text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        ))}
      </div>

      {/* Desktop: two-pane */}
      <div className="mt-14 hidden gap-10 lg:grid lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] lg:items-start">
        <nav
          aria-label="FAQ topics"
          className="sticky top-28 max-h-[calc(100vh-8rem)] self-start overflow-y-auto pr-2"
        >
          <div className="space-y-6">
            {GROUPS.map((group) => (
              <div key={group.id}>
                <p className="mb-2 font-mono text-[length:var(--text-xs)] tracking-[var(--tracking-label)] text-[var(--color-muted)] uppercase">
                  {group.label}
                </p>
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const selected = item.id === activeId;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          id={`${baseId}-tab-${item.id}`}
                          role="tab"
                          aria-selected={selected}
                          aria-controls={`${baseId}-panel`}
                          className={cn(
                            "w-full border-l border-transparent px-3 py-2 text-left text-[length:var(--text-sm)] transition-colors",
                            selected
                              ? "border-[var(--color-accent)] text-[var(--color-ink)]"
                              : "text-[var(--color-ink-2)] hover:text-[var(--color-ink)]",
                          )}
                          onClick={() => setActiveId(item.id)}
                        >
                          {item.q}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        <article
          id={`${baseId}-panel`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${active.id}`}
          className="min-w-0 paper-layer-2 p-8"
        >
          <h2 className="max-w-[28ch] text-[length:var(--text-2xl)] font-semibold tracking-tight text-[var(--color-ink)]">
            {active.q}
          </h2>
          <p className="mt-5 max-w-[52ch] text-[length:var(--text-base)] leading-relaxed text-[var(--color-ink-2)]">
            {active.a}
          </p>
          <div className="mt-10 border-t border-[var(--color-rule)] pt-6">
            <p className="text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
              Still deciding whether a fleet is worth the line item?
            </p>
            <Link
              href="/contact"
              className="mt-4 inline-flex h-11 items-center rounded-[var(--radius-pill)] bg-[var(--color-accent)] px-6 text-[length:var(--text-sm)] font-semibold text-[var(--color-accent-ink)] transition-[filter] duration-[var(--dur-micro)] hover:brightness-110"
            >
              Book a demo
            </Link>
          </div>
        </article>
      </div>

      <div className="mt-14 border-t border-[var(--color-rule)] pt-10 lg:hidden">
        <Link
          href="/contact"
          className="inline-flex h-11 items-center rounded-[var(--radius-pill)] bg-[var(--color-accent)] px-6 text-[length:var(--text-sm)] font-semibold text-[var(--color-accent-ink)] transition-[filter] duration-[var(--dur-micro)] hover:brightness-110"
        >
          Book a demo
        </Link>
      </div>
    </div>
  );
}
