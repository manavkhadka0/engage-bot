-- AlterEnum
ALTER TYPE "TenantStatus" ADD VALUE 'ARCHIVED';

-- AlterTable
ALTER TABLE "tenant" ADD COLUMN "notes" TEXT;
ALTER TABLE "tenant" ADD COLUMN "archived_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "tenant_audit_log" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "action" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "meta" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tenant_audit_log_tenant_id_created_at_idx" ON "tenant_audit_log"("tenant_id", "created_at");

-- AddForeignKey
ALTER TABLE "tenant_audit_log" ADD CONSTRAINT "tenant_audit_log_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
