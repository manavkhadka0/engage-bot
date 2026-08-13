"use client";

import { use, useState } from "react";
import dynamic from "next/dynamic";
import {
  useCreateLocation,
  useDevices,
  useLocations,
  useSetDeviceLocation,
  useUpdateLocation,
} from "@/hooks/use-api";
import { useLiveDeviceStatus } from "@/hooks/use-live-status";
import { useTenantContext } from "@/hooks/use-tenant";
import { DeviceStatusDot } from "@/components/device-status";
import { EmptyState, Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";

// Leaflet touches window/document on mount — never render it during SSR.
const FleetMap = dynamic(
  () => import("@/components/map/fleet-map").then((m) => m.FleetMap),
  { ssr: false, loading: () => <p className="text-[var(--color-muted)]">Loading map…</p> },
);

export default function BrandMapPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = use(params);
  const { tenantId } = useTenantContext(tenantSlug);
  const devices = useDevices(tenantId);
  const locations = useLocations(tenantId);
  useLiveDeviceStatus(tenantId);

  const createLocation = useCreateLocation(tenantId);
  const updateLocation = useUpdateLocation(tenantId);
  const setDeviceLocation = useSetDeviceLocation(tenantId);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const deviceList = devices.data?.items ?? [];
  const locationList = locations.data ?? [];

  function startCreate() {
    setEditingId("new");
    setName("");
    setAddress("");
    setCoords(null);
    setErr(null);
  }

  function startEdit(locId: string) {
    const loc = locationList.find((l) => l.id === locId);
    if (!loc) return;
    setEditingId(locId);
    setName(loc.name);
    setAddress(loc.address ?? "");
    setCoords(loc.lat != null && loc.lng != null ? { lat: loc.lat, lng: loc.lng } : null);
    setErr(null);
  }

  function cancelForm() {
    setEditingId(null);
  }

  async function saveLocation() {
    setErr(null);
    if (!name.trim()) {
      setErr("Name is required");
      return;
    }
    if (!coords) {
      setErr("Click the map to place this location");
      return;
    }
    try {
      if (editingId === "new") {
        await createLocation.mutateAsync({
          name,
          address: address || undefined,
          lat: coords.lat,
          lng: coords.lng,
        });
      } else if (editingId) {
        await updateLocation.mutateAsync({
          id: editingId,
          name,
          address: address || undefined,
          lat: coords.lat,
          lng: coords.lng,
        });
      }
      setEditingId(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save location");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[var(--text-sm)] text-[var(--color-muted)]">
          {tenantSlug} --map
        </p>
        <h1 className="mt-1 text-[length:var(--text-2xl)] font-semibold">
          Fleet map
        </h1>
        <p className="mt-1 text-[length:var(--text-sm)] text-[var(--color-ink-2)]">
          Devices show up once they're assigned to a location with coordinates.
        </p>
      </div>

      <Panel title="Locations">
        {editingId ? (
          <div className="mb-6 grid gap-4 border border-[var(--color-rule)] p-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="loc-name">Name</Label>
              <Input
                id="loc-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Downtown store"
              />
            </div>
            <div>
              <Label htmlFor="loc-address">Address (optional)</Label>
              <Input
                id="loc-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <p className="text-[length:var(--text-xs)] text-[var(--color-muted)]">
                {coords
                  ? `Coordinates: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)} — click the map again to move.`
                  : "Click a spot on the map below to place this location."}
              </p>
            </div>
            {err ? (
              <p className="text-[length:var(--text-sm)] text-[var(--color-danger)] sm:col-span-2">
                {err}
              </p>
            ) : null}
            <div className="flex gap-2 sm:col-span-2">
              <Button
                type="button"
                size="sm"
                onClick={() => void saveLocation()}
                disabled={createLocation.isPending || updateLocation.isPending}
              >
                Save
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={cancelForm}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button type="button" size="sm" className="mb-6" onClick={startCreate}>
            Add location
          </Button>
        )}

        <FleetMap
          devices={deviceList}
          onMapClick={editingId ? (lat, lng) => setCoords({ lat, lng }) : undefined}
          pendingMarker={editingId ? coords : null}
        />

        {locationList.length > 0 ? (
          <ul className="mt-6 divide-y divide-[var(--color-rule)]">
            {locationList.map((loc) => (
              <li key={loc.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-[var(--color-ink)]">{loc.name}</p>
                  <p className="text-[length:var(--text-xs)] text-[var(--color-muted)]">
                    {loc.lat != null && loc.lng != null
                      ? `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`
                      : "No coordinates yet"}
                    {loc.address ? ` · ${loc.address}` : ""}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => startEdit(loc.id)}
                >
                  Edit
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </Panel>

      <Panel title="Assign devices to a location">
        {deviceList.length === 0 ? (
          <EmptyState
            title="No devices yet"
            body="Once Baliyo assigns a device to this tenant, it appears here."
          />
        ) : (
          <ul className="divide-y divide-[var(--color-rule)]">
            {deviceList.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-[var(--color-ink)]">{d.serial}</p>
                  <DeviceStatusDot status={d.status} />
                </div>
                <Select
                  className="max-w-xs"
                  value={d.locationId ?? ""}
                  onChange={(e) =>
                    void setDeviceLocation.mutateAsync({
                      deviceId: d.id,
                      locationId: e.target.value || null,
                    })
                  }
                  aria-label={`Location for ${d.serial}`}
                >
                  <option value="">Unassigned</option>
                  {locationList.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </Select>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
