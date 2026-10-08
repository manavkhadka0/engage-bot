const PRESENCE_WINDOWS: Array<[number, number]> = [
  [150, 330],
  [520, 700],
  [860, 1060],
];

const AUDIO_LEAD = 24;
const BAR_STEP = 7;

function presencePath() {
  const baseline = 40;
  const plateau = 10;
  let d = `M0 ${baseline}`;
  for (const [start, end] of PRESENCE_WINDOWS) {
    d += ` H${start} V${plateau} H${end} V${baseline}`;
  }
  return `${d} H1200`;
}

function audioBars() {
  const bars: Array<{ x: number; h: number }> = [];
  let n = 0;
  for (const [start, end] of PRESENCE_WINDOWS) {
    for (let x = start + AUDIO_LEAD; x < end - 8; x += BAR_STEP) {
      const envelope = Math.sin(((x - start) / (end - start)) * Math.PI);
      const detail = 0.45 + 0.55 * Math.abs(Math.sin(n * 1.9));
      bars.push({ x, h: Math.max(3, 19 * envelope * detail) });
      n += 1;
    }
  }
  return bars;
}

function provePath() {
  const steps = [42, 32, 22, 12];
  const breaks = [340, 710, 1070];
  let d = `M0 ${steps[0]}`;
  breaks.forEach((x, i) => {
    d += ` H${x} V${steps[i + 1]}`;
  });
  return `${d} H1200`;
}

const LANES = [
  { key: "sense", label: "Sense", channel: "presence" },
  { key: "speak", label: "Speak", channel: "audio" },
  { key: "prove", label: "Prove", channel: "logged" },
];

function LaneGraphic({ lane }: { lane: string }) {
  const common = {
    viewBox: "0 0 1200 48",
    preserveAspectRatio: "none" as const,
    className: "h-11 w-full md:h-14",
    "aria-hidden": true,
  };

  if (lane === "sense") {
    return (
      <svg {...common}>
        <path
          d={presencePath()}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  }

  if (lane === "speak") {
    return (
      <svg {...common}>
        {audioBars().map((bar) => (
          <line
            key={bar.x}
            x1={bar.x}
            x2={bar.x}
            y1={24 - bar.h}
            y2={24 + bar.h}
            stroke="var(--color-online)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <line
          x1={0}
          x2={1200}
          y1={24}
          y2={24}
          stroke="var(--color-rule)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path
        d={provePath()}
        fill="none"
        stroke="var(--color-ink-2)"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function TelemetryTrace() {
  return (
    <div className="border-t border-[var(--color-rule)] bg-[var(--color-paper-2)]/60">
      <div className="page-gutter">
        <div className="relative mx-auto max-w-6xl py-5">
          <div
            className="toki-trace-marker pointer-events-none absolute inset-y-3 left-0 w-px bg-[var(--color-accent)]/70 animate-[toki-trace-sweep_9s_linear_infinite]"
            aria-hidden
          >
            <span className="absolute -top-1 -left-[3px] size-[7px] bg-[var(--color-accent)]" />
          </div>

          {LANES.map((lane) => (
            <div key={lane.key} className="flex items-center gap-4 md:gap-6">
              <div className="w-24 shrink-0 md:w-32">
                <span className="block text-[length:var(--text-sm)] font-medium text-[var(--color-ink)]">
                  {lane.label}
                </span>
                <span className="block font-mono text-[length:var(--text-xs)] tracking-[var(--tracking-label)] text-[var(--color-muted)] uppercase">
                  {lane.channel}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <LaneGraphic lane={lane.key} />
              </div>
            </div>
          ))}

          <p className="mt-3 max-w-[52ch] pl-28 text-[length:var(--text-xs)] text-[var(--color-muted)] md:pl-38">
            A shopper stops. Audio fires. The event is logged. Every plot on
            this page comes from that one causal chain.
          </p>
        </div>
      </div>
    </div>
  );
}
