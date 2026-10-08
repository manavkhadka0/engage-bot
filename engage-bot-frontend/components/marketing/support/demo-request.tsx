"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { useCreateLead, type CreateLeadPayload } from "@/hooks/use-api";

const BRING = [
  "Brand name",
  "Approximate store count",
  "Product on the shelf",
  "Rough timeline",
];

const INTENTS = [
  { value: "demo", label: "Fleet demo" },
  { value: "pilot", label: "Pilot scoping" },
  { value: "platform", label: "Platform / workspace access" },
  { value: "other", label: "Something else" },
];

export function DemoRequest() {
  const [sent, setSent] = useState(false);
  const createLead = useCreateLead();

  if (sent) {
    return (
      <div className="paper-layer-2 p-8">
        <h2 className="text-[length:var(--text-2xl)] font-semibold tracking-tight text-[var(--color-ink)]">
          Request noted
        </h2>
        <p className="mt-3 max-w-[42ch] text-[length:var(--text-base)] text-[var(--color-ink-2)]">
          That reached the team. We&apos;ll follow up at the email you gave us
          to scope the demo.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button
            type="button"
            onClick={() => {
              setSent(false);
              createLead.reset();
            }}
          >
            Send another
          </Button>
          <Link
            href="/features"
            className="inline-flex h-10 items-center rounded-[var(--radius-pill)] border border-[var(--color-rule-2)] px-5 text-[length:var(--text-sm)] text-[var(--color-ink)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
          >
            Try the sandbox meanwhile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:gap-14 lg:items-start">
      <aside className="paper-layer-2 p-6">
        <p className="font-mono text-[length:var(--text-xs)] tracking-[var(--tracking-label)] text-[var(--color-muted)] uppercase">
          What to bring
        </p>
        <ul className="mt-5 space-y-4">
          {BRING.map((item) => (
            <li
              key={item}
              className="flex items-start gap-3 text-[length:var(--text-sm)] text-[var(--color-ink)]"
            >
              <span
                className="mt-0.5 size-2 shrink-0 rounded-none bg-[var(--color-accent)]"
                aria-hidden
              />
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-6 text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
          That is enough to scope units, mounting, and the workspace your team
          would log into.
        </p>
      </aside>

      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          const payload: CreateLeadPayload = {
            name: String(form.get("name") ?? ""),
            email: String(form.get("email") ?? ""),
            brand: String(form.get("brand") ?? ""),
            stores: String(form.get("stores") ?? "") || undefined,
            intent: form.get("intent") as CreateLeadPayload["intent"],
            message: String(form.get("message") ?? ""),
          };
          createLead.mutate(payload, { onSuccess: () => setSent(true) });
        }}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="demo-name" className="font-mono">
              Name
            </Label>
            <Input id="demo-name" name="name" required autoComplete="name" />
          </div>
          <div>
            <Label htmlFor="demo-email" className="font-mono">
              Work email
            </Label>
            <Input
              id="demo-email"
              name="email"
              type="email"
              required
              autoComplete="email"
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="demo-brand" className="font-mono">
              Brand
            </Label>
            <Input id="demo-brand" name="brand" required />
          </div>
          <div>
            <Label htmlFor="demo-stores" className="font-mono">
              Approx. stores
            </Label>
            <Input
              id="demo-stores"
              name="stores"
              inputMode="numeric"
              placeholder="e.g. 40"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="demo-intent" className="font-mono">
            Intent
          </Label>
          <Select id="demo-intent" name="intent" defaultValue="demo" required>
            {INTENTS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="demo-message" className="font-mono">
            Context
          </Label>
          <Textarea
            id="demo-message"
            name="message"
            required
            placeholder="Product on the shelf, cities, timeline — whatever scopes the first conversation."
          />
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-1">
          <Button type="submit" disabled={createLead.isPending}>
            {createLead.isPending ? "Sending…" : "Request a demo"}
          </Button>
          <p className="max-w-[36ch] font-mono text-[length:var(--text-xs)] text-[var(--color-muted)]">
            {createLead.isError
              ? "Something went wrong sending that — try again."
              : "Reaches the team directly. No fake response-time promise."}
          </p>
        </div>
      </form>
    </div>
  );
}
