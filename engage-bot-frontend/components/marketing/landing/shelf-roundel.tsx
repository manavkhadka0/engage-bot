/**
 * Concentric papercut roundel — Sense / Speak / Prove as stacked cut plates.
 * Depth only by overlap + paper-edge shadow; flat unmixed fills.
 */
export function ShelfRoundel({ className }: { className?: string }) {
  return (
    <div className={className}>
      <svg
        viewBox="0 0 420 420"
        className="h-full w-full"
        role="img"
        aria-label="Layered paper cut of a shelf robot: outer presence ring, mid audio burst, inner pack on the shelf with a shopper nearby"
      >
        <defs>
          <filter
            id="paper-edge"
            x="-12%"
            y="-12%"
            width="124%"
            height="124%"
          >
            <feDropShadow
              dx="0"
              dy="3"
              stdDeviation="3.5"
              floodColor="oklch(22% 0.055 260)"
              floodOpacity="0.18"
            />
          </filter>
          <filter
            id="paper-edge-sm"
            x="-8%"
            y="-8%"
            width="116%"
            height="116%"
          >
            <feDropShadow
              dx="0"
              dy="2"
              stdDeviation="2"
              floodColor="oklch(22% 0.055 260)"
              floodOpacity="0.14"
            />
          </filter>
        </defs>

        {/* Outer paper disc */}
        <circle
          cx="210"
          cy="210"
          r="198"
          fill="var(--color-paper)"
          stroke="var(--color-rule)"
          strokeWidth="1.5"
          filter="url(#paper-edge)"
        />

        {/* Scallop ticks — cut-edge rhythm, not decoration scatter */}
        {Array.from({ length: 24 }, (_, i) => {
          const a = (i / 24) * Math.PI * 2 - Math.PI / 2;
          const x1 = 210 + Math.cos(a) * 186;
          const y1 = 210 + Math.sin(a) * 186;
          const x2 = 210 + Math.cos(a) * 198;
          const y2 = 210 + Math.sin(a) * 198;
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="var(--color-layer-navy)"
              strokeWidth={i % 3 === 0 ? 2.5 : 1.25}
              opacity={0.35}
            />
          );
        })}

        {/* SENSE — sky presence plate, slightly offset */}
        <g filter="url(#paper-edge)" className="toki-layer-settle">
          <circle cx="214" cy="206" r="168" fill="var(--color-layer-sky)" />
          {/* presence arcs as cut crescents */}
          <path
            d="M110 200 A100 100 0 0 1 210 100"
            fill="none"
            stroke="var(--color-paper)"
            strokeWidth="14"
            strokeLinecap="round"
            opacity="0.55"
          />
          <path
            d="M130 220 A80 80 0 0 1 210 130"
            fill="none"
            stroke="var(--color-paper)"
            strokeWidth="10"
            strokeLinecap="round"
            opacity="0.4"
          />
        </g>

        <circle cx="210" cy="210" r="148" fill="var(--color-paper-2)" filter="url(#paper-edge-sm)" />

        {/* SPEAK — gold audio plate */}
        <g filter="url(#paper-edge)" className="toki-layer-settle" data-delay="1">
          <circle cx="206" cy="214" r="128" fill="var(--color-layer-gold)" />
          {/* waveform cut */}
          <path
            d="M100 214 L118 214 L126 188 L136 240 L148 200 L160 228 L172 214 L288 214 L300 190 L312 236 L324 214 L340 214"
            fill="none"
            stroke="var(--color-layer-navy)"
            strokeWidth="5"
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity="0.55"
          />
        </g>

        <circle cx="210" cy="210" r="104" fill="var(--color-paper)" filter="url(#paper-edge-sm)" />

        {/* PROVE — green shelf bay */}
        <g filter="url(#paper-edge)" className="toki-layer-settle" data-delay="2">
          <circle cx="210" cy="210" r="90" fill="var(--color-layer-green)" />
          {/* prove staircase ticks */}
          {[0, 1, 2, 3].map((i) => (
            <rect
              key={i}
              x={148 + i * 18}
              y={268 - i * 10}
              width="14"
              height={6 + i * 10}
              rx="1"
              fill="var(--color-paper)"
              opacity="0.85"
            />
          ))}
        </g>

        {/* Shelf board — stacked cuts */}
        <g filter="url(#paper-edge-sm)">
          <rect x="98" y="188" width="224" height="22" rx="3" fill="var(--color-layer-navy)" />
          <rect x="98" y="210" width="224" height="12" rx="2" fill="var(--color-ink)" opacity="0.28" />
          {/* idle cans */}
          <rect x="112" y="148" width="22" height="40" rx="4" fill="var(--color-paper-3)" stroke="var(--color-rule-2)" />
          <rect x="140" y="152" width="22" height="36" rx="4" fill="var(--color-paper-3)" stroke="var(--color-rule-2)" />
          <rect x="286" y="150" width="22" height="38" rx="4" fill="var(--color-paper-3)" stroke="var(--color-rule-2)" />
        </g>

        {/* Robot + gripped pack — madder cut on top */}
        <g filter="url(#paper-edge)" className="toki-layer-settle" data-delay="3">
          <rect x="176" y="118" width="68" height="78" rx="8" fill="var(--color-accent)" />
          <rect x="188" y="128" width="44" height="26" rx="4" fill="var(--color-paper)" />
          {/* speaker grille dots */}
          {[0, 1, 2].map((r) =>
            [0, 1, 2].map((c) => (
              <circle
                key={`${r}-${c}`}
                cx={196 + c * 10}
                cy={136 + r * 8}
                r="2"
                fill="var(--color-accent)"
                opacity="0.45"
              />
            )),
          )}
          {/* arms gripping pack */}
          <rect x="154" y="152" width="26" height="11" rx="2" fill="var(--color-layer-navy)" />
          <rect x="240" y="152" width="26" height="11" rx="2" fill="var(--color-layer-navy)" />
          {/* pack swung forward */}
          <rect
            x="190"
            y="148"
            width="40"
            height="52"
            rx="5"
            fill="var(--color-layer-gold)"
            stroke="var(--color-ink)"
            strokeWidth="1.75"
          />
          <rect x="198" y="160" width="24" height="8" rx="1" fill="var(--color-accent)" opacity="0.7" />
        </g>

        {/* Shopper — Sense layer figure */}
        <g filter="url(#paper-edge-sm)" opacity="0.92">
          <circle cx="318" cy="168" r="18" fill="var(--color-layer-navy)" />
          <path
            d="M318 190 C298 196 288 220 288 248 L348 248 C348 220 338 196 318 190 Z"
            fill="var(--color-layer-navy)"
          />
        </g>

        {/* Plate captions */}
        <text
          x="210"
          y="42"
          textAnchor="middle"
          fill="var(--color-ink)"
          fontFamily="ui-monospace, monospace"
          fontSize="12"
          letterSpacing="2"
          fontWeight="600"
        >
          SENSE
        </text>
        <text
          x="210"
          y="74"
          textAnchor="middle"
          fill="var(--color-ink)"
          fontFamily="ui-monospace, monospace"
          fontSize="11"
          letterSpacing="2"
          opacity="0.65"
        >
          SPEAK
        </text>
        <text
          x="210"
          y="392"
          textAnchor="middle"
          fill="var(--color-layer-navy)"
          fontFamily="ui-monospace, monospace"
          fontSize="12"
          letterSpacing="2"
          fontWeight="600"
        >
          PROVE
        </text>
      </svg>
    </div>
  );
}
