-- CreateTable
CREATE TABLE "Region" (
    "RegionID" SERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "RegionCode" VARCHAR(100) NOT NULL,
    "RegionName" VARCHAR(200) NOT NULL,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "Region_pkey" PRIMARY KEY ("RegionID")
);

-- CreateIndex
CREATE INDEX "Region_TenantID_CompanyID_idx" ON "Region"("TenantID", "CompanyID");

-- CreateIndex
CREATE UNIQUE INDEX "Region_Tenant_Company_Code_key" ON "Region"("TenantID", "CompanyID", "RegionCode");
