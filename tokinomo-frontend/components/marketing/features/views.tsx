"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Kpi } from "@/components/ui/panel";
import { DeviceStatusDot } from "@/components/device-status";
import { DwellHistogram, PlaysDetectionsChart } from "./charts";
import { ShelfDiagram } from "./shelf-diagram";
import {
  averageDwellMs,
  CLIPS,
  DETECT_RANGE_M,
  DWELL_TRIGGER_MS,
  dwellHistogram,
  PRODUCTS,
  SENSOR_RANGE_M,
  STORES,
  storeBreakdown,
  type AckState,
  type SimAction,
  type SimState,
} from "./simulation";

type ViewProps = {
  state: SimState;
  dispatch: (action: SimAction) => void;
};

const fieldClass =
  "h-10 w-full min-w-0 rounded-[var(--radius-input)] border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 text-[length:var(--text-sm)] text-[var(--color-ink)] transition-colors hover:border-[var(--color-rule-2)] focus:border-[var(--color-accent)] focus:outline-none";

const labelClass =
  "mb-1.5 block font-mono text-[length:var(--text-xs)] tracking-[var(--tracking-label)] text-[var(--color-muted)] uppercase";

function Readout({
  label,
  value,
  tone = "ink",
}: {
  label: string;
  value: string;
  tone?: "ink" | "accent" | "online" | "muted";
}) {
  const color =
    tone === "accent"
      ? "text-[var(--color-accent)]"
      : tone === "online"
        ? "text-[var(--color-online)]"
        : tone === "muted"
          ? "text-[var(--color-muted)]"
          : "text-[var(--color-ink)]";
  return (
    <div className="min-w-0">
      <div className={labelClass}>{label}</div>
      <div
        className={`font-mono text-[length:var(--text-sm)] tabular-nums ${color}`}
      >
        {value}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- provision --- */

export function ProvisionView({ state, dispatch }: ViewProps) {
  const fleet = state.devices[state.tenant];
  const unassigned = fleet.find((d) => d.status === "UNASSIGNED");
  const [store, setStore] = useState(STORES[2]);
  const [product, setProduct] = useState(PRODUCTS[1]);

  return (
    <div className="space-y-5">
      <div className="-mx-4 overflow-x-auto px-4">
        <table className="w-full min-w-[30rem] border-collapse">
          <thead>
            <tr className="border-b border-[var(--color-rule)] text-left">
              {["serial", "store", "product", "status", "uptime"].map((h) => (
                <th
                  key={h}
                  className="pb-2 font-mono text-[length:var(--text-xs)] font-normal tracking-[var(--tracking-label)] text-[var(--color-muted)] uppercase"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fleet.map((device) => (
              <tr
                key={device.serial}
                className="border-b border-[var(--color-rule)] last:border-0"
              >
                <td className="py-3 pr-4 font-mono text-[length:var(--text-sm)] text-[var(--color-ink)]">
                  {device.serial}
                </td>
                <td className="py-3 pr-4 text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
                  {device.store ?? (
                    <span className="text-[var(--color-muted)]">—</span>
                  )}
                </td>
                <td className="py-3 pr-4 text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
                  {device.product ?? (
                    <span className="text-[var(--color-muted)]">—</span>
                  )}
                </td>
                <td className="py-3 pr-4">
                  <DeviceStatusDot status={device.status} />
                </td>
                <td className="py-3 font-mono text-[length:var(--text-sm)] text-[var(--color-ink-2)] tabular-nums">
                  {device.uptimePct > 0
                    ? `${device.uptimePct.toFixed(1)}%`
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {unassigned ? (
        <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-rule-2)] p-4">
          <p className="text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
            <span className="font-mono text-[var(--color-ink)]">
              {unassigned.serial}
            </span>{" "}
            arrived from the factory with a serial and nothing else. Give it a
            shelf.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div>
              <label className={labelClass} htmlFor="sandbox-store">
                store
              </label>
              <select
                id="sandbox-store"
                className={fieldClass}
                value={store}
                onChange={(e) => setStore(e.target.value)}
              >
                {STORES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="sandbox-product">
                product
              </label>
              <select
                id="sandbox-product"
                className={fieldClass}
                value={product}
                onChange={(e) => setProduct(e.target.value)}
              >
                {PRODUCTS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <Button
              onClick={() =>
                dispatch({
                  type: "assign",
                  serial: unassigned.serial,
                  store,
                  product,
                })
              }
            >
              Assign device
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-[length:var(--text-sm)] text-[var(--color-muted)]">
          Every device in this fleet has a shelf. A newly provisioned unit
          reports in on its own once it finds the store Wi-Fi.
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ sense --- */

export function SenseView({ state, dispatch }: ViewProps) {
  const { shopper } = state;
  const progress = Math.min(1, shopper.dwellMs / DWELL_TRIGGER_MS);

  return (
    <div className="space-y-5">
      <ShelfDiagram
        distanceM={shopper.distanceM}
        detected={shopper.detected}
        speaking={shopper.spoke && shopper.detected}
      />

      <div>
        <label className={labelClass} htmlFor="sandbox-distance">
          move the shopper
        </label>
        <input
          id="sandbox-distance"
          type="range"
          min={0}
          max={SENSOR_RANGE_M * 10}
          value={(SENSOR_RANGE_M - shopper.distanceM) * 10}
          onChange={(e) =>
            dispatch({
              type: "shopper",
              distanceM: SENSOR_RANGE_M - Number(e.target.value) / 10,
            })
          }
          className="w-full accent-[var(--color-accent)]"
        />
        <div className="mt-1 flex justify-between font-mono text-[length:var(--text-xs)] text-[var(--color-muted)]">
          <span>walking past</span>
          <span>stopped at the shelf</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 border-t border-[var(--color-rule)] pt-4 sm:grid-cols-4">
        <Readout label="distance" value={`${shopper.distanceM.toFixed(1)} m`} />
        <Readout
          label="presence"
          value={shopper.detected ? "detected" : "clear"}
          tone={shopper.detected ? "online" : "muted"}
        />
        <Readout
          label="dwell"
          value={`${(shopper.dwellMs / 1000).toFixed(1)} s`}
          tone={shopper.detected ? "accent" : "muted"}
        />
        <Readout
          label="audio"
          value={shopper.spoke && shopper.detected ? "playing" : "idle"}
          tone={shopper.spoke && shopper.detected ? "online" : "muted"}
        />
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <span className={labelClass}>dwell before the unit speaks</span>
          <span className="font-mono text-[length:var(--text-xs)] text-[var(--color-muted)] tabular-nums">
            {DWELL_TRIGGER_MS / 1000}s
          </span>
        </div>
        <div className="h-1 w-full bg-[var(--color-paper-3)]">
          <div
            className="h-full origin-left bg-[var(--color-accent)]"
            style={{
              transform: `scaleX(${progress})`,
              transition: "transform var(--dur-micro) linear",
            }}
          />
        </div>
        <p className="mt-3 text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
          The sensor registers a stop inside {DETECT_RANGE_M} m and measures how
          long it lasts. A shopper standing perfectly still still reads, which
          is the difference between millimetre-wave and a motion tripwire — and
          there is no camera in the enclosure to argue about.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ speak --- */

const ACK_TONE: Record<AckState, { className: string; label: string }> = {
  idle: { className: "text-[var(--color-muted)]", label: "no clip pushed" },
  queued: { className: "text-[var(--color-warn)]", label: "queued" },
  sent: { className: "text-[var(--color-accent)]", label: "sent" },
  acked: { className: "text-[var(--color-online)]", label: "acknowledged" },
  failed: { className: "text-[var(--color-danger)]", label: "no response" },
};

function AckChip({ state }: { state: AckState }) {
  const tone = ACK_TONE[state];
  return (
    <span
      key={state}
      className={`toki-ack-land inline-flex items-center gap-2 font-mono text-[length:var(--text-sm)] ${tone.className}`}
    >
      <span className="size-2 shrink-0 rounded-none bg-current" aria-hidden />
      {tone.label}
    </span>
  );
}

export function SpeakView({ state, dispatch }: ViewProps) {
  const fleet = state.devices[state.tenant];
  const targets = fleet.filter((d) => d.status !== "UNASSIGNED");
  const acked = targets.filter((d) => d.ack === "acked").length;
  const failed = targets.filter((d) => d.ack === "failed");
  const isViewer = state.role === "BRAND_VIEWER";

  return (
    <div className="space-y-5">
      <fieldset>
        <legend className={labelClass}>audio library</legend>
        <div className="space-y-2">
          {CLIPS.map((clip) => {
            const selected = state.selectedClip === clip.id;
            return (
              <label
                key={clip.id}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-input)] border px-3 py-2.5 transition-colors ${
                  selected
                    ? "border-[var(--color-accent)] bg-[var(--color-paper-3)]"
                    : "border-[var(--color-rule)] hover:border-[var(--color-rule-2)]"
                }`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <input
                    type="radio"
                    name="sandbox-clip"
                    className="accent-[var(--color-accent)]"
                    checked={selected}
                    onChange={() => dispatch({ type: "clip", clipId: clip.id })}
                  />
                  <span className="truncate font-mono text-[length:var(--text-sm)] text-[var(--color-ink)]">
                    {clip.name}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-[length:var(--text-xs)] text-[var(--color-muted)] tabular-nums">
                  {clip.seconds}s
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => dispatch({ type: "push" })} disabled={isViewer}>
          Push to {targets.length} devices
        </Button>
        <span className="font-mono text-[length:var(--text-sm)] text-[var(--color-muted)] tabular-nums">
          {acked} of {targets.length} acknowledged
        </span>
      </div>
      {isViewer ? (
        <p className="text-[length:var(--text-sm)] text-[var(--color-warn)]">
          Your role is viewer, so pushing audio is not available. Ask a brand
          admin to push, or switch the role back under Access.
        </p>
      ) : null}

      <ul className="divide-y divide-[var(--color-rule)] border-t border-[var(--color-rule)]">
        {targets.map((device) => (
          <li
            key={device.serial}
            className="flex flex-wrap items-center justify-between gap-3 py-3"
          >
            <span className="min-w-0">
              <span className="block font-mono text-[length:var(--text-sm)] text-[var(--color-ink)]">
                {device.serial}
              </span>
              <span className="block text-[length:var(--text-xs)] text-[var(--color-muted)]">
                {device.store}
              </span>
            </span>
            <span className="flex items-center gap-3">
              <AckChip state={device.ack} />
              {device.ack === "failed" ? (
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() =>
                    dispatch({ type: "retry", serial: device.serial })
                  }
                >
                  Retry
                </Button>
              ) : null}
            </span>
          </li>
        ))}
      </ul>

      <p className="text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
        {failed.length > 0
          ? "One unit is offline, so it never acknowledged. The push is not reported as delivered — an unacknowledged device is the thing you actually need to know about."
          : "Each unit acknowledges on its own. A push is only finished when the last device has said so."}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ prove --- */

export function ProveView({ state }: ViewProps) {
  const fleet = state.devices[state.tenant];
  const online = fleet.filter((d) => d.status === "ONLINE").length;
  const plays = state.series.reduce((sum, b) => sum + b.plays, 0);
  const detections = state.series.reduce((sum, b) => sum + b.detections, 0);
  const avgDwell = averageDwellMs(state.dwellSamples);
  const byStore = storeBreakdown(fleet);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Online" value={`${online}/${fleet.length}`} />
        <Kpi label="Detections" value={detections} hint="today" />
        <Kpi label="Plays" value={plays} hint="today" />
        <Kpi
          label="Avg dwell"
          value={`${(avgDwell / 1000).toFixed(1)}s`}
          hint={`${state.dwellSamples.length} samples`}
        />
      </div>

      <div>
        <h4 className="mb-3 text-[length:var(--text-sm)] font-medium text-[var(--color-ink-2)]">
          Plays and detections
        </h4>
        <PlaysDetectionsChart data={state.series} />
      </div>

      <div>
        <h4 className="mb-3 text-[length:var(--text-sm)] font-medium text-[var(--color-ink-2)]">
          Dwell distribution
        </h4>
        <DwellHistogram bins={dwellHistogram(state.dwellSamples)} />
      </div>

      <div>
        <h4 className="mb-3 text-[length:var(--text-sm)] font-medium text-[var(--color-ink-2)]">
          By store
        </h4>
        <ul className="divide-y divide-[var(--color-rule)] border-t border-[var(--color-rule)]">
          {byStore.map((row) => (
            <li
              key={row.store}
              className="flex items-center justify-between gap-4 py-3"
            >
              <span className="min-w-0 truncate text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
                {row.store}
              </span>
              <span className="shrink-0 font-mono text-[length:var(--text-sm)] text-[var(--color-muted)] tabular-nums">
                {row.plays} plays · {row.detections} detections
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- isolate --- */

const TENANTS: Array<{ id: SimState["tenant"]; name: string }> = [
  { id: "northwind", name: "Northwind Beverages" },
  { id: "harbourline", name: "Harbourline Foods" },
];

export function IsolateView({ state, dispatch }: ViewProps) {
  const fleet = state.devices[state.tenant];
  const current = TENANTS.find((t) => t.id === state.tenant);
  const other = TENANTS.find((t) => t.id !== state.tenant);
  const stores = new Set(fleet.map((d) => d.store).filter(Boolean)).size;

  return (
    <div className="space-y-6">
      <div>
        <span className={labelClass}>open workspace</span>
        <div className="flex flex-wrap gap-2">
          {TENANTS.map((tenant) => (
            <Button
              key={tenant.id}
              variant={state.tenant === tenant.id ? "default" : "outline"}
              size="sm"
              onClick={() => dispatch({ type: "tenant", tenant: tenant.id })}
            >
              {tenant.name}
            </Button>
          ))}
        </div>
        <p className="mt-3 text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
          Switching workspaces is a platform-operator power, used to assist or
          train a brand. The console marks it as an explicit state rather than
          letting an operator browse a tenant silently.
        </p>
      </div>

      <div>
        <span className={labelClass}>your role</span>
        <div className="flex flex-wrap gap-2">
          {(["BRAND_ADMIN", "BRAND_VIEWER"] as const).map((role) => (
            <Button
              key={role}
              variant={state.role === role ? "default" : "outline"}
              size="sm"
              onClick={() => dispatch({ type: "role", role })}
            >
              {role === "BRAND_ADMIN" ? "Brand admin" : "Brand viewer"}
            </Button>
          ))}
        </div>
        <p className="mt-3 text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
          Drop to viewer and the push control under Speak stops being available.
        </p>
      </div>

      <dl className="divide-y divide-[var(--color-rule)] border-t border-[var(--color-rule)]">
        {[
          ["workspace", current?.name ?? "—"],
          ["devices this session can reach", String(fleet.length)],
          ["stores", String(stores)],
          [`records visible from ${other?.name}`, "0"],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 py-3">
            <dt className="min-w-0 text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
              {label}
            </dt>
            <dd className="shrink-0 font-mono text-[length:var(--text-sm)] text-[var(--color-ink)] tabular-nums">
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <p className="text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
        Scope comes from the session on the server, never from anything the
        browser sends. A brand cannot ask for another brand&rsquo;s devices by
        changing a value in a request.
      </p>
    </div>
  );
}
