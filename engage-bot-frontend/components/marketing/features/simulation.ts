import type { DeviceStatus } from "@/lib/api/types";

/**
 * A simulated tenant fleet for the public features page. Every figure here is
 * invented demonstration material — the product has no deployment yet, so the
 * page proves its mechanism by letting a visitor cause telemetry rather than by
 * quoting any.
 *
 * One clock drives everything. `tick` is the only time-based action, and the
 * reducer advances dwell, acknowledgement staggering, provisioning and the
 * guided tour from it. Nothing here schedules its own timer, so there is no
 * cleanup to get wrong and no chance of two transitions racing.
 *
 * Every duration is in milliseconds of elapsed time, never in tick counts.
 * Browsers throttle timers in unfocused or occluded tabs — a hundred-millisecond
 * interval can arrive once a second — so a tick-counting simulation would run at
 * whatever rate the browser felt like granting.
 */

/** How often we ask for a tick. Delivery is best-effort, so `dt` is what counts. */
export const TICK_MS = 100;
/** Ceiling on one step, so a throttled or resumed tab cannot leap the tour. */
export const MAX_DT_MS = 500;

/** Shopper is close enough for the mmWave sensor to register a stop. */
export const DETECT_RANGE_M = 1.2;
/** Dwell the firmware waits out before it decides a stop is real and speaks. */
export const DWELL_TRIGGER_MS = 1500;
/** Sensor's rated ceiling, and the far end of the shopper track. */
export const SENSOR_RANGE_M = 5;

export type AckState = "idle" | "queued" | "sent" | "acked" | "failed";

export type SimDevice = {
  serial: string;
  store: string | null;
  product: string | null;
  status: DeviceStatus;
  ack: AckState;
  /** Milliseconds until this device's next scheduled transition; 0 means none. */
  pendingMs: number;
  plays: number;
  detections: number;
  uptimePct: number;
};

export type SimEvent = {
  id: number;
  at: number;
  kind: "presence" | "dwell" | "play" | "push" | "ack" | "status";
  serial: string;
  detail: string;
};

export type Bucket = { label: string; plays: number; detections: number };

export type ActId = "provision" | "sense" | "speak" | "prove" | "isolate";

export type TenantId = "northwind" | "harbourline";

export type Role = "BRAND_ADMIN" | "BRAND_VIEWER";

export type SimState = {
  act: ActId;
  tenant: TenantId;
  role: Role;
  devices: Record<TenantId, SimDevice[]>;
  shopper: {
    distanceM: number;
    dwellMs: number;
    detected: boolean;
    spoke: boolean;
  };
  events: SimEvent[];
  series: Bucket[];
  dwellSamples: number[];
  selectedClip: string;
  /** False while the guided tour drives; true once the visitor takes over. */
  driving: boolean;
  tourStep: number;
  tourWaitMs: number;
  eventSeq: number;
  clock: number;
};

export const CLIPS = [
  { id: "diwali", name: "diwali-greeting.mp3", seconds: 9 },
  { id: "launch", name: "new-flavour-launch.mp3", seconds: 12 },
  { id: "bundle", name: "two-for-one-bundle.mp3", seconds: 7 },
];

export const STORES = [
  "Bhatbhateni Maharajgunj",
  "Salesberry Pulchowk",
  "Big Mart Baneshwor",
];

export const PRODUCTS = ["Surge Citrus 250ml", "Surge Original 250ml"];

/** Baseline so the charts read as a fleet already running, not an empty demo. */
const SEED_SERIES: Bucket[] = [
  { label: "09", plays: 14, detections: 31 },
  { label: "11", plays: 22, detections: 48 },
  { label: "13", plays: 37, detections: 79 },
  { label: "15", plays: 29, detections: 61 },
  { label: "17", plays: 44, detections: 92 },
  { label: "19", plays: 26, detections: 55 },
];

const SEED_DWELL = [
  1800, 2400, 1600, 3200, 2100, 4800, 1900, 2700, 6100, 2200, 1700, 3600, 2900,
  2000, 5200, 1650, 2450, 3100, 2300, 8400, 1750, 2600, 4100, 2150,
];

function northwindFleet(): SimDevice[] {
  return [
    {
      serial: "TKN-4C1A",
      store: STORES[0],
      product: PRODUCTS[0],
      status: "ONLINE",
      ack: "idle",
      pendingMs: 0,
      plays: 41,
      detections: 88,
      uptimePct: 99.2,
    },
    {
      serial: "TKN-4C1B",
      store: STORES[1],
      product: PRODUCTS[0],
      status: "ONLINE",
      ack: "idle",
      pendingMs: 0,
      plays: 33,
      detections: 71,
      uptimePct: 98.7,
    },
    {
      serial: "TKN-4C22",
      store: STORES[2],
      product: PRODUCTS[1],
      status: "OFFLINE",
      ack: "idle",
      pendingMs: 0,
      plays: 0,
      detections: 0,
      uptimePct: 74.1,
    },
    {
      serial: "TKN-4C31",
      store: null,
      product: null,
      status: "UNASSIGNED",
      ack: "idle",
      pendingMs: 0,
      plays: 0,
      detections: 0,
      uptimePct: 0,
    },
  ];
}

function harbourlineFleet(): SimDevice[] {
  return [
    {
      serial: "TKN-91F0",
      store: "Harbourline flagship",
      product: "Still Water 1L",
      status: "ONLINE",
      ack: "idle",
      pendingMs: 0,
      plays: 12,
      detections: 26,
      uptimePct: 97.4,
    },
    {
      serial: "TKN-91F4",
      store: "Harbourline flagship",
      product: "Still Water 1L",
      status: "PROVISIONING",
      ack: "idle",
      pendingMs: 0,
      plays: 0,
      detections: 0,
      uptimePct: 0,
    },
  ];
}

export function initialState(): SimState {
  return {
    act: "provision",
    tenant: "northwind",
    role: "BRAND_ADMIN",
    devices: { northwind: northwindFleet(), harbourline: harbourlineFleet() },
    shopper: { distanceM: 3.4, dwellMs: 0, detected: false, spoke: false },
    events: [],
    series: SEED_SERIES.map((b) => ({ ...b })),
    dwellSamples: [...SEED_DWELL],
    selectedClip: CLIPS[0].id,
    driving: false,
    tourStep: 0,
    tourWaitMs: 1200,
    eventSeq: 0,
    clock: 0,
  };
}

export type SimAction =
  | { type: "tick"; dt: number }
  | { type: "act"; act: ActId }
  | { type: "assign"; serial: string; store: string; product: string }
  | { type: "shopper"; distanceM: number }
  | { type: "clip"; clipId: string }
  | { type: "push" }
  | { type: "retry"; serial: string }
  | { type: "tenant"; tenant: TenantId }
  | { type: "role"; role: Role }
  | { type: "takeControl" }
  | { type: "replayTour" };

/** Marks the visitor as driving; the tour never resumes without an explicit ask. */
function drive(state: SimState): SimState {
  return state.driving ? state : { ...state, driving: true };
}

function log(state: SimState, event: Omit<SimEvent, "id" | "at">): SimState {
  const id = state.eventSeq + 1;
  return {
    ...state,
    eventSeq: id,
    events: [{ ...event, id, at: state.clock }, ...state.events].slice(0, 40),
  };
}

function mapFleet(
  state: SimState,
  fn: (device: SimDevice) => SimDevice,
  tenant: TenantId = state.tenant,
): SimState {
  return {
    ...state,
    devices: { ...state.devices, [tenant]: state.devices[tenant].map(fn) },
  };
}

/** Credits an interaction the visitor caused to the most recent chart bucket. */
function creditLatestBucket(
  series: Bucket[],
  field: "plays" | "detections",
): Bucket[] {
  if (series.length === 0) return series;
  return series.map((bucket, i) =>
    i === series.length - 1
      ? { ...bucket, [field]: bucket[field] + 1 }
      : bucket,
  );
}

function activeShelfDevice(state: SimState): SimDevice | undefined {
  return state.devices[state.tenant].find((d) => d.status === "ONLINE");
}

/* ------------------------------------------------------------------ sense --- */

function advanceShopper(state: SimState, dt: number): SimState {
  const { shopper } = state;
  const inRange = shopper.distanceM <= DETECT_RANGE_M;
  let next = state;

  if (inRange && !shopper.detected) {
    const device = activeShelfDevice(state);
    next = {
      ...next,
      shopper: { ...shopper, detected: true, dwellMs: 0, spoke: false },
      series: creditLatestBucket(next.series, "detections"),
    };
    if (device) {
      next = mapFleet(next, (d) =>
        d.serial === device.serial ? { ...d, detections: d.detections + 1 } : d,
      );
      next = log(next, {
        kind: "presence",
        serial: device.serial,
        detail: `presence at ${shopper.distanceM.toFixed(1)}m`,
      });
    }
    return next;
  }

  if (!inRange && shopper.detected) {
    const settled = shopper.dwellMs;
    next = {
      ...next,
      shopper: { ...shopper, detected: false, dwellMs: 0, spoke: false },
    };
    if (settled >= 400) {
      next = {
        ...next,
        dwellSamples: [settled, ...next.dwellSamples].slice(0, 240),
      };
    }
    return next;
  }

  if (!inRange) return state;

  const dwellMs = shopper.dwellMs + dt;
  next = { ...next, shopper: { ...shopper, dwellMs } };

  if (!shopper.spoke && dwellMs >= DWELL_TRIGGER_MS) {
    const device = activeShelfDevice(state);
    next = {
      ...next,
      shopper: { ...next.shopper, spoke: true },
      series: creditLatestBucket(next.series, "plays"),
    };
    if (device) {
      next = mapFleet(next, (d) =>
        d.serial === device.serial ? { ...d, plays: d.plays + 1 } : d,
      );
      const clip = CLIPS.find((c) => c.id === next.selectedClip) ?? CLIPS[0];
      next = log(next, {
        kind: "play",
        serial: device.serial,
        detail: `played ${clip.name}`,
      });
    }
  }

  return next;
}

/* -------------------------------------------------- scheduled transitions --- */

function advancePending(state: SimState, dt: number): SimState {
  let next = state;
  for (const tenant of ["northwind", "harbourline"] as TenantId[]) {
    const fleet = next.devices[tenant];
    if (!fleet.some((d) => d.pendingMs > 0)) continue;

    for (const device of fleet) {
      // Read the deadline off the snapshot so a device fires exactly once, even
      // though the transitions below rebuild the fleet as they go.
      if (device.pendingMs <= 0 || device.pendingMs - dt > 0) continue;

      if (device.status === "PROVISIONING") {
        next = mapFleet(
          next,
          (d) =>
            d.serial === device.serial
              ? { ...d, status: "ONLINE", pendingMs: 0, uptimePct: 100 }
              : d,
          tenant,
        );
        next = log(next, {
          kind: "status",
          serial: device.serial,
          detail: "joined the fleet · online",
        });
        continue;
      }

      if (device.ack === "queued") {
        next = mapFleet(
          next,
          (d) =>
            d.serial === device.serial
              ? { ...d, ack: "sent", pendingMs: 700 }
              : d,
          tenant,
        );
        continue;
      }

      if (device.ack === "sent") {
        // An offline unit cannot acknowledge. Showing that plainly is the point
        // of the per-device lifecycle — a fleet-wide "sent" would be a lie.
        const reachable = device.status === "ONLINE";
        next = mapFleet(
          next,
          (d) =>
            d.serial === device.serial
              ? { ...d, ack: reachable ? "acked" : "failed", pendingMs: 0 }
              : d,
          tenant,
        );
        next = log(next, {
          kind: "ack",
          serial: device.serial,
          detail: reachable ? "acknowledged" : "no response · device offline",
        });
        continue;
      }
    }

    next = mapFleet(
      next,
      (d) =>
        d.pendingMs > 0 ? { ...d, pendingMs: Math.max(0, d.pendingMs - dt) } : d,
      tenant,
    );
  }
  return next;
}

/* ------------------------------------------------------------------- tour --- */

type TourStep = { act: ActId; waitMs: number; run?: SimAction };

/**
 * The unattended demonstration. It performs the same actions the visitor can,
 * through the same reducer, so the tour cannot drift from what the controls do.
 */
const TOUR: TourStep[] = [
  { act: "provision", waitMs: 1400 },
  {
    act: "provision",
    waitMs: 2400,
    run: {
      type: "assign",
      serial: "TKN-4C31",
      store: STORES[2],
      product: PRODUCTS[1],
    },
  },
  { act: "sense", waitMs: 1200 },
  { act: "sense", waitMs: 900, run: { type: "shopper", distanceM: 2.2 } },
  { act: "sense", waitMs: 900, run: { type: "shopper", distanceM: 0.9 } },
  { act: "sense", waitMs: 2800 },
  { act: "sense", waitMs: 1200, run: { type: "shopper", distanceM: 3.1 } },
  { act: "speak", waitMs: 1400 },
  { act: "speak", waitMs: 1000, run: { type: "clip", clipId: "launch" } },
  { act: "speak", waitMs: 4000, run: { type: "push" } },
  { act: "prove", waitMs: 4500 },
  { act: "isolate", waitMs: 1800 },
  {
    act: "isolate",
    waitMs: 2200,
    run: { type: "tenant", tenant: "harbourline" },
  },
  { act: "isolate", waitMs: 1800, run: { type: "tenant", tenant: "northwind" } },
  { act: "isolate", waitMs: 2000, run: { type: "role", role: "BRAND_VIEWER" } },
];

function advanceTour(state: SimState, dt: number): SimState {
  if (state.driving) return state;

  const remaining = state.tourWaitMs - dt;
  if (remaining > 0) return { ...state, tourWaitMs: remaining };

  const step = TOUR[state.tourStep];
  if (!step) {
    // Tour finished. Hand the fleet over rather than looping forever.
    return { ...state, driving: true };
  }

  let next: SimState = { ...state, act: step.act };
  if (step.run) next = reduce(next, step.run);

  return {
    ...next,
    tourStep: state.tourStep + 1,
    tourWaitMs: step.waitMs,
    driving: false,
  };
}

/* ---------------------------------------------------------------- reducer --- */

export function reduce(state: SimState, action: SimAction): SimState {
  switch (action.type) {
    case "tick": {
      const dt = Math.min(MAX_DT_MS, Math.max(0, action.dt));
      let next: SimState = { ...state, clock: state.clock + dt };
      next = advancePending(next, dt);
      next = advanceShopper(next, dt);
      next = advanceTour(next, dt);
      return next;
    }

    case "act":
      return { ...drive(state), act: action.act };

    case "assign": {
      let next = mapFleet(state, (d) =>
        d.serial === action.serial
          ? {
              ...d,
              store: action.store,
              product: action.product,
              status: "PROVISIONING",
              pendingMs: 1800,
            }
          : d,
      );
      next = log(next, {
        kind: "status",
        serial: action.serial,
        detail: `assigned to ${action.store} · provisioning`,
      });
      return next;
    }

    case "shopper":
      return {
        ...state,
        shopper: {
          ...state.shopper,
          distanceM: Math.min(SENSOR_RANGE_M, Math.max(0, action.distanceM)),
        },
      };

    case "clip":
      return { ...state, selectedClip: action.clipId };

    case "push": {
      if (state.role === "BRAND_VIEWER") return state;
      const clip = CLIPS.find((c) => c.id === state.selectedClip) ?? CLIPS[0];
      const targets = state.devices[state.tenant].filter(
        (d) => d.status !== "UNASSIGNED",
      );
      let next = mapFleet(state, (d) =>
        d.status === "UNASSIGNED"
          ? d
          : {
              ...d,
              ack: "queued" as AckState,
              // Stagger so the fleet resolves device by device, the way a real
              // push does, instead of flipping in one block.
              pendingMs: 500 + targets.findIndex((t) => t.serial === d.serial) * 550,
            },
      );
      next = log(next, {
        kind: "push",
        serial: `${targets.length} devices`,
        detail: `queued ${clip.name}`,
      });
      return next;
    }

    case "retry": {
      let next = mapFleet(state, (d) =>
        d.serial === action.serial
          ? // A retry that reaches the device is what recovery looks like; the
            // unit comes back online and then acknowledges.
            { ...d, status: "ONLINE", ack: "sent", pendingMs: 900, uptimePct: 74.1 }
          : d,
      );
      next = log(next, {
        kind: "push",
        serial: action.serial,
        detail: "retried · device reconnected",
      });
      return next;
    }

    case "tenant":
      return { ...state, tenant: action.tenant };

    case "role":
      return { ...state, role: action.role };

    case "takeControl":
      return drive(state);

    case "replayTour":
      return {
        ...initialState(),
        selectedClip: state.selectedClip,
        act: "provision",
      };

    default:
      return state;
  }
}

/* -------------------------------------------------------------- selectors --- */

export function dwellHistogram(samples: number[]) {
  const edges = [0, 1, 2, 3, 5, 8];
  const bins = edges.map((from, i) => ({
    label:
      i === edges.length - 1 ? `${from}s+` : `${from}\u2013${edges[i + 1]}s`,
    from: from * 1000,
    to: i === edges.length - 1 ? Infinity : edges[i + 1] * 1000,
    count: 0,
  }));
  for (const sample of samples) {
    const bin = bins.find((b) => sample >= b.from && sample < b.to);
    if (bin) bin.count += 1;
  }
  return bins;
}

export function averageDwellMs(samples: number[]) {
  if (samples.length === 0) return 0;
  return samples.reduce((sum, s) => sum + s, 0) / samples.length;
}

export function storeBreakdown(devices: SimDevice[]) {
  const byStore = new Map<string, { plays: number; detections: number }>();
  for (const device of devices) {
    if (!device.store) continue;
    const row = byStore.get(device.store) ?? { plays: 0, detections: 0 };
    row.plays += device.plays;
    row.detections += device.detections;
    byStore.set(device.store, row);
  }
  return [...byStore.entries()]
    .map(([store, v]) => ({ store, ...v }))
    .sort((a, b) => b.plays - a.plays);
}
