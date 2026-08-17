import Link from "next/link";
import { cn } from "@/lib/utils";

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
      <div className="mx-auto max-w-6xl">
        <h2 className="max-w-[22ch] text-[length:var(--text-display-s)] font-semibold text-[var(--color-ink)]">
          Hardware once. Visibility monthly.
        </h2>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {MODEL.map((part) => (
            <div
              key={part.title}
              className="paper-layer-2 p-5"
            >
              <span className="font-mono text-[length:var(--text-xs)] tracking-[var(--tracking-label)] text-[var(--color-muted)] uppercase">
                {part.label}
              </span>
              <h3 className="mt-2 text-[length:var(--text-xl)] font-semibold text-[var(--color-ink)]">
                {part.title}
              </h3>
              <p className="mt-2 max-w-[44ch] text-[var(--color-ink-2)]">
                {part.body}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={cn(
                "flex flex-col paper-layer-2 p-5",
                tier.featured
                  ? "border-[var(--color-accent)] shadow-[var(--shadow-layer-lg)]"
                  : "",
              )}
            >
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-[length:var(--text-xl)] font-semibold text-[var(--color-ink)]">
                  {tier.name}
                </h3>
                {tier.featured ? (
                  <span className="shrink-0 rounded-[var(--radius-pill)] bg-[var(--color-accent)] px-2.5 py-0.5 font-mono text-[length:var(--text-xs)] tracking-[var(--tracking-label)] text-[var(--color-accent-ink)] uppercase">
                    we recommend
                  </span>
                ) : null}
              </div>
              <p className="mt-1.5 text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
                {tier.positioning}
              </p>

              <div className="mt-5 rounded-[var(--radius-input)] border border-dashed border-[var(--color-rule-2)] px-3 py-2.5">
                <span className="font-mono text-[length:var(--text-xs)] tracking-[var(--tracking-label)] text-[var(--color-muted)] uppercase">
                  price to be confirmed
                </span>
              </div>

              <ul className="mt-5 flex-1 space-y-2.5">
                {tier.includes.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 text-[length:var(--text-sm)] text-[var(--color-ink-2)]"
                  >
                    <span
                      className="mt-[0.45rem] size-1.5 shrink-0 bg-[var(--color-accent)]"
                      aria-hidden
                    />
                    {item}
                  </li>
                ))}
              </ul>

              <Link
                href="/contact"
                className={cn(
                  "mt-6 inline-flex h-10 items-center justify-center rounded-[var(--radius-pill)] border px-4 text-[length:var(--text-sm)] font-medium transition-[color,background-color,border-color,filter] duration-[var(--dur-micro)]",
                  tier.featured
                    ? "border-transparent bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:brightness-110"
                    : "border-[var(--color-rule-2)] text-[var(--color-ink)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]",
                )}
              >
                Talk to Baliyo
              </Link>
            </div>
          ))}
        </div>

        <p className="mt-6 max-w-[64ch] text-[length:var(--text-sm)] text-[var(--color-muted)]">
          Tier pricing is being finalised against the first production run.
          Contents above describe what each tier covers; the figures come from
          us directly, per fleet size and store count.
        </p>
      </div>
    </section>
  );
}
