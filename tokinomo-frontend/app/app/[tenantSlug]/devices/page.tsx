"use client";

import { use } from "react";
import { useDevices } from "@/hooks/use-api";
import { useLiveDeviceStatus } from "@/hooks/use-live-status";
import { useTenantContext } from "@/hooks/use-tenant";
import { DeviceStatusDot } from "@/components/device-status";
import { EmptyState, Panel } from "@/components/ui/panel";

export default function BrandDevicesPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = use(params);
  const { tenantId } = useTenantContext(tenantSlug);
  const devices = useDevices(tenantId);
  useLiveDeviceStatus(tenantId);
  const list = devices.data ?? [];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[var(--text-sm)] text-[var(--color-muted)]">
          {tenantSlug} --devices
        </p>
        <h1 className="mt-1 text-[length:var(--text-2xl)]">Devices</h1>
      </div>

      <Panel title={`${list.length} assigned`}>
        {devices.isLoading ? (
          <p className="text-[var(--color-muted)]">Loading…</p>
        ) : list.length === 0 ? (
          <EmptyState
            title="Waiting on hardware"
            body="Once Baliyo assigns devices to this tenant, live status appears here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-[var(--text-sm)]">
              <thead className="text-[var(--color-muted)]">
                <tr className="border-b border-[var(--color-rule)]">
                  <th className="py-2 pr-4 font-normal">Serial</th>
                  <th className="py-2 pr-4 font-normal">Status</th>
                  <th className="py-2 pr-4 font-normal">Location</th>
                  <th className="py-2 font-normal">Product</th>
                </tr>
              </thead>
              <tbody>
                {list.map((d) => (
                  <tr
                    key={d.id}
                    className="border-b border-[var(--color-rule)]/60"
                  >
                    <td className="py-3 pr-4">{d.serial}</td>
                    <td className="py-3 pr-4">
                      <DeviceStatusDot status={d.status} />
                    </td>
                    <td className="py-3 pr-4 text-[var(--color-ink-2)]">
                      {d.location?.name ?? "—"}
                    </td>
                    <td className="py-3 text-[var(--color-ink-2)]">
                      {d.product?.name ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
