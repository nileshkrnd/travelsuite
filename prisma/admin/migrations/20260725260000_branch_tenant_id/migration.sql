-- AlterTable
ALTER TABLE "Branch" ADD COLUMN "TenantID" INTEGER;

-- Backfill from Company
UPDATE "Branch" AS b
SET "TenantID" = c."TenantID"
FROM "Company" AS c
WHERE b."CompanyID" = c."CompanyID";

-- Failsafe for any orphan rows
UPDATE "Branch" SET "TenantID" = 0 WHERE "TenantID" IS NULL;

ALTER TABLE "Branch" ALTER COLUMN "TenantID" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Branch_TenantID_idx" ON "Branch"("TenantID");
CREATE INDEX "Branch_TenantID_CompanyID_idx" ON "Branch"("TenantID", "CompanyID");
