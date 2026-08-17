"use client";

import { DETECT_RANGE_M, SENSOR_RANGE_M } from "./simulation";

/**
 * Side elevation of one shelf. The landing page already shows presence as a
 * top-down field; this is the other projection, and it is the one that can show
 * the mechanism the product is named for — the unit swinging the pack forward as
 * it speaks. Floor distances are to scale against the ruler; the unit and the
 * pack are drawn larger than life, because at true scale a 250 ml can beside a
 * person is a few pixels and the mechanism is the whole point of the drawing.
 */

const SHELF_X = 306;
const FLOOR_Y = 172;
const METRE = 38;

/** Tight crop: the drawing carries no empty margin to spend at this size. */
const VIEW = { x: 72, y: 32, w: 268, h: 152 };

function shopperX(distanceM: number) {
  return SHELF_X - 26 - distanceM * METRE;
}

/** Viewbox x to a percentage of the rendered width, for HTML overlaid labels. */
function percentX(x: number) {
  return ((x - VIEW.x) / VIEW.w) * 100;
}

export function ShelfDiagram({
  distanceM,
  detected,
  speaking,
}: {
  distanceM: number;
  detected: boolean;
  speaking: boolean;
}) {
  const x = shopperX(distanceM);
  const coneEdge = shopperX(SENSOR_RANGE_M);
  const detectEdge = shopperX(DETECT_RANGE_M);

  return (
    <div className="w-full">
      <svg
        viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Shelf elevation. Shopper standing ${distanceM.toFixed(1)} metres from the shelf. Presence ${detected ? "detected" : "not detected"}. Unit ${speaking ? "playing audio" : "idle"}.`}
      >
        {/* Sensor field: the rated range, then the band that counts as a stop. */}
      <path
        d={`M${SHELF_X - 34},${FLOOR_Y - 58} L${coneEdge},${FLOOR_Y - 100} L${coneEdge},${FLOOR_Y} L${SHELF_X - 34},${FLOOR_Y} Z`}
        fill="var(--color-accent)"
        opacity="0.05"
      />
      <path
        d={`M${SHELF_X - 34},${FLOOR_Y - 58} L${detectEdge},${FLOOR_Y - 74} L${detectEdge},${FLOOR_Y} L${SHELF_X - 34},${FLOOR_Y} Z`}
          fill="var(--color-accent)"
          opacity={detected ? 0.16 : 0.07}
          style={{ transition: "opacity var(--dur-short) var(--ease-out)" }}
        />
      <line
        x1={detectEdge}
        y1={FLOOR_Y - 74}
        x2={detectEdge}
        y2={FLOOR_Y}
          stroke="var(--color-accent)"
          strokeWidth="1"
          strokeDasharray="3 3"
          opacity="0.5"
        />

        {/* Floor and its ruler. */}
      <line
        x1={shopperX(SENSOR_RANGE_M) - 12}
        y1={FLOOR_Y}
        x2={SHELF_X}
        y2={FLOOR_Y}
        stroke="var(--color-rule-2)"
        strokeWidth="1"
      />
        {Array.from({ length: SENSOR_RANGE_M + 1 }, (_, m) => (
          <line
            key={m}
            x1={shopperX(m)}
            y1={FLOOR_Y}
            x2={shopperX(m)}
            y2={FLOOR_Y + 5}
            stroke="var(--color-rule-2)"
            strokeWidth="1"
          />
        ))}

        {/* Shelf board and upright. */}
        <rect
          x={SHELF_X - 4}
          y={FLOOR_Y - 130}
          width="4"
          height="130"
          fill="var(--color-paper-3)"
        />
        <rect
          x={SHELF_X - 46}
          y={FLOOR_Y - 46}
          width="46"
          height="4"
          fill="var(--color-rule-2)"
        />

      {/* The unit, and the pack it grips. */}
      <rect
        x={SHELF_X - 34}
        y={FLOOR_Y - 66}
        width="20"
        height="20"
        rx="1"
        fill="var(--color-paper-3)"
        stroke="var(--color-rule-2)"
        strokeWidth="1"
      />
      <rect
        x={SHELF_X - 30}
        y={FLOOR_Y - 62}
        width="5"
        height="5"
        fill={detected ? "var(--color-online)" : "var(--color-offline)"}
        style={{ transition: "fill var(--dur-short) var(--ease-out)" }}
      />
      <g
        style={{
          transform: speaking ? "rotate(-26deg)" : "rotate(0deg)",
          transformOrigin: `${SHELF_X - 24}px ${FLOOR_Y - 46}px`,
          transition: "transform var(--dur-long) var(--ease-out)",
        }}
      >
        <rect
          x={SHELF_X - 32}
          y={FLOOR_Y - 90}
          width="17"
          height="44"
          rx="2"
          fill="var(--color-accent)"
          opacity="0.85"
        />
        <rect
          x={SHELF_X - 32}
          y={FLOOR_Y - 78}
          width="17"
          height="9"
          fill="var(--color-accent-ink)"
          opacity="0.45"
        />
      </g>

        {/* Audio, only while the unit is actually playing. */}
        {speaking ? (
          <g stroke="var(--color-online)" fill="none" strokeWidth="1.5">
          {[13, 22, 31].map((r, i) => (
            <path
              key={r}
              d={`M${SHELF_X - 42},${FLOOR_Y - 92 - r * 0.3} a${r},${r} 0 0 0 ${-r * 0.6},${r * 0.85}`}
              opacity={0.9 - i * 0.25}
            />
          ))}
          </g>
        ) : null}

        {/* Shopper: a flat silhouette, not an illustration. */}
        <g
          style={{
            transform: `translateX(${x - shopperX(0)}px)`,
            transformOrigin: "center",
            transition: "transform var(--dur-short) var(--ease-out)",
          }}
          fill={detected ? "var(--color-ink-2)" : "var(--color-muted)"}
        >
        <circle cx={shopperX(0)} cy={FLOOR_Y - 82} r="7.5" />
        <path
          d={`M${shopperX(0) - 7.5},${FLOOR_Y} L${shopperX(0) - 7.5},${FLOOR_Y - 48} Q${shopperX(0)},${FLOOR_Y - 74} ${shopperX(0) + 7.5},${FLOOR_Y - 48} L${shopperX(0) + 7.5},${FLOOR_Y} Z`}
        />
        </g>
      </svg>
      {/* Ruler labels live in HTML: text inside a scaled viewBox would not
          render at the size the type ramp says it is. */}
      <div className="relative h-4" aria-hidden>
        {Array.from({ length: SENSOR_RANGE_M + 1 }, (_, m) => (
          <span
            key={m}
            className="absolute -translate-x-1/2 font-mono text-[length:var(--text-xs)] text-[var(--color-muted)] tabular-nums"
            style={{ left: `${percentX(shopperX(m))}%` }}
          >
            {m}m
          </span>
        ))}
      </div>
    </div>
  );
}
