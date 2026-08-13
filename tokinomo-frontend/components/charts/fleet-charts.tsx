"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const tooltipStyle: React.CSSProperties = {
  background: "var(--color-paper)",
  border: "1px solid var(--color-rule)",
  borderRadius: 12,
  fontSize: 12,
  color: "var(--color-ink)",
  boxShadow: "var(--shadow-layer)",
};

const STATUS_FILL: Record<string, string> = {
  Online: "var(--color-online)",
  Offline: "var(--color-offline)",
  Error: "var(--color-danger)",
  Provisioning: "var(--color-warn)",
  Unassigned: "var(--color-neutral)",
  Other: "var(--color-neutral)",
};

export function PlaysAreaChart({
  data,
}: {
  data: Array<{ label: string; plays: number; detections: number }>;
}) {
  return (
    <div className="h-56 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="playsFill" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--color-layer-sky)"
                stopOpacity={0.45}
              />
              <stop
                offset="100%"
                stopColor="var(--color-layer-sky)"
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--color-rule)" strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            stroke="var(--color-muted)"
            fontSize={11}
            tickLine={false}
          />
          <YAxis
            stroke="var(--color-muted)"
            fontSize={11}
            width={32}
            tickLine={false}
          />
          <Tooltip contentStyle={tooltipStyle} />
          <Area
            type="monotone"
            dataKey="plays"
            stroke="var(--color-layer-sky)"
            fill="url(#playsFill)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="detections"
            stroke="var(--color-layer-green)"
            fill="transparent"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StatusBarChart({
  data,
}: {
  data: Array<{ name: string; value: number }>;
}) {
  return (
    <div className="h-48 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--color-rule)" strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            stroke="var(--color-muted)"
            fontSize={11}
            tickLine={false}
          />
          <YAxis
            stroke="var(--color-muted)"
            fontSize={11}
            width={28}
            allowDecimals={false}
            tickLine={false}
          />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
            {data.map((entry) => (
              <Cell
                key={entry.name}
                fill={STATUS_FILL[entry.name] ?? "var(--color-layer-navy)"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Horizontal bars: live per-tenant offline counts (or similar). */
export function TenantAttentionChart({
  data,
}: {
  data: Array<{ name: string; offline: number; total: number }>;
}) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-[length:var(--text-sm)] text-[var(--color-muted)]">
        No tenant device counts to chart yet.
      </p>
    );
  }

  return (
    <div className="h-52 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 4, right: 12, left: 4, bottom: 0 }}
        >
          <CartesianGrid
            stroke="var(--color-rule)"
            strokeDasharray="3 3"
            horizontal={false}
          />
          <XAxis
            type="number"
            allowDecimals={false}
            stroke="var(--color-muted)"
            fontSize={11}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={88}
            stroke="var(--color-muted)"
            fontSize={11}
            tickLine={false}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value, _name, item) => {
              const row = item?.payload as
                | { offline: number; total: number }
                | undefined;
              if (!row) return [value, "Offline"];
              return [`${row.offline} / ${row.total}`, "Offline"];
            }}
          />
          <Bar
            dataKey="offline"
            fill="var(--color-danger)"
            radius={[0, 6, 6, 0]}
            name="Offline"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
