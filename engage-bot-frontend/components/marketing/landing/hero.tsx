"use client";
// React Compiler (next.config.ts: reactCompiler: true) auto-memoizes based on
// static dependency analysis, which doesn't know Motion's MotionValues are
// live, subscription-driven, and intentionally mutate outside React's render
// cycle — the scroll-linked useTransform calls in this file were freezing at
// their initial-mount value (confirmed live: inline style stuck at the
// progress=0 result even as scrollYProgress kept updating correctly).
// Opting this file out of compiler memoization fixes it.
"use no memo";

import { useRef } from "react";
import Link from "next/link";
import {
  motion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";

/**
 * Scroll-driven 3-chapter narrative, modeled on Ahmet Loca's "Scrolling
 * Images" Framer component (collectui.com/designs/framer-ui-design-
 * inspiration/71b15c89-e651-4715-a3c6-e992ac853dce): a sticky panel whose
 * background crossfades between chapters as you scroll past a tall
 * container, each chapter carrying a huge translucent numeral bleeding
 * through behind the content.
 *
 * The source uses cinematic lifestyle photography for each chapter's
 * background — Engage Bot has none of that, so each chapter's visual is
 * built from material already in this app (the presence-pulse rings, the
 * audio waveform, the console mockup) instead of a photo. Copy is the
 * existing hero sentence split into its natural three beats — senses /
 * speaks / reports — not new marketing lines.
 *
 * Forced dark scope: wrapping in `.dark` reuses the app's own dark tokens
 * regardless of the site-wide theme toggle, so this stays a deliberate
 * tonal beat (dark cinematic open, light functional body after) rather
 * than depending on visitor's OS theme.
 */

const CHAPTERS = [
  {
    n: "01",
    tag: "Sense",
    headline: "A robot on the shelf senses a shopper who stops.",
  },
  {
    n: "02",
    tag: "Speak",
    headline: "It speaks your line.",
  },
  {
    n: "03",
    tag: "Prove",
    headline:
      "And reports exactly what happened — across every store, from one console.",
  },
] as const;

export function Hero() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sceneRef,
    offset: ["start start", "end end"],
  });
  const scrollHintOpacity = useTransform(scrollYProgress, [0, 0.06], [1, 0]);

  return (
    <section
      ref={sceneRef}
      className="dark relative"
      style={{ height: `${CHAPTERS.length * 100}vh` }}
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-[var(--color-paper)]">
        {CHAPTERS.map((chapter, i) => (
          <ChapterLayer
            key={chapter.n}
            index={i}
            total={CHAPTERS.length}
            progress={scrollYProgress}
            chapter={chapter}
          />
        ))}

        {/* Scroll hint — only meaningful before the sequence has moved */}
        <motion.div
          style={{ opacity: scrollHintOpacity }}
          className="absolute inset-x-0 bottom-8 flex flex-col items-center gap-2"
        >
          <span className="font-mono text-[length:var(--text-xs)] tracking-[var(--tracking-label)] text-[var(--color-muted)] uppercase">
            Scroll
          </span>
          <motion.span
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            className="h-8 w-px bg-[var(--color-rule-2)]"
          />
        </motion.div>
      </div>
    </section>
  );
}

function ChapterLayer({
  index,
  total,
  progress,
  chapter,
}: {
  index: number;
  total: number;
  progress: MotionValue<number>;
  chapter: (typeof CHAPTERS)[number];
}) {
  const isFirst = index === 0;
  const isLast = index === total - 1;

  const step = 1 / total;
  const start = index * step;
  const end = (index + 1) * step;
  const fade = step * 0.28;
  const inPoint = start + fade;
  const outPoint = end - fade;

  // Manual piecewise functions instead of useTransform's array-interpolation
  // form: that version reproducibly froze at each chapter's progress=0
  // result (confirmed live — inline opacity stuck at 1/0/0 while the
  // underlying scrollYProgress motion value kept updating correctly), on
  // both with and without the React Compiler opted out via "use no memo"
  // above, so root cause wasn't pinned down. This form is unambiguous and
  // was verified against direct on-page opacity readouts across the full
  // scroll range before shipping.
  const opacity = useTransform(progress, (p) => {
    if (p <= start) return isFirst ? 1 : 0;
    if (p < inPoint) return isFirst ? 1 : (p - start) / fade;
    if (p <= outPoint) return 1;
    if (p < end) return isLast ? 1 : 1 - (p - outPoint) / fade;
    return isLast ? 1 : 0;
  });
  const rise = useTransform(progress, (p) => {
    const from = isFirst ? 0 : 24;
    if (p <= start) return from;
    if (p >= inPoint) return 0;
    return from - (from * (p - start)) / fade;
  });
  const numeralScale = useTransform(progress, (p) => {
    const from = isFirst ? 1 : 0.94;
    if (p <= start) return from;
    if (p >= inPoint) return 1;
    return from + ((1 - from) * (p - start)) / fade;
  });

  return (
    <motion.div
      style={{ opacity }}
      className="absolute inset-0 flex items-center justify-center page-gutter"
    >
      {/* Oversized numeral bleeding through — the source's signature move */}
      <motion.span
        aria-hidden
        style={{ scale: numeralScale }}
        className="pointer-events-none absolute font-[var(--font-display)] text-[26vw] leading-none font-light text-[var(--color-ink)] opacity-[0.06] select-none"
      >
        {chapter.n}
      </motion.span>

      <div className="relative mx-auto grid w-full max-w-[1200px] items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <motion.div style={{ y: rise }} className="min-w-0">
          {isFirst ? (
            <p className="text-[length:var(--text-sm)] font-medium tracking-[var(--tracking-body)] text-[var(--color-muted)]">
              Engage Bot
            </p>
          ) : null}

          <div className="mt-3 flex items-center gap-3">
            <span className="font-mono text-[length:var(--text-xs)] tracking-[var(--tracking-label)] text-[var(--color-accent)]">
              {chapter.n}
            </span>
            <span className="h-px w-8 bg-[var(--color-rule-2)]" />
            <span className="font-mono text-[length:var(--text-xs)] tracking-[var(--tracking-label)] text-[var(--color-muted)] uppercase">
              {chapter.tag}
            </span>
          </div>

          <h1 className="mt-4 max-w-[16ch] text-[length:var(--text-display)] font-normal tracking-[var(--tracking-display)] text-[var(--color-ink)]">
            {chapter.headline}
          </h1>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}>
              <Link
                href="/contact"
                className="inline-flex h-11 items-center rounded-[var(--radius-pill)] bg-[var(--color-accent)] px-6 text-[length:var(--text-sm)] font-medium text-[var(--color-accent-ink)] shadow-[var(--shadow-layer)] transition-[filter] duration-[var(--dur-micro)] hover:brightness-105"
              >
                Book a demo
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}>
              <Link
                href="/features"
                className="inline-flex h-11 items-center rounded-[var(--radius-pill)] border border-[var(--color-rule-2)] px-6 text-[length:var(--text-sm)] text-[var(--color-ink)] transition-colors duration-[var(--dur-micro)] hover:border-[var(--color-ink)]"
              >
                Drive the sandbox
              </Link>
            </motion.div>
          </motion.div>

          {isFirst ? (
            <p className="mt-8 font-mono text-[length:var(--text-xs)] tracking-[var(--tracking-label)] text-[var(--color-neutral)] uppercase">
              By Baliyo Ventures · Flexi line · Kathmandu
            </p>
          ) : null}
        </motion.div>

        <motion.div style={{ y: rise }} className="relative mx-auto aspect-square w-full max-w-sm">
          {chapter.tag === "Sense" ? <SenseVisual /> : null}
          {chapter.tag === "Speak" ? <SpeakVisual /> : null}
          {chapter.tag === "Prove" ? <ProveVisual /> : null}
        </motion.div>
      </div>
    </motion.div>
  );
}

function SenseVisual() {
  return (
    <div className="relative flex h-full w-full items-center justify-center">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="absolute rounded-full border-[1.5px] border-[var(--color-accent)]"
          style={{ width: 90, height: 90 }}
          initial={{ scale: 1, opacity: 0.55 }}
          animate={{ scale: 3.6, opacity: 0 }}
          transition={{
            duration: 3,
            ease: "circOut",
            repeat: Infinity,
            delay: i * 1,
          }}
        />
      ))}
      <span className="absolute size-[240px] rounded-full border border-[var(--color-rule)]" />
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        className="relative flex size-20 items-center justify-center rounded-[24px] bg-[var(--color-accent)] shadow-[var(--shadow-layer-lg)]"
      >
        <span className="grid grid-cols-3 gap-1.5">
          {Array.from({ length: 9 }, (_, i) => (
            <span
              key={i}
              className="size-1.5 rounded-full bg-[var(--color-accent-ink)]"
              style={{ opacity: 0.5 }}
            />
          ))}
        </span>
      </motion.div>
    </div>
  );
}

function SpeakVisual() {
  // Rounded to 4 decimals so server and client render byte-identical
  // strings — raw Math.sin() output can differ in its last bits between
  // Node's SSR pass and the browser's JS engine, which React's hydration
  // check treats as a real mismatch even though it's visually nothing.
  const bars = Array.from({ length: 28 }, (_, i) => {
    const envelope = Math.round(Math.sin((i / 27) * Math.PI) * 10000) / 10000;
    return Math.max(0.12, envelope);
  });

  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex h-24 items-center gap-1.5">
        {bars.map((h, i) => (
          <motion.span
            key={i}
            className="w-1.5 rounded-full bg-[var(--color-accent)]"
            style={{ height: `${h * 100}%`, opacity: 0.3 + h * 0.6 }}
            animate={{ scaleY: [0.4, 1, 0.4] }}
            transition={{
              duration: 1.1 + (i % 5) * 0.15,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.04,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function ProveVisual() {
  const rows = [
    { label: "TKN-0A31-0117", state: "acked" },
    { label: "TKN-0A31-0118", state: "acked" },
    { label: "TKN-0A31-0124", state: "sent" },
  ];

  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="w-full max-w-xs rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper-2)]/60 p-4 shadow-[var(--shadow-layer-lg)] backdrop-blur">
        <span className="font-mono text-[length:var(--text-xs)] tracking-[var(--tracking-label)] text-[var(--color-muted)] uppercase">
          fleet
        </span>
        <ul className="mt-3 space-y-2.5">
          {rows.map((row, i) => (
            <motion.li
              key={row.label}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 * i, duration: 0.4 }}
              className="flex items-center justify-between gap-3 font-mono text-[length:var(--text-sm)]"
            >
              <span className="text-[var(--color-ink)]">{row.label}</span>
              <span className="flex items-center gap-1.5 text-[var(--color-ink-2)]">
                <span
                  className={
                    "size-1.5 rounded-full " +
                    (row.state === "acked"
                      ? "bg-[var(--color-online)]"
                      : "bg-[var(--color-accent)]")
                  }
                />
                {row.state}
              </span>
            </motion.li>
          ))}
        </ul>
      </div>
    </div>
  );
}
