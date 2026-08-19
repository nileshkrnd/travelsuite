-- CreateTable
CREATE TABLE "ServiceTypeMaster" (
    "ServiceTypeID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "ServiceTypeCode" VARCHAR(50) NOT NULL,
    "ServiceTypeName" VARCHAR(100) NOT NULL,
    "Description" VARCHAR(500),
    "Icon" VARCHAR(200),
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "ServiceTypeMaster_pkey" PRIMARY KEY ("ServiceTypeID")
);

-- CreateTable
CREATE TABLE "ServiceProductClassificationMaster" (
    "ServiceProductClassificationID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "ServiceTypeID" BIGINT NOT NULL,
    "ClassificationCode" VARCHAR(50) NOT NULL,
    "ClassificationName" VARCHAR(150) NOT NULL,
    "ParentClassificationID" BIGINT,
    "Description" VARCHAR(500),
    "Icon" VARCHAR(200),
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "ServiceProductClassificationMaster_pkey" PRIMARY KEY ("ServiceProductClassificationID")
);

-- CreateIndex
CREATE INDEX "ServiceTypeMaster_TenantID_CompanyID_idx" ON "ServiceTypeMaster"("TenantID", "CompanyID");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceTypeMaster_Tenant_Company_Code_key" ON "ServiceTypeMaster"("TenantID", "CompanyID", "ServiceTypeCode");

-- CreateIndex
CREATE INDEX "ServiceProductClassificationMaster_TenantID_CompanyID_idx" ON "ServiceProductClassificationMaster"("TenantID", "CompanyID");

-- CreateIndex
CREATE INDEX "ServiceProductClassificationMaster_ServiceTypeID_idx" ON "ServiceProductClassificationMaster"("ServiceTypeID");

-- CreateIndex
CREATE INDEX "ServiceProductClassificationMaster_ParentClassificationID_idx" ON "ServiceProductClassificationMaster"("ParentClassificationID");

-- CreateIndex
CREATE UNIQUE INDEX "SvcProductClassification_Tenant_Company_Type_Code_key" ON "ServiceProductClassificationMaster"("TenantID", "CompanyID", "ServiceTypeID", "ClassificationCode");

-- AddForeignKey
ALTER TABLE "ServiceProductClassificationMaster" ADD CONSTRAINT "ServiceProductClassificationMaster_ServiceTypeID_fkey" FOREIGN KEY ("ServiceTypeID") REFERENCES "ServiceTypeMaster"("ServiceTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductClassificationMaster" ADD CONSTRAINT "ServiceProductClassificationMaster_ParentClassificationID_fkey" FOREIGN KEY ("ParentClassificationID") REFERENCES "ServiceProductClassificationMaster"("ServiceProductClassificationID") ON DELETE RESTRICT ON UPDATE RESTRICT;
