"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";

/**
 * Replaces the old concentric "papercut" roundel — that was a literal,
 * six-color illustrated scene (robot, shopper figure, cans, waveform,
 * scalloped edge) built for a saturated palette. It doesn't survive a
 * neutral, one-accent system: muting its colors just made it read as a
 * muddy cluster, since the busyness was never about color.
 *
 * v2: the card renders at ~550px on desktop, and the first pass only ever
 * used ~400px of travel centered in it — a small pulse lost in a lot of
 * dead space. This version fills the canvas (bigger ring travel, a faint
 * dot-grid field for depth), gives the device continuous idle life
 * (breathing scale, a diagonal dot-grid chase) instead of going static
 * after mount, and adds a subtle mouse-parallax tilt on the whole card.
 */

const RINGS = [0, 1, 2, 3];
const DOTS = Array.from({ length: 9 }, (_, i) => ({
  row: Math.floor(i / 3),
  col: i % 3,
}));

export function SensePulse({ className }: { className?: string }) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Mouse-parallax tilt: raw pointer offset -> spring-smoothed rotation.
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springX = useSpring(rotateX, { stiffness: 120, damping: 14 });
  const springY = useSpring(rotateY, { stiffness: 120, damping: 14 });
  const glowX = useTransform(springY, [-8, 8], [30, 70]);
  const glowY = useTransform(springX, [8, -8], [30, 70]);
  const bgLeft = useTransform(glowX, (v) => `${(v - 50) * -0.4}%`);
  const bgTop = useTransform(glowY, (v) => `${(v - 50) * -0.4}%`);

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    rotateY.set(px * 16);
    rotateX.set(py * -16);
  }

  function onMouseLeave() {
    rotateX.set(0);
    rotateY.set(0);
  }

  return (
    <div
      className={className}
      role="img"
      aria-label="A device on a shelf sensing a shopper's presence, shown as expanding rings from a central unit, with live status readouts nearby."
      style={{ perspective: 1000 }}
    >
      <motion.div
        ref={cardRef}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        style={{ rotateX: springX, rotateY: springY, transformStyle: "preserve-3d" }}
        className="relative h-full w-full overflow-hidden rounded-[var(--radius-card)]"
      >
        {/* Faint dot-grid field, fading toward the edges — depth without color */}
        <motion.div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, var(--color-rule-2) 1px, transparent 1.2px)",
            backgroundSize: "28px 28px",
            maskImage:
              "radial-gradient(circle at center, black 0%, black 35%, transparent 75%)",
            WebkitMaskImage:
              "radial-gradient(circle at center, black 0%, black 35%, transparent 75%)",
            left: bgLeft,
            top: bgTop,
          }}
        />

        <div className="relative flex h-full w-full items-center justify-center">
          {/* Presence rings — the actual mechanism, not decoration. Sized to
              actually travel across a ~550px card instead of a small
              centered puff. */}
          {RINGS.map((i) => (
            <motion.span
              key={i}
              className="absolute rounded-full border-[1.5px] border-[var(--color-accent)]"
              style={{ width: 112, height: 112 }}
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 4.6, opacity: 0 }}
              transition={{
                duration: 3.6,
                ease: "circOut",
                repeat: Infinity,
                delay: i * 0.8,
              }}
            />
          ))}

          {/* Static reference rings — the "concentric sensing" idea, kept flat and quiet */}
          <span className="absolute size-[260px] rounded-full border border-[var(--color-rule-2)]" />
          <span className="absolute size-[380px] rounded-full border border-[var(--color-rule)]" />

          {/* The device — entrance spring, then a continuous idle breath so
              it doesn't go dead once it's landed. */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 160, damping: 14, delay: 0.1 }}
            className="relative z-10"
          >
            <motion.div
              animate={{ scale: [1, 1.045, 1] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="flex size-28 items-center justify-center rounded-[28px] bg-[var(--color-accent)] shadow-[var(--shadow-layer-lg)]"
            >
              <span className="grid grid-cols-3 gap-2">
                {DOTS.map(({ row, col }, i) => (
                  <motion.span
                    key={i}
                    className="size-1.5 rounded-full bg-[var(--color-accent-ink)]"
                    animate={{ opacity: [0.3, 0.9, 0.3] }}
                    transition={{
                      duration: 1.8,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: (row + col) * 0.15,
                    }}
                  />
                ))}
              </span>
            </motion.div>
          </motion.div>

          {/* Telemetry chips — the product's own real readouts, not
              decoration. Entrance (whileInView) and the idle float loop
              (animate) both drive `y`, so they're split across a wrapper +
              inner element rather than fighting over one transition. */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85, rotate: -4 }}
            whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 150, damping: 15, delay: 0.45 }}
            className="absolute top-[16%] left-[8%] z-10"
          >
            <motion.div
              animate={{ y: [0, -7, 0] }}
              transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
              className="flex items-center gap-2 rounded-[var(--radius-badge)] border border-[var(--color-rule)] bg-[var(--color-paper-2)] px-3 py-1.5 shadow-[var(--shadow-layer-lg)]"
            >
              <motion.span
                className="size-1.5 rounded-full bg-[var(--color-online)]"
                animate={{ opacity: [1, 0.35, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
              <span className="font-mono text-[length:var(--text-xs)] text-[var(--color-ink-2)]">
                online
              </span>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.85, rotate: 4 }}
            whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 150, damping: 15, delay: 0.6 }}
            className="absolute right-[6%] bottom-[18%] z-10"
          >
            <motion.div
              animate={{ y: [0, -7, 0] }}
              transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut", delay: 1.8 }}
              className="flex items-center gap-2 rounded-[var(--radius-badge)] border border-[var(--color-rule)] bg-[var(--color-paper-2)] px-3 py-1.5 shadow-[var(--shadow-layer-lg)]"
            >
              <span className="font-mono text-[length:var(--text-xs)] text-[var(--color-ink-2)]">
                dwell 2.4s
              </span>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
