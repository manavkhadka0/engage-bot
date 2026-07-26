"use client";

import { useState } from "react";
import {
  useAssignDevice,
  useDevices,
  useProvisionDevice,
  useSimulateDevice,
  useTenants,
} from "@/hooks/use-api";
import { useLiveDeviceStatus } from "@/hooks/use-live-status";
import { DeviceStatusDot } from "@/components/device-status";
import { EmptyState, Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";

export default function AdminDevicesPage() {
  const devices = useDevices();
  const tenants = useTenants();
  const provision = useProvisionDevice();
  const assign = useAssignDevice();
  const simulate = useSimulateDevice();
  useLiveDeviceStatus();

  const [serial, setSerial] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [assignId, setAssignId] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const list = devices.data ?? [];
  const tenantList = tenants.data ?? [];

  async function onProvision(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setToken(null);
    try {
      const res = await provision.mutateAsync(serial);
      setToken(res.provisionToken ?? null);
      setSerial("");
      setMsg(`Provisioned ${res.serial}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Provision failed");
    }
  }

  async function onAssign(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await assign.mutateAsync({ deviceId: assignId, tenantId });
      setAssignId("");
      setMsg("Device assigned");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assign failed");
    }
  }

  async function runSim(
    deviceId: string,
    action: "online" | "loop" | "offline",
  ) {
    setError(null);
    try {
      await simulate.mutateAsync({ deviceId, action });
      setMsg(`Simulated ${action} on device`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Simulate failed");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[var(--text-sm)] text-[var(--color-muted)]">
          devices --inventory
        </p>
        <h1 className="mt-1 text-[length:var(--text-2xl)]">Devices</h1>
        <p className="mt-2 text-[var(--text-sm)] text-[var(--color-muted)]">
          No hardware? Provision → assign → Simulate loop to drive the
          dashboard.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="provision serial">
          <form onSubmit={onProvision} className="space-y-3">
            <div>
              <Label htmlFor="serial">Serial</Label>
              <Input
                id="serial"
                required
                minLength={3}
                value={serial}
                onChange={(e) => setSerial(e.target.value)}
                placeholder="TK-0042"
              />
            </div>
            <Button type="submit" disabled={provision.isPending}>
              {provision.isPending ? "Registering…" : "Provision →"}
            </Button>
            {token ? (
              <p className="break-all text-[var(--text-xs)] text-[var(--color-accent)]">
                token: {token}
              </p>
            ) : null}
          </form>
        </Panel>

        <Panel title="assign to tenant">
          <form onSubmit={onAssign} className="space-y-3">
            <div>
              <Label htmlFor="device">Device</Label>
              <Select
                id="device"
                required
                value={assignId}
                onChange={(e) => setAssignId(e.target.value)}
              >
                <option value="">Select device</option>
                {list.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.serial} ({d.status})
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="tenant">Tenant</Label>
              <Select
                id="tenant"
                required
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
              >
                <option value="">Select tenant</option>
                {tenantList.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" disabled={assign.isPending}>
              {assign.isPending ? "Assigning…" : "Assign →"}
            </Button>
          </form>
        </Panel>
      </div>

      {msg ? <p className="text-[var(--color-accent)]">{msg}</p> : null}
      {error ? <p className="text-[var(--color-danger)]">{error}</p> : null}

      <Panel title={`${list.length} devices`}>
        {devices.isLoading ? (
          <p className="text-[var(--color-muted)]">Loading…</p>
        ) : list.length === 0 ? (
          <EmptyState
            title="No devices registered"
            body="Provision a serial, assign to a tenant, then click Simulate loop."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] text-left text-[var(--text-sm)]">
              <thead className="text-[var(--color-muted)]">
                <tr className="border-b border-[var(--color-rule)]">
                  <th className="py-2 pr-4 font-normal">Serial</th>
                  <th className="py-2 pr-4 font-normal">Status</th>
                  <th className="py-2 pr-4 font-normal">Tenant</th>
                  <th className="py-2 pr-4 font-normal">Last seen</th>
                  <th className="py-2 font-normal">Fake test</th>
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
                      {d.tenant?.slug ?? "—"}
                    </td>
                    <td className="py-3 pr-4 text-[var(--color-muted)]">
                      {d.lastSeen
                        ? new Date(d.lastSeen).toLocaleString()
                        : "—"}
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="xs"
                          variant="outline"
                          disabled={!d.tenantId || simulate.isPending}
                          onClick={() => void runSim(d.id, "online")}
                        >
                          online
                        </Button>
                        <Button
                          size="xs"
                          variant="outline"
                          disabled={!d.tenantId || simulate.isPending}
                          onClick={() => void runSim(d.id, "loop")}
                        >
                          loop
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                          disabled={!d.tenantId || simulate.isPending}
                          onClick={() => void runSim(d.id, "offline")}
                        >
                          offline
                        </Button>
                      </div>
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
