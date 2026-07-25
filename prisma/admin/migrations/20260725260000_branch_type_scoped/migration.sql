-- DropIndex
DROP INDEX "BranchType_BranchTypeName_key";

-- AlterTable
ALTER TABLE "BranchType" ADD COLUMN "TenantID" INTEGER NOT NULL,
ADD COLUMN "CompanyID" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "BranchType_TenantID_CompanyID_idx" ON "BranchType"("TenantID", "CompanyID");

-- CreateIndex
CREATE UNIQUE INDEX "BranchType_Tenant_Company_Name_key" ON "BranchType"("TenantID", "CompanyID", "BranchTypeName");
