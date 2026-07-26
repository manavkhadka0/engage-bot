import Link from "next/link";
import {
  TerminalFooter,
  TerminalNav,
} from "@/components/marketing/terminal-chrome";

export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <>
      <TerminalNav />
      <main className="page-gutter flex-1 py-14 md:py-20">
        <p className="text-[var(--text-sm)] text-[var(--color-muted)]">
          about --tokinomo
        </p>
        <h1 className="mt-3 text-[length:var(--text-display-s)]">About us</h1>
        <div className="mt-8 max-w-[65ch] space-y-5 text-[var(--color-ink-2)]">
          <p>
            Tokinomo is built by Baliyo Ventures — shelf-edge robots that turn
            in-store attention into measurable media. Each unit detects dwell
            with mmWave, plays campaign audio, and streams status back to a
            multi-tenant console.
          </p>
          <p>
            Baliyo runs the platform: tenants, device inventory, and global
            fleet health. Brands run their own workspace: devices, products,
            audio library, and analytics — scoped so one brand never sees
            another&apos;s data.
          </p>
          <p>
            Hardware ships profitable; the platform is what makes renewal
            obvious — remote clip swaps, live status, and dwell reports that
            marketing teams already know how to read.
          </p>
        </div>
        <Link
          href="/contact"
          className="mt-10 inline-block text-[var(--color-accent)] underline underline-offset-4"
        >
          Talk to us →
        </Link>
      </main>
      <TerminalFooter />
    </>
  );
}
