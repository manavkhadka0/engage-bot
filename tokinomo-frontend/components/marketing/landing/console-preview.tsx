import {
  LayoutDashboard,
  Cpu,
  Package,
  Music2,
  ChartNoAxesCombined,
  CreditCard,
  Users,
} from "lucide-react";
import { DeviceStatusDot } from "@/components/device-status";
import { Kpi } from "@/components/ui/panel";
import type { DeviceStatus } from "@/lib/api/types";

const NAV = [
  { label: "Overview", icon: LayoutDashboard, active: true },
  { label: "Devices", icon: Cpu },
  { label: "Products", icon: Package },
  { label: "Audio", icon: Music2 },
  { label: "Analytics", icon: ChartNoAxesCombined },
  { label: "Billing", icon: CreditCard },
  { label: "Users", icon: Users },
];

const PLAYS_BY_HOUR = [
  8, 6, 5, 4, 6, 12, 26, 38, 45, 52, 61, 74, 86, 78, 66, 58, 63, 71, 88, 95, 80,
  54, 30, 16,
];

const CHART_W = 760;
const CHART_H = 170;
const CHART_TOP = 16;

function chartGeometry() {
  const stepX = CHART_W / (PLAYS_BY_HOUR.length - 1);
  const points = PLAYS_BY_HOUR.map((value, i) => ({
    x: i * stepX,
    y: CHART_H - (value / 100) * (CHART_H - CHART_TOP),
  }));

  let line = `M${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const curr = points[i];
    const midX = (prev.x + curr.x) / 2;
    line += ` Q${midX} ${prev.y} ${midX} ${(prev.y + curr.y) / 2}`;
    line += ` Q${midX} ${curr.y} ${curr.x} ${curr.y}`;
  }

  const area = `${line} L${CHART_W} ${CHART_H} L0 ${CHART_H} Z`;
  return { line, area };
}

const DEVICES: Array<{
  serial: string;
  location: string;
  status: DeviceStatus;
}> = [
  { serial: "TKN-0A31-0117", location: "Store 01 · Aisle 4", status: "ONLINE" },
  { serial: "TKN-0A31-0118", location: "Store 01 · Aisle 4", status: "ONLINE" },
  { serial: "TKN-0A31-0124", location: "Store 02 · Endcap", status: "ONLINE" },
  {
    serial: "TKN-0A31-0131",
    location: "Store 02 · Aisle 7",
    status: "PROVISIONING",
  },
  {
    serial: "TKN-0A31-0140",
    location: "Store 03 · Aisle 2",
    status: "OFFLINE",
  },
  { serial: "TKN-0A31-0142", location: "Store 03 · Aisle 2", status: "ONLINE" },
];

export function ConsolePreview() {
  const { line, area } = chartGeometry();

  return (
    <figure className="m-0">
      <div className="overflow-hidden paper-layer-2">
        {/* Console top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-rule)] px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-[length:var(--text-sm)] font-semibold text-[var(--color-ink)]">
              Fleet overview
            </span>
            <span className="hidden font-mono text-[length:var(--text-xs)] tracking-[var(--tracking-label)] text-[var(--color-muted)] uppercase sm:inline">
              brand workspace
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-[var(--radius-pill)] border border-[var(--color-rule-2)] px-3 py-1 font-mono text-[length:var(--text-xs)] text-[var(--color-ink-2)]">
              last 24h
            </span>
            <span className="rounded-[var(--radius-pill)] border border-[var(--color-warn)]/50 bg-[var(--color-warn)]/10 px-3 py-1 font-mono text-[length:var(--text-xs)] tracking-[var(--tracking-label)] text-[var(--color-warn)] uppercase">
              sample data
            </span>
          </div>
        </div>

        <div className="flex">
          {/* Console sidebar */}
          <div className="hidden w-44 shrink-0 border-r border-[var(--color-rule)] py-3 lg:block">
            {NAV.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className={
                    item.active
                      ? "mx-2 flex items-center gap-3 rounded-xl bg-[var(--color-paper-3)] px-3 py-2 text-[length:var(--text-sm)] text-[var(--color-accent)]"
                      : "mx-2 flex items-center gap-3 rounded-xl px-3 py-2 text-[length:var(--text-sm)] text-[var(--color-ink-2)]"
                  }
                >
                  <Icon className="size-4 shrink-0 opacity-80" />
                  {item.label}
                </div>
              );
            })}
          </div>

          {/* Console body */}
          <div className="min-w-0 flex-1 p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi label="Devices online" value="42" hint="of 48 assigned" />
              <Kpi label="Audio plays" value="1,284" hint="last 24 hours" />
              <Kpi label="Median dwell" value="2.4s" hint="at the shelf" />
              <Kpi label="Fleet uptime" value="99.2%" hint="trailing 30 days" />
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
              <div className="min-w-0 paper-layer p-4">
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-[length:var(--text-xs)] tracking-[var(--tracking-label)] text-[var(--color-muted)] uppercase">
                    plays over time
                  </span>
                </div>
                <svg
                  viewBox={`0 0 ${CHART_W} ${CHART_H}`}
                  preserveAspectRatio="none"
                  className="mt-3 h-40 w-full"
                  aria-hidden
                >
                  {[0.25, 0.5, 0.75].map((f) => (
                    <line
                      key={f}
                      x1={0}
                      x2={CHART_W}
                      y1={CHART_H * f}
                      y2={CHART_H * f}
                      stroke="var(--color-rule)"
                      strokeWidth={1}
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                  <path d={area} fill="var(--color-accent)" opacity={0.14} />
                  <path
                    d={line}
                    fill="none"
                    stroke="var(--color-accent)"
                    strokeWidth={1.75}
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
                <div className="mt-2 flex justify-between font-mono text-[length:var(--text-xs)] text-[var(--color-muted)]">
                  <span>00:00</span>
                  <span>06:00</span>
                  <span>12:00</span>
                  <span>18:00</span>
                  <span>24:00</span>
                </div>
              </div>

              <div className="min-w-0 paper-layer p-4">
                <span className="font-mono text-[length:var(--text-xs)] tracking-[var(--tracking-label)] text-[var(--color-muted)] uppercase">
                  devices
                </span>
                <ul className="mt-3 divide-y divide-[var(--color-rule)]">
                  {DEVICES.map((device) => (
                    <li
                      key={device.serial}
                      className="flex items-center justify-between gap-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <span className="block truncate font-mono text-[length:var(--text-sm)] text-[var(--color-ink)]">
                          {device.serial}
                        </span>
                        <span className="block truncate text-[length:var(--text-xs)] text-[var(--color-muted)]">
                          {device.location}
                        </span>
                      </div>
                      <DeviceStatusDot
                        status={device.status}
                        className="shrink-0"
                      />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-[length:var(--text-xs)] text-[var(--color-muted)]">
        The brand workspace, rendered with the console&apos;s own components.
        Figures shown are sample data for illustration, not results from a
        deployment.
      </figcaption>
    </figure>
  );
}
