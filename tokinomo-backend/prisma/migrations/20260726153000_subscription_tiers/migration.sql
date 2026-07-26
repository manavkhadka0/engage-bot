-- Align tiers with business model (Basic / Growth / Brand) + subscriptions

-- Migrate existing enum values if present
DO $$ BEGIN
  ALTER TYPE "TenantTier" RENAME TO "TenantTier_old";
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

CREATE TYPE "TenantTier" AS ENUM ('BASIC', 'GROWTH', 'BRAND');

DO $$ BEGIN
  CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'SUSPENDED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Remap tenant.tier column if old enum existed
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TenantTier_old') THEN
    ALTER TABLE "tenant" ALTER COLUMN "tier" DROP DEFAULT;
    ALTER TABLE "tenant"
      ALTER COLUMN "tier" TYPE "TenantTier"
      USING (
        CASE "tier"::text
          WHEN 'BASE' THEN 'BASIC'::"TenantTier"
          WHEN 'PLUS' THEN 'GROWTH'::"TenantTier"
          WHEN 'BASIC' THEN 'BASIC'::"TenantTier"
          WHEN 'GROWTH' THEN 'GROWTH'::"TenantTier"
          WHEN 'BRAND' THEN 'BRAND'::"TenantTier"
          ELSE 'BASIC'::"TenantTier"
        END
      );
    ALTER TABLE "tenant" ALTER COLUMN "tier" SET DEFAULT 'BASIC'::"TenantTier";
    DROP TYPE "TenantTier_old";
  END IF;
END $$;

ALTER TABLE "tenant" ADD COLUMN IF NOT EXISTS "brand_logo_url" TEXT;
ALTER TABLE "tenant" ADD COLUMN IF NOT EXISTS "brand_domain" TEXT;

CREATE TABLE IF NOT EXISTS "subscription" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "tier" "TenantTier" NOT NULL DEFAULT 'BASIC',
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
  "price_per_device_npr" INTEGER NOT NULL,
  "trial_months" INTEGER NOT NULL DEFAULT 6,
  "trial_ends_at" TIMESTAMP(3) NOT NULL,
  "current_period_start" TIMESTAMP(3) NOT NULL,
  "current_period_end" TIMESTAMP(3) NOT NULL,
  "cancelled_at" TIMESTAMP(3),
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "subscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "subscription_tenant_id_key" ON "subscription"("tenant_id");

DO $$ BEGIN
  ALTER TABLE "subscription"
    ADD CONSTRAINT "subscription_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
