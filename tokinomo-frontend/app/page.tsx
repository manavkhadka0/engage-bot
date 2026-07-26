import Link from "next/link";
import {
  TerminalFooter,
  TerminalNav,
} from "@/components/marketing/terminal-chrome";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const workbenchSteps = [
  {
    cmd: "$ tokinomo tenants create --slug xtreme",
    caption: "Platform: provision a brand workspace and brand admin.",
    lines: [
      "✓ organization created",
      "✓ BRAND_ADMIN invited",
      "→ /admin/tenants",
    ],
  },
  {
    cmd: "$ tokinomo devices assign --serial TK-0042 --tenant xtreme",
    caption: "Platform: register hardware, assign to tenant + store.",
    lines: [
      "serial: TK-0042",
      "status: PROVISIONING → ONLINE",
      "tenant: xtreme",
    ],
  },
  {
    cmd: "$ tokinomo fleet --tenant xtreme",
    caption: "Brand: live status, detections, plays — no refresh required.",
    lines: [
      "online  12",
      "offline  1",
      "plays today  438",
    ],
  },
];

export default function HomePage() {
  return (
    <>
      <TerminalNav />
      <main className="flex-1">
        <section className="page-gutter border-b border-[var(--color-rule)] pt-14 pb-16 md:pt-20 md:pb-24">
          <p className="term-fade font-mono text-[var(--text-sm)] text-[var(--color-muted)]">
            baliyo://fleet
          </p>
          <h1 className="term-fade mt-4 max-w-[18ch] text-[length:var(--text-display)] text-[var(--color-ink)]">
            Tokinomo
          </h1>
          <p className="term-fade mt-5 max-w-[42ch] text-[var(--text-lg)] text-[var(--color-ink-2)]">
            Shelf robots that detect dwell, play the right clip, and report what
            happened — one console for Baliyo, one workspace per brand.
          </p>
          <div className="term-fade mt-8 flex flex-wrap gap-3">
            <Link href="/login" className={cn(buttonVariants({ size: "lg" }))}>
              Open console →
            </Link>
            <Link
              href="/features"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              Features
            </Link>
          </div>
        </section>

        <section className="page-gutter section-gap space-y-10">
          <div>
            <h2 className="text-[length:var(--text-display-s)] text-[var(--color-ink)]">
              Workbench
            </h2>
            <p className="mt-2 max-w-[55ch] text-[var(--color-muted)]">
              Three commands from empty rack to live fleet.
            </p>
          </div>

          <div className="space-y-8">
            {workbenchSteps.map((step, i) => (
              <figure
                key={step.cmd}
                className="term-fade border border-[var(--color-rule)] bg-[var(--color-paper-2)]"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <figcaption className="border-b border-[var(--color-rule)] px-4 py-2 text-[var(--text-sm)] text-[var(--color-muted)]">
                  {step.caption}
                </figcaption>
                <pre className="overflow-x-auto p-4 text-[var(--text-sm)] leading-relaxed text-[var(--color-ink-2)]">
                  <span className="text-[var(--color-accent)]">{step.cmd}</span>
                  {"\n"}
                  {step.lines.map((line) => (
                    <span key={line}>
                      {line}
                      {"\n"}
                    </span>
                  ))}
                </pre>
              </figure>
            ))}
          </div>
        </section>

        <section className="page-gutter border-y border-[var(--color-rule)] py-14">
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <h2 className="text-[length:var(--text-xl)] text-[var(--color-accent)]">
                Platform
              </h2>
              <p className="mt-3 max-w-[40ch] text-[var(--color-ink-2)]">
                PLATFORM_OWNER and PLATFORM_OPERATOR create tenants, provision
                devices, and watch every fleet.
              </p>
              <Link
                href="/login"
                className="mt-4 inline-block text-[var(--color-ink)] underline underline-offset-4 hover:text-[var(--color-accent)]"
              >
                → /admin
              </Link>
            </div>
            <div>
              <h2 className="text-[length:var(--text-xl)] text-[var(--color-accent)]">
                Brand
              </h2>
              <p className="mt-3 max-w-[40ch] text-[var(--color-ink-2)]">
                BRAND_ADMIN, BRAND_STAFF, and BRAND_VIEWER run their own devices,
                audio pushes, and analytics — nothing crosses tenants.
              </p>
              <Link
                href="/login"
                className="mt-4 inline-block text-[var(--color-ink)] underline underline-offset-4 hover:text-[var(--color-accent)]"
              >
                → /app/[tenant]
              </Link>
            </div>
          </div>
        </section>

        <aside className="page-gutter sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-rule)] bg-[var(--color-paper)]/95 py-3 backdrop-blur-sm">
          <p className="text-[var(--text-sm)] text-[var(--color-muted)]">
            Ready to provision the next brand?
          </p>
          <Link href="/login" className={cn(buttonVariants())}>
            Sign in →
          </Link>
        </aside>
      </main>
      <TerminalFooter />
    </>
  );
}
