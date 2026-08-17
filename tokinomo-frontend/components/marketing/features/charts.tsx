"use client";

import { useId } from "react";
import type { Bucket } from "./simulation";

/**
 * Authored SVG rather than the console's Recharts, so the marketing route does
 * not carry a charting library. Plot areas stretch with `preserveAspectRatio`
 * set to none and hold a true hairline through `vector-effect`, matching the
 * landing page's telemetry trace. Anything that must stay circular or legible
 * is HTML positioned over the plot, never a shape inside the stretched box.
 */

function pathFor(values: number[], max: number, close: boolean) {
  if (values.length === 0) return "";
  const step = 100 / Math.max(1, values.length - 1);
  const points = values.map((value, i) => {
    const x = i * step;
    const y = 100 - (value / max) * 92 - 4;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const line = `M${points.join(" L")}`;
  return close ? `${line} L100,100 L0,100 Z` : line;
}

export function PlaysDetectionsChart({ data }: { data: Bucket[] }) {
  const gradientId = useId();
  const max = Math.max(8, ...data.map((b) => Math.max(b.plays, b.detections)));
  const plays = data.map((b) => b.plays);
  const detections = data.map((b) => b.detections);
  const last = data[data.length - 1];
  const lastTop = last ? 100 - (last.plays / max) * 92 - 4 : 50;

  return (
    <figure className="m-0">
      <div className="relative h-52 w-full min-w-0">
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          role="img"
          aria-label={`Audio plays and presence detections across ${data.length} time buckets. Latest bucket: ${last?.plays ?? 0} plays, ${last?.detections ?? 0} detections.`}
        >
          {[25, 50, 75].map((y) => (
            <line
              key={y}
              x1="0"
              x2="100"
              y1={y}
              y2={y}
              stroke="var(--color-rule)"
              strokeWidth="1"
              strokeDasharray="3 4"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--color-accent)"
                stopOpacity="0.4"
              />
              <stop
                offset="100%"
                stopColor="var(--color-accent)"
                stopOpacity="0"
              />
            </linearGradient>
          </defs>
          <path d={pathFor(plays, max, true)} fill={`url(#${gradientId})`} />
          <path
            d={pathFor(plays, max, false)}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={pathFor(detections, max, false)}
            fill="none"
            stroke="var(--color-online)"
            strokeWidth="1.5"
            strokeDasharray="4 3"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {last ? (
          <span
            // Keyed on the value so a credited interaction restarts the pulse.
            key={last.plays}
            className="toki-plot-ping absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-none bg-[var(--color-accent)]"
            style={{ left: "100%", top: `${lastTop}%` }}
            aria-hidden
          />
        ) : null}
      </div>
      <div className="mt-2 flex justify-between font-mono text-[length:var(--text-xs)] text-[var(--color-muted)] tabular-nums">
        {data.map((bucket) => (
          <span key={bucket.label}>{bucket.label}</span>
        ))}
      </div>
      <figcaption className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[length:var(--text-xs)] text-[var(--color-muted)]">
        <span className="inline-flex items-center gap-2">
          <span className="h-px w-4 bg-[var(--color-accent)]" aria-hidden />
          audio plays
        </span>
        <span className="inline-flex items-center gap-2">
          <span
            className="h-px w-4 bg-[var(--color-online)] opacity-70"
            aria-hidden
          />
          presence detections
        </span>
      </figcaption>
    </figure>
  );
}

export function DwellHistogram({
  bins,
}: {
  bins: Array<{ label: string; count: number }>;
}) {
  const max = Math.max(1, ...bins.map((b) => b.count));

  return (
    <figure className="m-0">
      <div className="flex gap-2">
        {bins.map((bin) => (
          <span
            key={bin.label}
            className="min-w-0 flex-1 text-center font-mono text-[length:var(--text-xs)] text-[var(--color-ink-2)] tabular-nums"
          >
            {bin.count}
          </span>
        ))}
      </div>
      <div className="mt-1 flex h-36 gap-2">
        {bins.map((bin) => (
          <div key={bin.label} className="relative min-w-0 flex-1">
            <div
              className="toki-bar-grow absolute inset-x-0 bottom-0 top-0 bg-[var(--color-accent)]/70"
              style={{ transform: `scaleY(${bin.count / max})` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2 border-t border-[var(--color-rule)] pt-2">
        {bins.map((bin) => (
          <span
            key={bin.label}
            className="min-w-0 flex-1 truncate text-center font-mono text-[length:var(--text-xs)] text-[var(--color-muted)]"
          >
            {bin.label}
          </span>
        ))}
      </div>
      <figcaption className="mt-3 text-[length:var(--text-xs)] text-[var(--color-muted)]">
        How long shoppers stood at the shelf, bucketed. The long tail on the
        right is what a brand argues renewal from.
      </figcaption>
    </figure>
  );
}
