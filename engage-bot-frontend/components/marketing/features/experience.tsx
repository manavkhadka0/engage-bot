"use client";

import { useEffect, useReducer, useRef } from "react";
import { Button } from "@/components/ui/button";
import { SandboxConsole } from "./console";
import { initialState, reduce, TICK_MS, type ActId } from "./simulation";

const ACTS: Array<{
  id: ActId;
  name: string;
  screen: string;
  summary: string;
  narration: string;
}> = [
  {
    id: "provision",
    name: "Provision",
    screen: "Fleet",
    summary: "Turn a serial number into a device",
    narration:
      "A unit arrives from the bench as a serial and nothing else. Assigning it to a store and a product is what makes it a device the platform can report on — it provisions itself from there and joins the fleet without anyone opening a terminal.",
  },
  {
    id: "sense",
    name: "Sense",
    screen: "Device",
    summary: "Watch it decide a shopper stopped",
    narration:
      "Nothing happens until somebody stops. Move the shopper toward the shelf and watch the sensor work out whether the stop is real, then watch the unit swing the pack forward and speak. This is the only thing on the page you have to feel rather than read.",
  },
  {
    id: "speak",
    name: "Speak",
    screen: "Audio",
    summary: "Change the message without a store visit",
    narration:
      "Swapping what the shelf says is an upload and a push. Each unit answers for itself, which is the part that matters: a push you cannot verify device by device is a push you have to go and check in person.",
  },
  {
    id: "prove",
    name: "Prove",
    screen: "Analytics",
    summary: "Read back what actually happened",
    narration:
      "Everything you just did is in here — the plays you triggered, the dwell you generated, the store that contributed them. This is the view a brand takes into a renewal conversation, and the reason the devices are connected at all.",
  },
  {
    id: "isolate",
    name: "Isolate",
    screen: "Access",
    summary: "One platform, separate brands",
    narration:
      "The same platform runs more than one brand. Switch workspace and the console shows a different fleet with none of the previous one's data, and dropping your own role changes what you are allowed to do rather than just what you can see.",
  },
];

export function FeaturesExperience() {
  const [state, dispatch] = useReducer(reduce, undefined, initialState);
  const tabsRef = useRef<Array<HTMLButtonElement | null>>([]);

  // One clock for the whole simulation. It reports elapsed milliseconds rather
  // than assuming it was called on time, because browsers throttle intervals in
  // unfocused tabs — and it pauses outright while the tab is hidden so a
  // backgrounded page does not quietly run the tour to its end.
  useEffect(() => {
    let id: number | undefined;
    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = now - last;
      last = now;
      dispatch({ type: "tick", dt });
    };
    const start = () => {
      if (id === undefined) {
        last = performance.now();
        id = window.setInterval(tick, TICK_MS);
      }
    };
    const stop = () => {
      if (id !== undefined) {
        window.clearInterval(id);
        id = undefined;
      }
    };
    const onVisibility = () => (document.hidden ? stop() : start());

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const activeIndex = ACTS.findIndex((act) => act.id === state.act);
  const active = ACTS[activeIndex] ?? ACTS[0];

  function onTabKeyDown(event: React.KeyboardEvent) {
    const forward = event.key === "ArrowDown" || event.key === "ArrowRight";
    const back = event.key === "ArrowUp" || event.key === "ArrowLeft";
    if (!forward && !back && event.key !== "Home" && event.key !== "End")
      return;

    event.preventDefault();
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? ACTS.length - 1
          : (activeIndex + (forward ? 1 : -1) + ACTS.length) % ACTS.length;

    dispatch({ type: "act", act: ACTS[next].id });
    tabsRef.current[next]?.focus();
  }

  return (
    <section
      aria-labelledby="sandbox-heading"
      // Any interaction anywhere in the sandbox hands the fleet over. The tour
      // is a demonstration for someone who has not touched anything yet.
      onPointerDown={() => dispatch({ type: "takeControl" })}
      onKeyDown={() => dispatch({ type: "takeControl" })}
    >
      <h1
        id="sandbox-heading"
        className="max-w-[22ch] text-[length:var(--text-display)] font-semibold tracking-[var(--tracking-display)] text-[var(--color-ink)]"
      >
        Run a fleet from this page.
      </h1>
      <p className="mt-5 max-w-[54ch] text-[length:var(--text-lg)] text-[var(--color-ink-2)]">
        Engage Bot is a shelf robot that senses a shopper who stops, speaks your
        line, and reports what happened. Below is its actual console, wired to a
        simulated fleet instead of real shelves — provision a device, make a
        shopper stop, push audio to every store, then read back what you caused.
      </p>

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)] lg:gap-10">
        <div>
          <div
            role="tablist"
            aria-label="Sandbox walkthrough"
            aria-orientation="vertical"
            onKeyDown={onTabKeyDown}
            className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0"
          >
            {ACTS.map((act, i) => {
              const selected = act.id === state.act;
              return (
                <button
                  key={act.id}
                  ref={(node) => {
                    tabsRef.current[i] = node;
                  }}
                  role="tab"
                  id={`act-tab-${act.id}`}
                  aria-selected={selected}
                  aria-controls="sandbox-panel"
                  tabIndex={selected ? 0 : -1}
                  onClick={() => dispatch({ type: "act", act: act.id })}
                  className={`shrink-0 rounded-[var(--radius-card)] border px-4 py-3 text-left transition-colors lg:w-full ${
                    selected
                      ? "border-[var(--color-accent)] bg-[var(--color-paper-2)]"
                      : "border-[var(--color-rule)] hover:border-[var(--color-rule-2)]"
                  }`}
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span
                      className={`text-[length:var(--text-lg)] font-semibold ${
                        selected
                          ? "text-[var(--color-accent)]"
                          : "text-[var(--color-ink)]"
                      }`}
                    >
                      {act.name}
                    </span>
                    <span className="shrink-0 font-mono text-[length:var(--text-xs)] tracking-[var(--tracking-label)] text-[var(--color-muted)] uppercase">
                      {act.screen}
                    </span>
                  </span>
                  <span className="mt-1 hidden text-[length:var(--text-sm)] text-[var(--color-ink-2)] lg:block">
                    {act.summary}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="mt-6 max-w-[46ch] text-[length:var(--text-base)] text-[var(--color-ink-2)]">
            {active.narration}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[var(--color-rule)] pt-4">
            {state.driving ? (
              <>
                <span className="font-mono text-[length:var(--text-xs)] tracking-[var(--tracking-label)] text-[var(--color-online)] uppercase">
                  you have the controls
                </span>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => dispatch({ type: "replayTour" })}
                >
                  Replay the tour
                </Button>
              </>
            ) : (
              <span className="font-mono text-[length:var(--text-xs)] tracking-[var(--tracking-label)] text-[var(--color-muted)] uppercase">
                <span
                  className="status-pulse mr-2 inline-block size-2 bg-[var(--color-accent)] align-middle"
                  aria-hidden
                />
                tour running — touch anything to drive
              </span>
            )}
          </div>
        </div>

        <div
          role="tabpanel"
          id="sandbox-panel"
          aria-labelledby={`act-tab-${active.id}`}
          className="min-w-0"
        >
          <SandboxConsole state={state} dispatch={dispatch} />
          <p className="mt-3 text-[length:var(--text-sm)] text-[var(--color-muted)]">
            Devices, stores and brands above are invented for this
            demonstration, and the figures it starts with are illustrative
            rather than deployment results. Anything you cause while you are
            here is real arithmetic on that starting point.
          </p>
        </div>
      </div>
    </section>
  );
}
