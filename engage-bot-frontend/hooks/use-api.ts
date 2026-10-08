"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/fetch";
import type {
  AnalyticsOverview,
  AudioClip,
  BillingOverview,
  CreateTenantPayload,
  Device,
  DeviceListPage,
  DwellSummary,
  Location,
  OpsOverview,
  OrgMember,
  PlaysSeriesPoint,
  Product,
  SubscriptionStatus,
  Tenant,
  TenantDetail,
  TenantTier,
  TierCatalogItem,
  UpdateTenantPayload,
} from "@/lib/api/types";

export function useTenants(enabled = true, includeArchived = false) {
  return useQuery({
    queryKey: ["tenants", includeArchived ? "all" : "active"],
    queryFn: () =>
      apiFetch<Tenant[]>(
        `/tenants${includeArchived ? "?includeArchived=1" : ""}`,
      ),
    enabled,
  });
}

export interface CreateLeadPayload {
  name: string;
  email: string;
  brand: string;
  stores?: string;
  intent: "demo" | "pilot" | "platform" | "other";
  message: string;
}

export function useCreateLead() {
  return useMutation({
    mutationFn: (payload: CreateLeadPayload) =>
      apiFetch<{ ok: true }>("/leads", {
        method: "POST",
        json: payload,
      }),
  });
}

export function useOpsOverview(enabled = true) {
  return useQuery({
    queryKey: ["tenants", "ops-overview"],
    queryFn: () => apiFetch<OpsOverview>("/tenants/ops-overview"),
    enabled,
    staleTime: 15_000,
  });
}

export function useTenant(id?: string | null) {
  return useQuery({
    queryKey: ["tenants", id],
    queryFn: () => apiFetch<TenantDetail>(`/tenants/${id}`),
    enabled: !!id,
  });
}

export function useCreateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTenantPayload) =>
      apiFetch<{ tenant: Tenant }>("/tenants", {
        method: "POST",
        json: payload,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["tenants"] });
      void qc.invalidateQueries({ queryKey: ["devices"] });
      void qc.invalidateQueries({ queryKey: ["billing"] });
    },
  });
}

export function useUpdateTenant(id?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateTenantPayload) =>
      apiFetch<Tenant>(`/tenants/${id}`, {
        method: "PATCH",
        json: payload,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["tenants"] });
      void qc.invalidateQueries({ queryKey: ["billing"] });
    },
  });
}

export function useRenameTenantSlug(id?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      slug: string;
      confirm: true;
      auditNote: string;
    }) =>
      apiFetch<Tenant>(`/tenants/${id}/slug`, {
        method: "PATCH",
        json: payload,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["tenants"] });
    },
  });
}

export function useArchiveTenant(id?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { auditNote: string; unarchive?: boolean }) =>
      apiFetch<Tenant>(
        `/tenants/${id}/${args.unarchive ? "unarchive" : "archive"}`,
        {
          method: "POST",
          json: { auditNote: args.auditNote },
        },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["tenants"] });
    },
  });
}

export function useWipeTelemetry(id?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { auditNote: string; confirm: true }) =>
      apiFetch<{ ok: boolean; deleted: number }>(
        `/tenants/${id}/wipe-telemetry`,
        { method: "POST", json: payload },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["tenants", id] });
      void qc.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}

export function useSimulateFleet(id?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (action: "loop" | "online" | "offline" = "loop") =>
      apiFetch(`/tenants/${id}/simulate-fleet`, {
        method: "POST",
        json: { action },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["tenants", id] });
      void qc.invalidateQueries({ queryKey: ["devices"] });
      void qc.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}

export function useTransferAdmin(id?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      email: string;
      name?: string;
      auditNote: string;
    }) =>
      apiFetch(`/tenants/${id}/transfer-admin`, {
        method: "POST",
        json: payload,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["tenants", id] });
      void qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useDevices(
  tenantId?: string | null,
  opts?: { limit?: number; offset?: number; enabled?: boolean },
) {
  const limit = opts?.limit;
  const offset = opts?.offset ?? 0;
  return useQuery({
    queryKey: ["devices", tenantId ?? "all", limit ?? "default", offset],
    queryFn: () => {
      const q = new URLSearchParams();
      if (limit != null) q.set("limit", String(limit));
      if (offset) q.set("offset", String(offset));
      const qs = q.toString();
      return apiFetch<DeviceListPage>(`/devices${qs ? `?${qs}` : ""}`, {
        tenantId: tenantId ?? undefined,
      });
    },
    enabled: opts?.enabled ?? true,
  });
}

export function useProvisionDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (serial: string) =>
      apiFetch<Device>("/devices/provision", {
        method: "POST",
        json: { serial },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["devices"] });
      void qc.invalidateQueries({ queryKey: ["tenants", "ops-overview"] });
    },
  });
}

export function useAssignDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      deviceId: string;
      tenantId: string;
      locationId?: string;
      productId?: string;
    }) =>
      apiFetch<Device>(`/devices/${args.deviceId}/assign`, {
        method: "POST",
        json: {
          tenantId: args.tenantId,
          locationId: args.locationId,
          productId: args.productId,
        },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["devices"] });
      void qc.invalidateQueries({ queryKey: ["tenants"] });
      void qc.invalidateQueries({ queryKey: ["tenants", "ops-overview"] });
    },
  });
}

export function useSimulateDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      deviceId: string;
      action:
        | "online"
        | "offline"
        | "telemetry"
        | "detection"
        | "dwell"
        | "play"
        | "loop";
      dwellMs?: number;
    }) =>
      apiFetch(`/devices/${args.deviceId}/simulate`, {
        method: "POST",
        json: {
          action: args.action,
          dwellMs: args.dwellMs,
        },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["devices"] });
      void qc.invalidateQueries({ queryKey: ["analytics"] });
      void qc.invalidateQueries({ queryKey: ["tenants"] });
      void qc.invalidateQueries({ queryKey: ["tenants", "ops-overview"] });
    },
  });
}

export function useAnalyticsOverview(tenantId?: string | null) {
  return useQuery({
    queryKey: ["analytics", "overview", tenantId],
    queryFn: () =>
      apiFetch<AnalyticsOverview>("/analytics/overview", { tenantId }),
    enabled: !!tenantId,
  });
}

export function usePlaysSeries(tenantId?: string | null) {
  return useQuery({
    queryKey: ["analytics", "plays-series", tenantId],
    queryFn: () =>
      apiFetch<PlaysSeriesPoint[]>("/analytics/plays-series", { tenantId }),
    enabled: !!tenantId,
    staleTime: 30_000,
  });
}

export function useDwell(tenantId?: string | null) {
  return useQuery({
    queryKey: ["analytics", "dwell", tenantId],
    queryFn: () => apiFetch<DwellSummary>("/analytics/dwell", { tenantId }),
    enabled: !!tenantId,
  });
}

export function useProducts(tenantId?: string | null) {
  return useQuery({
    queryKey: ["products", tenantId],
    queryFn: () => apiFetch<Product[]>("/products", { tenantId }),
    enabled: !!tenantId,
  });
}

export function useLocations(tenantId?: string | null) {
  return useQuery({
    queryKey: ["locations", tenantId],
    queryFn: () => apiFetch<Location[]>("/locations", { tenantId }),
    enabled: !!tenantId,
  });
}

export interface LocationPayload {
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
}

export function useCreateLocation(tenantId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: LocationPayload) =>
      apiFetch<Location>("/locations", {
        method: "POST",
        tenantId,
        json: payload,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["locations", tenantId] });
    },
  });
}

export function useUpdateLocation(tenantId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: LocationPayload & { id: string }) =>
      apiFetch<Location>(`/locations/${id}`, {
        method: "PATCH",
        tenantId,
        json: payload,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["locations", tenantId] });
    },
  });
}

export function useSetDeviceLocation(tenantId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      deviceId,
      locationId,
    }: {
      deviceId: string;
      locationId: string | null;
    }) =>
      apiFetch<Device>(`/devices/${deviceId}/location`, {
        method: "PATCH",
        tenantId,
        json: { locationId },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["devices"] });
    },
  });
}

export function useAudio(tenantId?: string | null) {
  return useQuery({
    queryKey: ["audio", tenantId],
    queryFn: () => apiFetch<AudioClip[]>("/audio", { tenantId }),
    enabled: !!tenantId,
  });
}

export function useUploadAudio(tenantId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { file: File; name?: string }) => {
      const fd = new FormData();
      fd.append("file", args.file);
      if (args.name) fd.append("name", args.name);
      return apiFetch<AudioClip>("/audio/upload", {
        method: "POST",
        formData: fd,
        tenantId,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["audio", tenantId] }),
  });
}

export function usePushAudio(tenantId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { audioId: string; deviceIds: string[] }) =>
      apiFetch(`/audio/${args.audioId}/push`, {
        method: "POST",
        json: { deviceIds: args.deviceIds },
        tenantId,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["audio", tenantId] });
      void qc.invalidateQueries({ queryKey: ["devices", tenantId] });
    },
  });
}

export function useMembers(tenantId?: string | null) {
  return useQuery({
    queryKey: ["users", tenantId],
    queryFn: () => apiFetch<OrgMember[]>("/users", { tenantId }),
    enabled: !!tenantId,
  });
}

export function useInviteUser(tenantId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      email: string;
      role: "BRAND_ADMIN" | "BRAND_STAFF" | "BRAND_VIEWER";
    }) =>
      apiFetch("/users/invite", {
        method: "POST",
        json: payload,
        tenantId,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["users", tenantId] });
      void qc.invalidateQueries({ queryKey: ["tenants"] });
    },
  });
}

export function useBillingCatalog() {
  return useQuery({
    queryKey: ["billing", "catalog"],
    queryFn: () => apiFetch<TierCatalogItem[]>("/billing/catalog"),
  });
}

export function useBillingOverview(tenantId?: string | null) {
  return useQuery({
    queryKey: ["billing", "overview", tenantId],
    queryFn: () =>
      apiFetch<BillingOverview>("/billing/overview", { tenantId }),
    enabled: !!tenantId,
  });
}

export function usePlatformBilling() {
  return useQuery({
    queryKey: ["billing", "tenants"],
    queryFn: () =>
      apiFetch<
        Array<{
          tenantId: string;
          name: string;
          slug: string;
          tier: TenantTier;
          status: string;
          devices: number;
          monthlyEstimateNpr: number;
          subscription: BillingOverview["subscription"] | null;
        }>
      >("/billing/tenants"),
  });
}

export function useChangeTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      tenantId: string;
      tier: TenantTier;
      activateNow?: boolean;
    }) =>
      apiFetch(`/billing/tenants/${args.tenantId}/tier`, {
        method: "PATCH",
        json: { tier: args.tier, activateNow: args.activateNow },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["billing"] });
      void qc.invalidateQueries({ queryKey: ["tenants"] });
    },
  });
}

export function useSetSubscriptionStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { tenantId: string; status: SubscriptionStatus }) =>
      apiFetch(`/billing/tenants/${args.tenantId}/status`, {
        method: "PATCH",
        json: { status: args.status },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["billing"] });
      void qc.invalidateQueries({ queryKey: ["tenants"] });
    },
  });
}

export function useConvertTrial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { tenantId: string; tier?: TenantTier }) =>
      apiFetch(`/billing/tenants/${args.tenantId}/convert`, {
        method: "POST",
        json: { tier: args.tier },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["billing"] });
      void qc.invalidateQueries({ queryKey: ["tenants"] });
    },
  });
}
