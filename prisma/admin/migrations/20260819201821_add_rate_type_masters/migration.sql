-- CreateTable
CREATE TABLE "RateTypeGroupMaster" (
    "RateTypeGroupID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER,
    "CompanyID" INTEGER,
    "RateTypeGroupCode" VARCHAR(50) NOT NULL,
    "RateTypeGroupName" VARCHAR(100) NOT NULL,
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "RateTypeGroupMaster_pkey" PRIMARY KEY ("RateTypeGroupID")
);

-- CreateTable
CREATE TABLE "RateType" (
    "RateTypeID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER,
    "CompanyID" INTEGER,
    "RateTypeCode" VARCHAR(50) NOT NULL,
    "RateTypeName" VARCHAR(100) NOT NULL,
    "Description" VARCHAR(500),
    "RateTypeGroupID" BIGINT,
    "IsPaxType" BOOLEAN NOT NULL DEFAULT false,
    "IsQuantityType" BOOLEAN NOT NULL DEFAULT false,
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "RateType_pkey" PRIMARY KEY ("RateTypeID")
);

-- CreateIndex
CREATE INDEX "RateTypeGroupMaster_TenantID_CompanyID_idx" ON "RateTypeGroupMaster"("TenantID", "CompanyID");

-- CreateIndex
CREATE UNIQUE INDEX "RateTypeGroupMaster_Tenant_Company_Code_key" ON "RateTypeGroupMaster"("TenantID", "CompanyID", "RateTypeGroupCode");

-- CreateIndex
CREATE INDEX "RateType_TenantID_CompanyID_idx" ON "RateType"("TenantID", "CompanyID");

-- CreateIndex
CREATE INDEX "RateType_RateTypeGroupID_idx" ON "RateType"("RateTypeGroupID");

-- CreateIndex
CREATE UNIQUE INDEX "RateType_Tenant_Company_Code_key" ON "RateType"("TenantID", "CompanyID", "RateTypeCode");

-- AddForeignKey
ALTER TABLE "RateType" ADD CONSTRAINT "RateType_RateTypeGroupID_fkey" FOREIGN KEY ("RateTypeGroupID") REFERENCES "RateTypeGroupMaster"("RateTypeGroupID") ON DELETE RESTRICT ON UPDATE CASCADE;
