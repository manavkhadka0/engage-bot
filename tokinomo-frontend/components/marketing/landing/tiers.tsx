import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";

const MODEL = [
  {
    label: "one-time",
    title: "The units",
    body: "You buy the shelf hardware once — device, mount, speaker and power. Baliyo builds and commissions them.",
  },
  {
    label: "recurring",
    title: "The platform",
    body: "The console, the telemetry, live status and remote audio push run as a subscription. That is what keeps a fleet visible instead of silent.",
  },
];

const TIERS = [
  {
    name: "Basic",
    positioning: "One message, running reliably.",
    includes: [
      "One audio clip per device",
      "Live online/offline status",
      "Dwell, plays and uptime analytics",
      "Brand admin plus two members",
    ],
    featured: false,
  },
  {
    name: "Growth",
    positioning: "A campaign calendar, pushed remotely.",
    includes: [
      "Everything in Basic",
      "Multiple clips per device",
      "Event and festival theming",
      "Swap messaging without a store visit",
    ],
    featured: true,
  },
  {
    name: "Brand",
    positioning: "Larger fleets across many stores.",
    includes: [
      "Everything in Growth",
      "Multi-store fleet organisation",
      "Onboarding for your team",
      "Packaging shaped around your rollout",
    ],
    featured: false,
  },
];

export function Tiers() {
  return (
    <section
      id="pricing"
      className="page-gutter border-t border-[var(--color-rule)] py-16 md:py-24"
    >
      <div className="mx-auto max-w-[1200px]">
        <Reveal y={40}>
          <h2 className="max-w-[22ch] text-[length:var(--text-display-s)] font-normal tracking-[var(--tracking-display)] text-[var(--color-ink)]">
            Hardware once. Visibility monthly.
          </h2>
        </Reveal>

        <RevealGroup className="mt-8 grid gap-4 md:grid-cols-2">
          {MODEL.map((part) => (
            <RevealItem key={part.title} className="paper-layer-2 p-5">
              <span className="font-mono text-[length:var(--text-xs)] tracking-[var(--tracking-label)] text-[var(--color-muted)] uppercase">
                {part.label}
              </span>
              <h3 className="mt-2 text-[length:var(--text-xl)] font-medium text-[var(--color-ink)]">
                {part.title}
              </h3>
              <p className="mt-2 max-w-[44ch] text-[var(--color-ink-2)]">
                {part.body}
              </p>
            </RevealItem>
          ))}
        </RevealGroup>

        {/* Featured tier pops forward — solid accent card, floats above its
            neighbors on desktop — modeled on Roman's pricing shot
            (collectui.com/designs/pricing-ui-design-inspiration/
            7949f513-a242-4909-8976-29d06924518f). Kept our own content: no
            fabricated dollar figures (pricing is genuinely still TBD per
            the footnote below) and no annual/monthly toggle, since Tokinomo
            doesn't have that billing split — just the layout language. */}
        <RevealGroup className="mt-16 grid items-center gap-4 lg:grid-cols-3">
          {TIERS.map((tier) => (
            <RevealItem
              key={tier.name}
              className={cn(
                "relative flex flex-col p-6",
                tier.featured
                  ? "rounded-[var(--radius-card)] bg-[var(--color-accent)] py-10 shadow-[var(--shadow-layer-lg)] lg:-my-4"
                  : "paper-layer-2",
              )}
            >
              {tier.featured ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-[var(--radius-pill)] bg-[var(--color-ink)] px-3 py-1 font-mono text-[length:var(--text-xs)] tracking-[var(--tracking-label)] whitespace-nowrap text-[var(--color-paper)] uppercase shadow-[var(--shadow-layer)]">
                  Most popular
                </span>
              ) : null}

              <h3
                className={cn(
                  "text-[length:var(--text-xl)] font-medium",
                  tier.featured ? "text-[var(--color-accent-ink)]" : "text-[var(--color-ink)]",
                )}
              >
                {tier.name}
              </h3>
              <p
                className={cn(
                  "mt-1.5 text-[length:var(--text-sm)]",
                  tier.featured ? "text-[var(--color-accent-ink)]" : "text-[var(--color-ink-2)]",
                )}
              >
                {tier.positioning}
              </p>

              <div
                className={cn(
                  "mt-5 rounded-[var(--radius-input)] border border-dashed px-3 py-2.5",
                  tier.featured ? "border-[var(--color-accent-ink)]" : "border-[var(--color-rule-2)]",
                )}
              >
                <span
                  className={cn(
                    "font-mono text-[length:var(--text-xs)] tracking-[var(--tracking-label)] uppercase",
                    tier.featured ? "text-[var(--color-accent-ink)]" : "text-[var(--color-muted)]",
                  )}
                >
                  price to be confirmed
                </span>
              </div>

              <Link
                href="/contact"
                className={cn(
                  "mt-5 inline-flex h-10 items-center justify-center rounded-[var(--radius-pill)] px-4 text-[length:var(--text-sm)] font-medium transition-[color,background-color,border-color,filter] duration-[var(--dur-micro)]",
                  tier.featured
                    ? "bg-[var(--color-accent-ink)] text-[var(--color-accent)] hover:brightness-125"
                    : "border border-[var(--color-rule-2)] text-[var(--color-ink)] hover:border-[var(--color-ink)]",
                )}
              >
                Talk to Baliyo
              </Link>

              <ul className="mt-6 flex-1 space-y-2.5">
                {tier.includes.map((item) => (
                  <li
                    key={item}
                    className={cn(
                      "flex items-start gap-2.5 text-[length:var(--text-sm)]",
                      tier.featured ? "text-[var(--color-accent-ink)]" : "text-[var(--color-ink-2)]",
                    )}
                  >
                    <Check
                      size={15}
                      className={cn(
                        "mt-0.5 shrink-0",
                        tier.featured ? "text-[var(--color-accent-ink)]" : "text-[var(--color-accent)]",
                      )}
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </RevealItem>
          ))}
        </RevealGroup>

        <Reveal delay={0.1}>
          <p className="mt-6 max-w-[64ch] text-[length:var(--text-sm)] text-[var(--color-muted)]">
            Tier pricing is being finalised against the first production run.
            Contents above describe what each tier covers; the figures come
            from us directly, per fleet size and store count.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
