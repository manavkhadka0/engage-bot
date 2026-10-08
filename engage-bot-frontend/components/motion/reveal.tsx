"use client";

import { motion, type Variants, type Transition } from "motion/react";
import type { ReactNode } from "react";

// "More expressive" tuning: a real spring with a touch of overshoot, bigger
// travel distance than a typical subtle fade — not a plain ease-out fade.
const springy: Transition = {
  type: "spring",
  stiffness: 140,
  damping: 15,
  mass: 0.8,
};

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Vertical travel distance in px before settling. */
  y?: number;
  /** Extra delay in seconds, for hand-placed sequencing outside a RevealGroup. */
  delay?: number;
  /** Re-play every time it scrolls into view instead of once. */
  repeat?: boolean;
  /** Scale-in alongside the rise, for elements that should feel like they're arriving, not just fading. */
  scale?: boolean;
  as?: "div" | "span";
};

export function Reveal({
  children,
  className,
  y = 32,
  delay = 0,
  repeat = false,
  scale = false,
  as = "div",
}: RevealProps) {
  const Component = as === "span" ? motion.span : motion.div;
  return (
    <Component
      initial={{ opacity: 0, y, scale: scale ? 0.94 : 1 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: !repeat, margin: "-10% 0px -10% 0px" }}
      transition={{ ...springy, delay }}
      className={className}
    >
      {children}
    </Component>
  );
}

const groupContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.1, delayChildren: 0.04 },
  },
};

const groupItem: Variants = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: springy },
};

/**
 * Wrap a list of direct children (cards, list rows, objection blocks) to
 * stagger them in together as one scroll-triggered group, rather than each
 * needing its own Reveal + hand-tuned delay.
 */
export function RevealGroup({
  children,
  className,
  once = true,
}: {
  children: ReactNode;
  className?: string;
  once?: boolean;
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: "-10% 0px -10% 0px" }}
      variants={groupContainer}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={groupItem} className={className}>
      {children}
    </motion.div>
  );
}
