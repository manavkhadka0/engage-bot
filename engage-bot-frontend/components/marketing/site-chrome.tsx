"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Menu,
  X,
  AtSign,
  MessageCircle,
  Video,
  Image as ImageIcon,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * Modeled on Till Janek's mega-menu
 * (collectui.com/designs/framer-ui-design-inspiration/61b3ce40-ad4b-4c80-a722-1c155140eba7),
 * per direct correction from an earlier pass that missed the actual
 * choreography: clicking the hamburger expands the pill WIDTH first, and
 * only once that finishes does the content panel reveal underneath (two
 * explicit sequential stages via `expanded`/`contentOpen`, not one
 * simultaneous `layout` animation — that reads as a single blob resizing,
 * not the reference's distinct "widen, then drop open" beat).
 *
 * Kept Engage Bot's own light nav + Tangerine accent rather than the
 * reference's dark/purple. Social icon row uses generic lucide glyphs
 * (AtSign/MessageCircle/Video/Image/Globe) linking to real platform
 * homepages, not brand logos or fake Engage Bot handles — lucide-react
 * dropped brand icons, and there are no real Engage Bot social profiles to
 * link — populated on request to match the reference's visual rhythm.
 */
const MENU_GROUPS = [
  {
    label: "Product",
    links: [
      { href: "/features", label: "Features" },
      { href: "/#pricing", label: "Pricing" },
      { href: "/#answers", label: "How it works" },
    ],
  },
  {
    label: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/faqs", label: "FAQs" },
      { href: "/contact", label: "Contact" },
    ],
  },
] as const;

const SOCIAL_LINKS = [
  { href: "https://x.com", label: "X", icon: AtSign },
  { href: "https://discord.com", label: "Discord", icon: MessageCircle },
  { href: "https://youtube.com", label: "YouTube", icon: Video },
  { href: "https://instagram.com", label: "Instagram", icon: ImageIcon },
  { href: "https://baliyoventures.com", label: "Website", icon: Globe },
];

const ALL_LINK_HREFS = MENU_GROUPS.flatMap((g) => g.links.map((l) => l.href));

const WIDTH_DURATION = 0.28;
const CONTENT_DURATION = 0.22;

export function SiteNav() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const [contentOpen, setContentOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setExpanded(false);
    setContentOpen(false);
  }, [pathname]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function toggle() {
    if (timer.current) clearTimeout(timer.current);
    if (!expanded) {
      // Stage 1: widen. Stage 2 (content reveal) only starts once the
      // width animation has actually finished.
      setExpanded(true);
      timer.current = setTimeout(() => setContentOpen(true), WIDTH_DURATION * 1000);
    } else {
      // Reverse: content collapses first, then the pill narrows back.
      setContentOpen(false);
      timer.current = setTimeout(() => setExpanded(false), CONTENT_DURATION * 1000);
    }
  }

  const menuActive = ALL_LINK_HREFS.some((href) => href.startsWith(pathname) && pathname !== "/");

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-0 z-[var(--z-sticky-nav)] page-gutter pt-4"
    >
      <div className="mx-auto flex max-w-[1200px] justify-center">
        <motion.div
          animate={{ width: expanded ? "100%" : 340 }}
          transition={{ duration: WIDTH_DURATION, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "overflow-hidden rounded-[var(--radius-card)] border transition-[box-shadow,border-color] duration-[var(--dur-short)]",
            scrolled || expanded
              ? "border-[var(--color-rule)] bg-[var(--color-paper-2)] shadow-[var(--shadow-layer)]"
              : "border-transparent bg-[var(--color-paper-2)]/70 backdrop-blur-sm",
          )}
        >
          {/* Small, fixed-height nav row — hamburger left, logo centered,
              account actions right. Grid (not flex justify-between) so the
              logo stays truly centered regardless of side-content width. */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-3 py-2">
            <div className="flex items-center">
              <button
                type="button"
                aria-label={expanded ? "Close menu" : "Open menu"}
                aria-expanded={expanded}
                onClick={toggle}
                className={cn(
                  "inline-flex size-8 items-center justify-center rounded-[var(--radius-pill)] transition-colors",
                  menuActive || expanded
                    ? "text-[var(--color-ink)]"
                    : "text-[var(--color-ink-2)] hover:text-[var(--color-ink)]",
                )}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={expanded ? "x" : "menu"}
                    initial={{ opacity: 0, rotate: -45, scale: 0.7 }}
                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                    exit={{ opacity: 0, rotate: 45, scale: 0.7 }}
                    transition={{ duration: 0.16 }}
                    className="flex"
                  >
                    {expanded ? <X size={18} /> : <Menu size={18} />}
                  </motion.span>
                </AnimatePresence>
              </button>
            </div>

            <Link
              href="/"
              className="justify-self-center rounded-[var(--radius-pill)] px-2 py-1.5 text-[length:var(--text-sm)] font-medium tracking-[var(--tracking-body)] whitespace-nowrap text-[var(--color-ink)]"
            >
              Engage Bot
            </Link>

            <div className="flex items-center justify-end gap-2">
              <Link
                href="/login"
                className="inline-flex rounded-[var(--radius-pill)] px-2 py-1.5 text-[length:var(--text-sm)] whitespace-nowrap text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]"
              >
                Log in
              </Link>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href="/contact"
                  className="inline-flex items-center rounded-[var(--radius-pill)] bg-[var(--color-accent)] px-4 py-2 text-[length:var(--text-sm)] font-medium whitespace-nowrap text-[var(--color-accent-ink)] shadow-[var(--shadow-layer)] transition-[filter] hover:brightness-105"
                >
                  Book a demo
                </Link>
              </motion.div>
            </div>
          </div>

          {/* Stage 2 — only mounts once the width animation above has
              finished (contentOpen lags expanded by WIDTH_DURATION). */}
          <AnimatePresence>
            {contentOpen ? (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: CONTENT_DURATION, ease: [0.16, 1, 0.3, 1] }}
                className="border-t border-[var(--color-rule)]"
              >
                <div className="p-5">
                  {/* 2 link columns, bold divided-list style (no leading
                      icons, hairline between items) — matches the
                      reference's "GROW AND SCALE" column, not our earlier
                      small icon+text rows. Social icons are their own row
                      below, spanning full width, per the reference — not a
                      column of their own. */}
                  <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
                    {MENU_GROUPS.map((group, gi) => (
                      <div key={group.label}>
                        <span className="font-mono text-[length:var(--text-xs)] tracking-[var(--tracking-label)] text-[var(--color-muted)] uppercase">
                          {group.label}
                        </span>
                        <ul className="mt-2">
                          {group.links.map((l, i) => (
                            <motion.li
                              key={l.href}
                              initial={{ opacity: 0, y: -6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{
                                delay: gi * 0.03 + i * 0.035,
                                duration: 0.28,
                                ease: [0.16, 1, 0.3, 1],
                              }}
                              className="border-b border-[var(--color-rule)] last:border-b-0"
                            >
                              <Link
                                href={l.href}
                                className="block py-3 text-[length:var(--text-lg)] font-medium text-[var(--color-ink)] transition-colors hover:text-[var(--color-accent)]"
                              >
                                {l.label}
                              </Link>
                            </motion.li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                    className="mt-5 flex items-center gap-2 border-t border-[var(--color-rule)] pt-5"
                  >
                    {SOCIAL_LINKS.map((s) => {
                      const Icon = s.icon;
                      return (
                        <a
                          key={s.label}
                          href={s.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={s.label}
                          className="inline-flex size-9 items-center justify-center rounded-[var(--radius-badge)] bg-[var(--color-paper-3)] text-[var(--color-ink-2)] transition-colors hover:bg-[color-mix(in_oklch,var(--color-accent)_12%,var(--color-paper-3))] hover:text-[var(--color-accent)]"
                        >
                          <Icon size={16} />
                        </a>
                      );
                    })}
                  </motion.div>

                  {/* Book a demo + Login both already live in the collapsed
                      row (always visible), so only the theme toggle needs a
                      spot here. */}
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.14, duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                    className="mt-4 flex items-center justify-between"
                  >
                    <span className="font-mono text-[length:var(--text-xs)] tracking-[var(--tracking-label)] text-[var(--color-muted)] uppercase">
                      Theme
                    </span>
                    <ThemeToggle />
                  </motion.div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.header>
  );
}

export function SiteFooter() {
  return (
    <footer className="page-gutter border-t border-[var(--color-rule)] py-14">
      <div className="mx-auto max-w-[1200px]">
        <p className="max-w-[18ch] text-[length:var(--text-display-s)] font-normal tracking-[var(--tracking-display)] text-[var(--color-ink)]">
          Sense. Speak. Prove.
        </p>
        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[length:var(--text-sm)] text-[var(--color-muted)]">
          <Link href="/features" className="hover:text-[var(--color-ink)]">
            Features
          </Link>
          <Link href="/contact" className="hover:text-[var(--color-ink)]">
            Contact
          </Link>
          <Link href="/login" className="hover:text-[var(--color-ink)]">
            Login
          </Link>
          <span>© 2026 Baliyo Ventures</span>
        </div>
      </div>
    </footer>
  );
}
