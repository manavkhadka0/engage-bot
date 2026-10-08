/**
 * Subscription tier catalogue + feature gates.
 * Prices from BUSINESS_MODEL.md (NPR / device / month).
 */

export type FeatureKey =
  | 'device_health'
  | 'single_clip'
  | 'multi_clip'
  | 'campaign_schedule'
  | 'plays_uptime'
  | 'dwell_analytics'
  | 'per_store_breakdown'
  | 'monthly_report'
  | 'adaptive_audio'
  | 'api_access'
  | 'white_label'
  | 'priority_support'
  | 'dedicated_onboarding';

export const TIER_PRICING_NPR = {
  BASIC: 500,
  GROWTH: 800,
  BRAND: 1200,
} as const;

export type CatalogTier = keyof typeof TIER_PRICING_NPR;

const BASIC_FEATURES: FeatureKey[] = [
  'device_health',
  'single_clip',
  'plays_uptime',
];

const GROWTH_FEATURES: FeatureKey[] = [
  ...BASIC_FEATURES.filter((f) => f !== 'single_clip'),
  'multi_clip',
  'campaign_schedule',
  'dwell_analytics',
  'per_store_breakdown',
  'monthly_report',
  'priority_support',
];

const BRAND_FEATURES: FeatureKey[] = [
  ...GROWTH_FEATURES,
  'adaptive_audio',
  'api_access',
  'white_label',
  'dedicated_onboarding',
];

export const TIER_FEATURES: Record<CatalogTier, FeatureKey[]> = {
  BASIC: BASIC_FEATURES,
  GROWTH: GROWTH_FEATURES,
  BRAND: BRAND_FEATURES,
};

export const TIER_LABELS: Record<CatalogTier, string> = {
  BASIC: 'Basic',
  GROWTH: 'Growth',
  BRAND: 'Brand / Enterprise',
};

export function tierHasFeature(
  tier: CatalogTier | string,
  feature: FeatureKey,
): boolean {
  const features = TIER_FEATURES[tier as CatalogTier];
  if (!features) return false;
  return features.includes(feature);
}

export function maxAudioClips(tier: CatalogTier | string): number {
  if (tier === 'BASIC') return 1;
  return Number.POSITIVE_INFINITY;
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}
