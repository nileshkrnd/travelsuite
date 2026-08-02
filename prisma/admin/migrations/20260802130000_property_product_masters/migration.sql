-- CreateTable
CREATE TABLE "PropertyCategory" (
    "PropertyCategoryID" SERIAL NOT NULL,
    "PropertyCategoryName" VARCHAR(100) NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    CONSTRAINT "PropertyCategory_pkey" PRIMARY KEY ("PropertyCategoryID")
);
CREATE INDEX "PropertyCategory_TenantID_CompanyID_idx" ON "PropertyCategory"("TenantID", "CompanyID");
CREATE UNIQUE INDEX "PropertyCategory_Tenant_Company_Name_key" ON "PropertyCategory"("TenantID", "CompanyID", "PropertyCategoryName");

-- CreateTable
CREATE TABLE "PropertyUsage" (
    "PropertyUsageID" SERIAL NOT NULL,
    "PropertyUsageName" VARCHAR(100) NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    CONSTRAINT "PropertyUsage_pkey" PRIMARY KEY ("PropertyUsageID")
);
CREATE INDEX "PropertyUsage_TenantID_CompanyID_idx" ON "PropertyUsage"("TenantID", "CompanyID");
CREATE UNIQUE INDEX "PropertyUsage_Tenant_Company_Name_key" ON "PropertyUsage"("TenantID", "CompanyID", "PropertyUsageName");

-- CreateTable
CREATE TABLE "OwnershipType" (
    "OwnershipTypeID" SERIAL NOT NULL,
    "OwnershipTypeName" VARCHAR(100) NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    CONSTRAINT "OwnershipType_pkey" PRIMARY KEY ("OwnershipTypeID")
);
CREATE INDEX "OwnershipType_TenantID_CompanyID_idx" ON "OwnershipType"("TenantID", "CompanyID");
CREATE UNIQUE INDEX "OwnershipType_Tenant_Company_Name_key" ON "OwnershipType"("TenantID", "CompanyID", "OwnershipTypeName");

-- CreateTable
CREATE TABLE "PropertyBrand" (
    "PropertyBrandID" SERIAL NOT NULL,
    "PropertyBrandName" VARCHAR(100) NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    CONSTRAINT "PropertyBrand_pkey" PRIMARY KEY ("PropertyBrandID")
);
CREATE INDEX "PropertyBrand_TenantID_CompanyID_idx" ON "PropertyBrand"("TenantID", "CompanyID");
CREATE UNIQUE INDEX "PropertyBrand_Tenant_Company_Name_key" ON "PropertyBrand"("TenantID", "CompanyID", "PropertyBrandName");
