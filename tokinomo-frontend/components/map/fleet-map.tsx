"use client";

import { useCallback, useMemo } from "react";
import Link from "next/link";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Device, DeviceStatus } from "@/lib/api/types";
import { EmptyState } from "@/components/ui/panel";

// Kathmandu — sensible default center when there are no mapped devices yet.
const DEFAULT_CENTER: [number, number] = [27.7172, 85.324];
const DEFAULT_ZOOM = 12;

const STATUS_DOT_CLASS: Record<DeviceStatus, string> = {
  ONLINE: "bg-[var(--color-online)]",
  ERROR: "bg-[var(--color-danger)]",
  PROVISIONING: "bg-[var(--color-warn)]",
  OFFLINE: "bg-[var(--color-offline)]",
  UNASSIGNED: "bg-[var(--color-neutral)]",
};

function statusIcon(status: DeviceStatus) {
  return L.divIcon({
    className: "",
    html: `<span class="block size-4 rounded-full border-2 border-white shadow-[var(--shadow-layer)] ${STATUS_DOT_CLASS[status]}"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8],
  });
}

type MappableDevice = Device & {
  location: NonNullable<Device["location"]> & { lat: number; lng: number };
};

/** Refits the viewport whenever the marker set changes (e.g. live status updates adding/removing devices). */
function FitBounds({ devices }: { devices: MappableDevice[] }) {
  const map = useMap();
  useMemo(() => {
    if (devices.length === 0) return;
    const bounds = L.latLngBounds(
      devices.map((d) => [d.location.lat, d.location.lng] as [number, number]),
    );
    map.fitBounds(bounds, { padding: [32, 32], maxZoom: 15 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devices.map((d) => d.id).join(",")]);
  return null;
}

function ClickToPlace({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

const pendingIcon = L.divIcon({
  className: "",
  html: `<span class="block size-4 rounded-full border-2 border-white shadow-[var(--shadow-layer)] bg-[var(--color-accent)] animate-pulse"></span>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

export function FleetMap({
  devices,
  showTenant = false,
  linkBase,
  heightClassName = "h-[420px]",
  onMapClick,
  pendingMarker,
}: {
  devices: Device[];
  /** Show the tenant name in each popup (platform fleet-wide view). */
  showTenant?: boolean;
  /** Base path for the "open" link in each popup, e.g. "/admin/tenants" or "/app/acme/devices". */
  linkBase?: (device: Device) => string | null;
  heightClassName?: string;
  /** When set, clicking the map reports coordinates instead of (or alongside) viewing devices — used to place a new location. */
  onMapClick?: (lat: number, lng: number) => void;
  /** Draft pin shown while placing a new location's coordinates. */
  pendingMarker?: { lat: number; lng: number } | null;
}) {
  const mapped = useMemo(
    () =>
      devices.filter(
        (d): d is MappableDevice =>
          !!d.location &&
          typeof d.location.lat === "number" &&
          typeof d.location.lng === "number",
      ),
    [devices],
  );

  // React StrictMode double-invokes effects in dev, which mounts MapContainer
  // twice on the same DOM node; Leaflet doesn't clear its internal id on the
  // phantom first unmount and throws "Map container is being reused" on the
  // second real mount. Clearing the id via a ref callback (right before
  // Leaflet would check it) is the standard workaround.
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (node && (node as unknown as { _leaflet_id?: number })._leaflet_id) {
      (node as unknown as { _leaflet_id?: number })._leaflet_id = undefined;
    }
  }, []);

  if (mapped.length === 0 && !onMapClick) {
    return (
      <EmptyState
        title="No mapped devices yet"
        body="Devices show up here once they're assigned to a location with coordinates."
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className={`${heightClassName} w-full overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-rule)]`}
    >
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds devices={mapped} />
        {onMapClick ? <ClickToPlace onClick={onMapClick} /> : null}
        {pendingMarker ? (
          <Marker
            position={[pendingMarker.lat, pendingMarker.lng]}
            icon={pendingIcon}
          />
        ) : null}
        {mapped.map((d) => {
          const href = linkBase?.(d);
          return (
            <Marker
              key={d.id}
              position={[d.location.lat, d.location.lng]}
              icon={statusIcon(d.status)}
            >
              <Popup>
                <div className="space-y-1 font-sans text-sm">
                  <p className="font-semibold">{d.serial}</p>
                  <p className="text-[var(--color-muted)]">
                    {d.status.toLowerCase()} · {d.location.name}
                  </p>
                  {showTenant && d.tenant ? (
                    <p className="text-[var(--color-muted)]">{d.tenant.name}</p>
                  ) : null}
                  {href ? (
                    <Link href={href} className="text-[var(--color-accent)] underline">
                      Open →
                    </Link>
                  ) : null}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
