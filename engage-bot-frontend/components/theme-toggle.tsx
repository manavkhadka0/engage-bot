"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { AnimatePresence, motion } from "motion/react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  // next-themes only knows the real theme after mount (avoids SSR mismatch);
  // render a stable placeholder until then rather than guessing light/dark.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={
        "relative inline-flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-badge)] text-[var(--color-ink-2)] transition-colors hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)] " +
        (className ?? "")
      }
    >
      <AnimatePresence mode="wait" initial={false}>
        {mounted ? (
          <motion.span
            key={isDark ? "moon" : "sun"}
            initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="flex"
          >
            {isDark ? <Moon size={16} /> : <Sun size={16} />}
          </motion.span>
        ) : (
          <span className="block size-4" />
        )}
      </AnimatePresence>
    </button>
  );
}
