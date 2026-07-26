"use client";

import Link from "next/link";
import { useState } from "react";
import {
  TerminalFooter,
  TerminalNav,
} from "@/components/marketing/terminal-chrome";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";

export default function ContactPage() {
  const [sent, setSent] = useState(false);

  return (
    <>
      <TerminalNav />
      <main className="page-gutter flex-1 py-14 md:py-20">
        <p className="text-[var(--text-sm)] text-[var(--color-muted)]">
          contact --write
        </p>
        <h1 className="mt-3 text-[length:var(--text-display-s)]">Contact</h1>
        <p className="mt-3 max-w-[50ch] text-[var(--color-ink-2)]">
          Fleet demos, brand onboarding, or platform access — leave a note.
          We&apos;ll reply from Baliyo.
        </p>

        {sent ? (
          <div className="mt-10 max-w-md border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-6">
            <p className="text-[var(--color-accent)]">Message queued.</p>
            <p className="mt-2 text-[var(--text-sm)] text-[var(--color-muted)]">
              This form is client-side for now — email us directly while we wire
              the inbox.
            </p>
            <Link
              href="/"
              className="mt-4 inline-block text-[var(--color-ink-2)] underline"
            >
              ← home
            </Link>
          </div>
        ) : (
          <form
            className="mt-10 max-w-md space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
            }}
          >
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required autoComplete="name" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea id="message" name="message" required />
            </div>
            <Button type="submit">Send →</Button>
          </form>
        )}
      </main>
      <TerminalFooter />
    </>
  );
}
