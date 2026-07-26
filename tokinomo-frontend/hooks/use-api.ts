"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/fetch";
import type {
  AnalyticsOverview,
  AudioClip,
  BillingOverview,
  CreateTenantPayload,
  Device,
  DwellSummary,
  OrgMember,
  Product,
  Tenant,
  TenantTier,
  TierCatalogItem,
} from "@/lib/api/types";

export function useTenants(enabled = true) {
  return useQuery({
    queryKey: ["tenants"],
    queryFn: () => apiFetch<Tenant[]>("/tenants"),
    enabled,
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
      void qc.invalidateQueries({ queryKey: ["billing"] });
    },
  });
}

export function useDevices(tenantId?: string | null) {
  return useQuery({
    queryKey: ["devices", tenantId ?? "all"],
    queryFn: () =>
      apiFetch<Device[]>("/devices", {
        tenantId: tenantId ?? undefined,
      }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["devices"] }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["devices"] }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users", tenantId] }),
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
