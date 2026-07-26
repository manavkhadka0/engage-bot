-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TenantTier" AS ENUM ('BASE', 'PLUS');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('UNASSIGNED', 'PROVISIONING', 'ONLINE', 'OFFLINE');

-- CreateEnum
CREATE TYPE "DeviceEventType" AS ENUM ('DETECTION', 'DWELL', 'PLAY', 'ONLINE', 'OFFLINE');

-- CreateEnum
CREATE TYPE "CommandType" AS ENUM ('AUDIO_UPDATE', 'PLAY', 'REBOOT', 'CONFIG');

-- CreateEnum
CREATE TYPE "CommandStatus" AS ENUM ('QUEUED', 'SENT', 'ACKED', 'FAILED');

-- CreateTable
CREATE TABLE "tenant" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "tier" "TenantTier" NOT NULL DEFAULT 'BASE',
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "image_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device" (
    "id" UUID NOT NULL,
    "serial" TEXT NOT NULL,
    "tenant_id" UUID,
    "location_id" UUID,
    "product_id" UUID,
    "fw_version" TEXT,
    "status" "DeviceStatus" NOT NULL DEFAULT 'UNASSIGNED',
    "provision_token" TEXT,
    "last_seen" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audio_clip" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "duration_ms" INTEGER,
    "checksum" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audio_clip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_audio" (
    "device_id" UUID NOT NULL,
    "audio_clip_id" UUID NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "device_audio_pkey" PRIMARY KEY ("device_id","audio_clip_id")
);

-- CreateTable
CREATE TABLE "device_event" (
    "id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "DeviceEventType" NOT NULL,
    "dwell_ms" INTEGER,
    "meta" JSONB,

    CONSTRAINT "device_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "command" (
    "id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "type" "CommandType" NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "CommandStatus" NOT NULL DEFAULT 'QUEUED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "acked_at" TIMESTAMP(3),

    CONSTRAINT "command_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_slug_key" ON "tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "user_tenant_id_idx" ON "user"("tenant_id");

-- CreateIndex
CREATE INDEX "product_tenant_id_idx" ON "product"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_tenant_id_sku_key" ON "product"("tenant_id", "sku");

-- CreateIndex
CREATE INDEX "location_tenant_id_idx" ON "location"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "device_serial_key" ON "device"("serial");

-- CreateIndex
CREATE INDEX "device_tenant_id_idx" ON "device"("tenant_id");

-- CreateIndex
CREATE INDEX "device_status_idx" ON "device"("status");

-- CreateIndex
CREATE INDEX "audio_clip_tenant_id_idx" ON "audio_clip"("tenant_id");

-- CreateIndex
CREATE INDEX "device_event_tenant_id_ts_idx" ON "device_event"("tenant_id", "ts");

-- CreateIndex
CREATE INDEX "device_event_device_id_ts_idx" ON "device_event"("device_id", "ts");

-- CreateIndex
CREATE INDEX "command_device_id_status_idx" ON "command"("device_id", "status");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location" ADD CONSTRAINT "location_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device" ADD CONSTRAINT "device_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device" ADD CONSTRAINT "device_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device" ADD CONSTRAINT "device_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_clip" ADD CONSTRAINT "audio_clip_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_audio" ADD CONSTRAINT "device_audio_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_audio" ADD CONSTRAINT "device_audio_audio_clip_id_fkey" FOREIGN KEY ("audio_clip_id") REFERENCES "audio_clip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_event" ADD CONSTRAINT "device_event_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_event" ADD CONSTRAINT "device_event_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "command" ADD CONSTRAINT "command_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

