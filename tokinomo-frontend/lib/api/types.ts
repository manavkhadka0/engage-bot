export type TenantTier = "BASIC" | "GROWTH" | "BRAND";
export type TenantStatus = "ACTIVE" | "SUSPENDED" | "ARCHIVED";
export type SubscriptionStatus =
  | "TRIAL"
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELLED"
  | "SUSPENDED";
export type DeviceStatus =
  | "ONLINE"
  | "OFFLINE"
  | "PROVISIONING"
  | "UNASSIGNED"
  | "ERROR";

export type TenantRisk = {
  code: string;
  label: string;
  severity: "info" | "warn" | "critical";
};

export type TenantActivity = {
  at: string;
  kind: "audit" | "device" | "invite";
  label: string;
};

export type Tenant = {
  id: string;
  name: string;
  slug: string;
  tier: TenantTier;
  status: TenantStatus;
  createdAt: string;
  updatedAt?: string;
  brandLogoUrl?: string | null;
  brandDomain?: string | null;
  notes?: string | null;
  archivedAt?: string | null;
  adminEmail?: string | null;
  adminName?: string | null;
  memberCount?: number;
  deviceStatus?: { online: number; offline: number };
  subscription?: Subscription | null;
  _count?: {
    devices: number;
    products: number;
    locations?: number;
  };
};

export type TenantDetail = Tenant & {
  devices: Array<{
    id: string;
    serial: string;
    status: DeviceStatus;
    lastSeen: string | null;
    fwVersion: string | null;
    createdAt: string;
  }>;
  members: OrgMember[];
  invitations: Array<{
    id: string;
    email: string;
    role: string | null;
    status: string;
    expiresAt: string;
    createdAt: string;
  }>;
  analytics: AnalyticsOverview;
  health: {
    lastDeviceSeen: string | null;
    online: number;
    offline: number;
    deviceTotal: number;
    offlineRatio: number;
    queuedCommands: number;
    failedCommands: number;
  };
  risks: TenantRisk[];
  activity: TenantActivity[];
  trialDaysLeft: number | null;
};

export type Subscription = {
  id: string;
  tenantId: string;
  tier: TenantTier;
  status: SubscriptionStatus;
  pricePerDeviceNpr: number;
  trialMonths: number;
  trialEndsAt: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelledAt?: string | null;
  notes?: string | null;
};

export type BillingOverview = {
  tenant: {
    id: string;
    name: string;
    slug: string;
    tier: TenantTier;
    status: TenantStatus;
    brandLogoUrl?: string | null;
    brandDomain?: string | null;
  };
  subscription: Subscription;
  usage: {
    devices: number;
    audioClips: number;
    maxAudioClips: number;
  };
  features: string[];
  monthlyEstimateNpr: number;
  catalog: TierCatalogItem[];
};

export type TierCatalogItem = {
  tier: TenantTier;
  label: string;
  pricePerDeviceNpr: number;
  features: string[];
  maxAudioClips: number;
};

export type Device = {
  id: string;
  serial: string;
  status: DeviceStatus;
  tenantId: string | null;
  locationId: string | null;
  productId: string | null;
  provisionToken?: string | null;
  fwVersion?: string | null;
  firmwareVersion?: string | null;
  lastSeen?: string | null;
  lastSeenAt?: string | null;
  createdAt: string;
  tenant?: { id: string; name: string; slug: string } | null;
  location?: {
    id: string;
    name: string;
    lat: number | null;
    lng: number | null;
  } | null;
  product?: { id: string; name: string } | null;
  commands?: CommandAck[];
};

export type Product = {
  id: string;
  name: string;
  sku: string | null;
  imageUrl?: string | null;
  imageKey?: string | null;
  tenantId: string;
  createdAt: string;
};

export type Location = {
  id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  tenantId: string;
  createdAt: string;
};

export type AudioClip = {
  id: string;
  name: string;
  storageKey: string | null;
  checksum: string | null;
  durationMs: number | null;
  version: number;
  tenantId: string;
  createdAt: string;
};

export type AnalyticsOverview = {
  tenantId?: string;
  devices: { online: number; offline: number };
  today: { detections: number; plays: number };
};

export type PlaysSeriesPoint = {
  hour: number;
  label: string;
  plays: number;
  detections: number;
};

export type DwellSummary = {
  count: number;
  avgDwellMs: number;
  samples: Array<{ dwellMs: number | null; deviceId: string; ts: string }>;
};

export type OrgMember = {
  id: string;
  role: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
};

export type CreateTenantPayload = {
  name: string;
  slug: string;
  tier: TenantTier;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
};

export type UpdateTenantPayload = {
  name?: string;
  notes?: string | null;
  brandLogoUrl?: string | null;
  brandDomain?: string | null;
  tier?: TenantTier;
  status?: "ACTIVE" | "SUSPENDED";
  auditNote?: string;
};

export type CommandAck = {
  id: string;
  status: string;
  deviceId: string;
  type: string;
  createdAt: string;
  ackedAt: string | null;
};

export type DeviceListPage = {
  items: Device[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};

export type OpsAttentionItem = {
  id: string;
  severity: "critical" | "warn" | "info";
  title: string;
  detail: string;
  href: string;
};

export type OpsOverview = {
  totals: {
    tenants: number;
    devices: number;
    online: number;
    offline: number;
    error: number;
    provisioning: number;
    unassigned: number;
    onlineRate: number | null;
    attentionCount: number;
  };
  statusMix: Array<{ name: string; value: number }>;
  offlineByTenant: Array<{
    name: string;
    offline: number;
    total: number;
    tenantId: string;
  }>;
  attention: OpsAttentionItem[];
  attentionTruncated: boolean;
  recentTenants: Array<{
    id: string;
    name: string;
    slug: string;
    tier: TenantTier;
    status: TenantStatus;
    deviceCount: number;
    deviceStatus: { online: number; offline: number };
  }>;
};
