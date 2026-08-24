"use client";

import { useEffect, useState } from "react";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/motion/reveal";
import { ConsolePreview } from "./console-preview";

/* ---------------------------------------------------------------- demos --- */

function ShelfReactionDemo() {
  const cans = [70, 108, 146];

  return (
    <div className="paper-layer p-4">
      <svg
        viewBox="0 0 480 280"
        className="mx-auto h-auto w-full max-w-[36rem]"
        role="img"
        aria-label="A shelf-mounted unit grips a product, swings it forward, lights up and emits audio when a shopper stops nearby."
      >
        {/* shelf */}
        <rect
          x={24}
          y={214}
          width={432}
          height={7}
          fill="var(--color-rule-2)"
          opacity={0.7}
        />
        <line
          x1={24}
          x2={456}
          y1={221}
          y2={221}
          stroke="var(--color-rule)"
          strokeWidth={1}
        />

        {/* idle products */}
        {cans.map((x) => (
          <g key={x}>
            <rect
              x={x}
              y={160}
              width={26}
              height={54}
              rx={5}
              fill="var(--color-paper-3)"
              stroke="var(--color-rule-2)"
              strokeWidth={1}
            />
            <rect
              x={x}
              y={176}
              width={26}
              height={9}
              fill="var(--color-rule-2)"
              opacity={0.5}
            />
          </g>
        ))}

        {/* device body mounted at the shelf edge */}
        <rect
          x={196}
          y={150}
          width={44}
          height={64}
          rx={7}
          fill="var(--color-paper-3)"
          stroke="var(--color-rule-2)"
          strokeWidth={1.25}
        />
        <rect
          x={205}
          y={138}
          width={26}
          height={16}
          rx={4}
          fill="var(--color-paper-3)"
          stroke="var(--color-rule-2)"
          strokeWidth={1.25}
        />
        {/* sensor eye */}
        <rect x={214} y={143} width={8} height={6} fill="var(--color-accent)" />

        {/* arm reaching out to the featured product */}
        <path
          d="M240 168 L286 158"
          stroke="var(--color-rule-2)"
          strokeWidth={7}
          strokeLinecap="round"
        />

        {/* featured product, swung forward */}
        <g transform="rotate(-14 300 186)">
          <rect
            x={287}
            y={150}
            width={28}
            height={58}
            rx={5}
            fill="var(--color-paper-2)"
            stroke="var(--color-accent)"
            strokeWidth={1.5}
          />
          <rect
            x={287}
            y={167}
            width={28}
            height={10}
            fill="var(--color-accent)"
            opacity={0.5}
          />
        </g>

        {/* motion arcs behind the swing */}
        {[0, 1].map((i) => (
          <path
            key={i}
            d={`M${268 + i * 9} ${214 - i * 4} Q${282 + i * 9} ${188 - i * 6} ${
              276 + i * 9
            } ${152 - i * 6}`}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth={1}
            opacity={0.34 - i * 0.12}
            strokeDasharray="3 5"
          />
        ))}

        {/* light spill from the unit */}
        {[-18, 0, 18].map((angle) => (
          <line
            key={angle}
            x1={218}
            y1={140}
            x2={218 + angle * 1.5}
            y2={104}
            stroke="var(--color-accent)"
            strokeWidth={1}
            opacity={0.32}
          />
        ))}

        {/* audio arcs toward the aisle */}
        {[0, 1, 2].map((i) => (
          <path
            key={i}
            d={`M${352 + i * 22} ${142 - i * 12} A ${40 + i * 22} ${
              40 + i * 22
            } 0 0 1 ${352 + i * 22} ${218 + i * 12}`}
            fill="none"
            stroke="var(--color-online)"
            strokeWidth={1.4}
            opacity={0.6 - i * 0.16}
          />
        ))}
      </svg>
    </div>
  );
}

function PresenceSensingDemo() {
  const ticks = [
    { x: 148, label: "1m" },
    { x: 226, label: "2m" },
    { x: 304, label: "3m" },
    { x: 382, label: "4m" },
  ];

  return (
    <div className="paper-layer p-4">
      <svg
        viewBox="0 0 480 230"
        className="mx-auto h-auto w-full max-w-[36rem]"
        role="img"
        aria-label="A millimetre-wave sensor measures a shopper's presence and distance at the shelf, without any camera."
      >
        {/* sensor */}
        <rect
          x={44}
          y={104}
          width={30}
          height={22}
          rx={4}
          fill="var(--color-paper-3)"
          stroke="var(--color-rule-2)"
          strokeWidth={1.25}
        />
        <rect x={70} y={112} width={7} height={6} fill="var(--color-accent)" />

        {/* radar arcs, reaching out to the shopper's standing distance */}
        {[0, 1, 2, 3].map((i) => {
          const reach = 85 + i * 80;
          const spread = 32 + i * 13;
          return (
            <path
              key={i}
              d={`M77 ${112 - spread} A ${reach} ${spread} 0 0 1 77 ${
                112 + spread
              }`}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth={1.25}
              opacity={0.5 - i * 0.09}
            />
          );
        })}

        {/* distance baseline + ticks */}
        <line
          x1={77}
          x2={430}
          y1={186}
          y2={186}
          stroke="var(--color-rule)"
          strokeWidth={1}
        />
        {ticks.map((tick) => (
          <g key={tick.label}>
            <line
              x1={tick.x}
              x2={tick.x}
              y1={182}
              y2={190}
              stroke="var(--color-rule-2)"
              strokeWidth={1}
            />
            <text
              x={tick.x}
              y={206}
              textAnchor="middle"
              fill="var(--color-muted)"
              style={{ font: "500 10px var(--font-mono)" }}
            >
              {tick.label}
            </text>
          </g>
        ))}

        {/* flat shopper silhouette, standing still */}
        <g fill="var(--color-ink-2)" opacity={0.82}>
          <circle cx={392} cy={74} r={13} />
          <path d="M392 90 C374 90 366 102 366 120 L366 176 L378 176 L380 138 L404 138 L406 176 L418 176 L418 120 C418 102 410 90 392 90 Z" />
        </g>

        {/* dwell readout */}
        <rect
          x={300}
          y={30}
          width={150}
          height={30}
          rx={6}
          fill="var(--color-paper-3)"
          stroke="var(--color-rule)"
          strokeWidth={1}
        />
        <rect x={311} y={41} width={8} height={8} fill="var(--color-online)" />
        <text
          x={327}
          y={49}
          fill="var(--color-ink-2)"
          style={{ font: "500 11px var(--font-mono)" }}
        >
          dwell 2.4s
        </text>
      </svg>
    </div>
  );
}

const PUSH_ROWS = [
  { serial: "TKN-0A31-0117", state: "acked", tone: "online", at: "12:04:09" },
  { serial: "TKN-0A31-0118", state: "acked", tone: "online", at: "12:04:11" },
  { serial: "TKN-0A31-0124", state: "sent", tone: "accent", at: "12:04:14" },
  { serial: "TKN-0A31-0131", state: "queued", tone: "muted", at: "—" },
];

function AudioPushDemo() {
  const bars = Array.from({ length: 68 }, (_, i) => {
    const envelope = Math.sin((i / 67) * Math.PI);
    const detail = 0.35 + 0.65 * Math.abs(Math.sin(i * 2.3));
    return Math.max(2, 26 * envelope * detail);
  });

  const toneClass: Record<string, string> = {
    online: "bg-[var(--color-online)]",
    accent: "bg-[var(--color-accent)]",
    muted: "bg-[var(--color-offline)]",
  };

  return (
    <div>
      <div className="paper-layer p-4">
        <span className="font-mono text-[length:var(--text-xs)] tracking-[var(--tracking-label)] text-[var(--color-muted)] uppercase">
          diwali-promo-01.wav
        </span>
        <svg
          viewBox="0 0 480 64"
          preserveAspectRatio="none"
          className="mt-3 h-16 w-full"
          aria-hidden
        >
          {bars.map((h, i) => (
            <line
              key={i}
              x1={4 + i * 7}
              x2={4 + i * 7}
              y1={32 - h}
              y2={32 + h}
              stroke="var(--color-accent)"
              strokeWidth={2}
              opacity={0.85}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
      </div>

      <ul className="mt-3 divide-y divide-[var(--color-rule)] rounded-[var(--radius-card)] border border-[var(--color-rule)] px-4">
        {PUSH_ROWS.map((row) => (
          <li
            key={row.serial}
            className="flex items-center justify-between gap-3 py-2.5"
          >
            <span className="truncate font-mono text-[length:var(--text-sm)] text-[var(--color-ink)]">
              {row.serial}
            </span>
            <span className="flex shrink-0 items-center gap-3 font-mono text-[length:var(--text-sm)]">
              <span className="flex items-center gap-2 text-[var(--color-ink-2)]">
                <span className={cn("size-2 shrink-0", toneClass[row.tone])} />
                {row.state}
              </span>
              <span className="w-[6.5ch] text-right text-[var(--color-muted)] tabular-nums">
                {row.at}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const DEVICE_STATES = [
  {
    state: "online",
    tone: "bg-[var(--color-online)]",
    meaning: "Reporting in, running its loop.",
  },
  {
    state: "offline",
    tone: "bg-[var(--color-offline)]",
    meaning: "Stopped checking in. Power or Wi-Fi, and we go look.",
  },
  {
    state: "provisioning",
    tone: "bg-[var(--color-warn)]",
    meaning: "Registered, waiting to be assigned to a shelf.",
  },
  {
    state: "unassigned",
    tone: "bg-[var(--color-offline)]",
    meaning: "In inventory, not yet given to a brand.",
  },
  {
    state: "error",
    tone: "bg-[var(--color-danger)]",
    meaning: "Reporting a fault it cannot clear itself.",
  },
];

function DeviceStatesDemo() {
  return (
    <ul className="divide-y divide-[var(--color-rule)] rounded-[var(--radius-card)] border border-[var(--color-rule)] px-4">
      {DEVICE_STATES.map((row) => (
        <li key={row.state} className="flex items-start gap-3 py-3">
          <span className={cn("mt-1.5 size-2 shrink-0", row.tone)} />
          <div className="min-w-0">
            <span className="block font-mono text-[length:var(--text-sm)] text-[var(--color-ink)]">
              {row.state}
            </span>
            <span className="block text-[length:var(--text-sm)] text-[var(--color-muted)]">
              {row.meaning}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function CapturesList() {
  const captures = [
    "Somebody is there",
    "How far away they are",
    "How long they stayed",
  ];
  const refuses = [
    "No camera, no images, no video",
    "No microphone, no recording",
    "No faces, no identity, no tracking between visits",
  ];

  return (
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <div className="paper-layer p-4">
        <span className="font-mono text-[length:var(--text-xs)] tracking-[var(--tracking-label)] text-[var(--color-muted)] uppercase">
          what it measures
        </span>
        <ul className="mt-3 space-y-2">
          {captures.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2 text-[length:var(--text-sm)] text-[var(--color-ink-2)]"
            >
              <Check
                className="mt-0.5 size-4 shrink-0 text-[var(--color-online)]"
                aria-hidden
              />
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div className="paper-layer p-4">
        <span className="font-mono text-[length:var(--text-xs)] tracking-[var(--tracking-label)] text-[var(--color-muted)] uppercase">
          what it cannot
        </span>
        <ul className="mt-3 space-y-2">
          {refuses.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2 text-[length:var(--text-sm)] text-[var(--color-ink-2)]"
            >
              <Minus
                className="mt-0.5 size-4 shrink-0 text-[var(--color-muted)]"
                aria-hidden
              />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- objections --- */

const OBJECTIONS = [
  {
    id: "notice",
    n: "01",
    rail: "Will anyone notice it?",
    question: "Will anyone actually notice it?",
    lede: "The unit grips your product, swings it forward, lights up and speaks the moment somebody stops in front of it. On a shelf where nothing else moves, motion is the whole argument.",
    demo: <ShelfReactionDemo />,
    extra: null,
  },
  {
    id: "privacy",
    n: "02",
    rail: "Is it filming shoppers?",
    question: "Are you filming my shoppers?",
    lede: "No. There is no camera and no microphone. A 24 GHz millimetre-wave sensor measures presence and distance, which is enough to know that somebody stopped and for how long — and nothing else. It reads a person standing perfectly still, which a motion sensor cannot, and it is unaffected by store lighting, heat or dust.",
    demo: <PresenceSensingDemo />,
    extra: <CapturesList />,
  },
  {
    id: "campaign",
    n: "03",
    rail: "Can I change the audio?",
    question: "Can I change the campaign without visiting every store?",
    lede: "Upload a clip, choose the devices, push. Each unit acknowledges the push on its own, so swapping a festival message across a fleet is a state you watch rather than a trip you make.",
    demo: <AudioPushDemo />,
    extra: null,
  },
  {
    id: "breaks",
    n: "04",
    rail: "What if one breaks?",
    question: "What happens when a unit goes dark?",
    lede: "Every device checks in continuously, so silence is itself a signal. Baliyo watches the whole fleet across every brand, which means a dead unit surfaces on our side before you spot it on the shelf.",
    demo: <DeviceStatesDemo />,
    extra: null,
  },
  {
    id: "proof",
    n: "05",
    rail: "How do I prove it worked?",
    question: "How do I know any of it worked?",
    lede: "Dwell events, audio plays and uptime roll into your own workspace, scoped so you only ever see your own fleet. When the spend comes up for renewal, you bring figures instead of an anecdote.",
    demo: <ConsolePreview />,
    extra: null,
  },
];

export function Objections() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    let frame = 0;

    // Derived from scroll position rather than IntersectionObserver entries:
    // observer callbacks only report *changed* entries, so a jump (an anchor
    // click on the rail itself) can leave the rail pointing at a stale section.
    const measure = () => {
      frame = 0;
      // Sits below the sticky nav and the anchor scroll-margin, so an anchor
      // jump lands inside the section it points at even on short viewports.
      const line = Math.max(180, window.innerHeight * 0.35);
      let next = 0;
      OBJECTIONS.forEach((item, i) => {
        const node = document.getElementById(item.id);
        if (node && node.getBoundingClientRect().top <= line) next = i;
      });
      setActive(next);
    };

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(measure);
    };

    measure();

    // Two triggers, one decision. Scroll covers continuous reading and is
    // frame-throttled; the observer covers scroll-less position changes
    // (anchor jumps, restored offsets, layout shifts) and calls measure
    // directly, since observer callbacks are already batched by the browser
    // and a frame callback never arrives in a throttled or unfocused tab.
    const observer = new IntersectionObserver(measure, {
      threshold: [0, 0.05, 0.25, 0.5, 0.75, 1],
    });
    OBJECTIONS.forEach((item) => {
      const node = document.getElementById(item.id);
      if (node) observer.observe(node);
    });

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section
      id="answers"
      aria-label="Answers to the questions buyers ask"
      className="page-gutter border-t border-[var(--color-rule)] py-16 md:py-24"
    >
      <div className="mx-auto max-w-6xl">
        {/* Mobile progress strip */}
        <div className="sticky top-16 z-10 -mx-[var(--page-gutter)] mb-8 flex items-center gap-3 border-b border-[var(--color-rule)] bg-[var(--color-paper)]/95 px-[var(--page-gutter)] py-2.5 backdrop-blur md:hidden">
          <span className="font-mono text-[length:var(--text-xs)] tracking-[var(--tracking-label)] text-[var(--color-accent)]">
            {OBJECTIONS[active].n}
            <span className="text-[var(--color-muted)]">/05</span>
          </span>
          <span className="truncate text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
            {OBJECTIONS[active].rail}
          </span>
        </div>

        <div className="md:grid md:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] md:gap-10 lg:gap-16">
          {/* Sticky rail */}
          <div className="hidden md:block">
            <nav
              aria-label="Questions on this page"
              className="sticky top-28 border-l border-[var(--color-rule)]"
            >
              {OBJECTIONS.map((item, i) => {
                const isActive = i === active;
                return (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    aria-current={isActive ? "true" : undefined}
                    className={cn(
                      "group relative flex gap-3 py-3 pl-4 transition-colors duration-[var(--dur-micro)]",
                      isActive
                        ? "text-[var(--color-accent)]"
                        : "text-[var(--color-muted)] hover:text-[var(--color-ink-2)]",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-1/2 -left-px size-2 -translate-x-1/2 -translate-y-1/2 transition-opacity",
                        isActive
                          ? "bg-[var(--color-accent)] opacity-100"
                          : "bg-[var(--color-rule-2)] opacity-0 group-hover:opacity-100",
                      )}
                      aria-hidden
                    />
                    <span className="font-mono text-[length:var(--text-xs)] tracking-[var(--tracking-label)]">
                      {item.n}
                    </span>
                    <span className="text-[length:var(--text-sm)] leading-snug">
                      {item.rail}
                    </span>
                  </a>
                );
              })}
            </nav>
          </div>

          {/* Answers */}
          <div className="min-w-0 space-y-20 md:space-y-28">
            {OBJECTIONS.map((item) => (
              <Reveal key={item.id} as="div" y={40}>
                <article id={item.id} className="scroll-mt-28">
                  <span className="font-mono text-[length:var(--text-xs)] tracking-[var(--tracking-label)] text-[var(--color-accent)]">
                    {item.n}
                  </span>
                  <h2 className="mt-2 max-w-[24ch] text-[length:var(--text-display-s)] font-normal tracking-[var(--tracking-display)] text-[var(--color-ink)]">
                    {item.question}
                  </h2>
                  <p className="mt-4 max-w-[52ch] text-[length:var(--text-lg)] text-[var(--color-ink-2)]">
                    {item.lede}
                  </p>
                  {item.extra}
                  <div className="mt-8">{item.demo}</div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
