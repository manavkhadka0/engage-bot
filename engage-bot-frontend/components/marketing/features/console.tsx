"use client";

import {
  AudioLines,
  ChartNoAxesColumn,
  Radar,
  Server,
  ShieldCheck,
} from "lucide-react";
import {
  IsolateView,
  ProveView,
  ProvisionView,
  SenseView,
  SpeakView,
} from "./views";
import type { ActId, SimAction, SimState } from "./simulation";

/**
 * The sandbox frame. Every act renders inside this one shell so the console is
 * a place the visitor stays in rather than five illustrations in a row, and the
 * screen names match the real console's own navigation.
 */

const SCREENS: Array<{
  act: ActId;
  name: string;
  Icon: typeof Server;
}> = [
  { act: "provision", name: "Fleet", Icon: Server },
  { act: "sense", name: "Device", Icon: Radar },
  { act: "speak", name: "Audio", Icon: AudioLines },
  { act: "prove", name: "Analytics", Icon: ChartNoAxesColumn },
  { act: "isolate", name: "Access", Icon: ShieldCheck },
];

const TENANT_NAMES: Record<SimState["tenant"], string> = {
  northwind: "Northwind Beverages",
  harbourline: "Harbourline Foods",
};

const VIEWS: Record<
  ActId,
  (props: {
    state: SimState;
    dispatch: (a: SimAction) => void;
  }) => React.ReactNode
> = {
  provision: ProvisionView,
  sense: SenseView,
  speak: SpeakView,
  prove: ProveView,
  isolate: IsolateView,
};

const EVENT_TONE: Record<string, string> = {
  presence: "text-[var(--color-accent)]",
  dwell: "text-[var(--color-accent)]",
  play: "text-[var(--color-online)]",
  push: "text-[var(--color-ink-2)]",
  ack: "text-[var(--color-online)]",
  status: "text-[var(--color-warn)]",
};

export function SandboxConsole({
  state,
  dispatch,
}: {
  state: SimState;
  dispatch: (action: SimAction) => void;
}) {
  const View = VIEWS[state.act];
  const screen = SCREENS.find((s) => s.act === state.act);

  return (
    <div className="overflow-hidden paper-layer-2">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-rule)] px-4 py-3">
        <span className="flex min-w-0 items-center gap-3">
          <span className="font-semibold text-[var(--color-ink)]">
            Engage Bot
          </span>
          <span className="truncate font-mono text-[length:var(--text-xs)] tracking-[var(--tracking-label)] text-[var(--color-muted)] uppercase">
            {TENANT_NAMES[state.tenant]}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="font-mono text-[length:var(--text-xs)] text-[var(--color-muted)]">
            {state.role === "BRAND_ADMIN" ? "brand admin" : "brand viewer"}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border border-[var(--color-warn)]/40 px-2.5 py-1 font-mono text-[length:var(--text-xs)] tracking-[var(--tracking-label)] text-[var(--color-warn)] uppercase">
            <span
              className="size-1.5 rounded-none bg-[var(--color-warn)]"
              aria-hidden
            />
            simulated fleet
          </span>
        </span>
      </header>

      <div className="grid md:grid-cols-[10.5rem_minmax(0,1fr)]">
        <nav
          aria-label="Sandbox console screens"
          className="flex gap-1 overflow-x-auto border-b border-[var(--color-rule)] p-2 md:flex-col md:overflow-visible md:border-r md:border-b-0"
        >
          {SCREENS.map(({ act, name, Icon }) => {
            const active = state.act === act;
            return (
              <button
                key={act}
                type="button"
                onClick={() => dispatch({ type: "act", act })}
                aria-current={active ? "page" : undefined}
                className={`flex shrink-0 items-center gap-2.5 rounded-[1.25rem] px-3 py-2 text-left text-[length:var(--text-sm)] transition-colors ${
                  active
                    ? "bg-[var(--color-paper-3)] text-[var(--color-accent)]"
                    : "text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)]/60"
                }`}
              >
                <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
                {name}
              </button>
            );
          })}
        </nav>

        <div className="min-w-0 p-4 md:p-5">
          <h3 className="mb-4 text-[length:var(--text-sm)] font-medium text-[var(--color-ink-2)]">
            {screen?.name}
          </h3>
          <View state={state} dispatch={dispatch} />
        </div>
      </div>

      <div className="border-t border-[var(--color-rule)] bg-[var(--color-paper)]/60 px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-[length:var(--text-xs)] tracking-[var(--tracking-label)] text-[var(--color-muted)] uppercase">
            device event stream
          </span>
          <span className="font-mono text-[length:var(--text-xs)] text-[var(--color-muted)] tabular-nums">
            {state.events.length} events
          </span>
        </div>
        {state.events.length === 0 ? (
          <p className="font-mono text-[length:var(--text-xs)] text-[var(--color-muted)]">
            Waiting for the fleet to report.
          </p>
        ) : (
          <ul className="max-h-24 space-y-1 overflow-y-auto font-mono text-[length:var(--text-xs)]">
            {state.events.slice(0, 12).map((event) => (
              <li key={event.id} className="flex gap-3">
                <span className="shrink-0 text-[var(--color-muted)] tabular-nums">
                  +{(event.at / 1000).toFixed(1)}s
                </span>
                <span
                  className={`shrink-0 ${EVENT_TONE[event.kind] ?? "text-[var(--color-ink-2)]"}`}
                >
                  {event.kind}
                </span>
                <span className="shrink-0 text-[var(--color-ink-2)]">
                  {event.serial}
                </span>
                <span className="truncate text-[var(--color-muted)]">
                  {event.detail}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
