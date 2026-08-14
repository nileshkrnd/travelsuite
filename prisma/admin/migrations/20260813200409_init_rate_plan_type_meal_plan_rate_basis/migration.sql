-- CreateTable
CREATE TABLE "RatePlanType" (
    "RatePlanTypeID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "RatePlanTypeCode" VARCHAR(50) NOT NULL,
    "RatePlanTypeName" VARCHAR(100) NOT NULL,
    "Description" VARCHAR(500),
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "RatePlanType_pkey" PRIMARY KEY ("RatePlanTypeID")
);

-- CreateTable
CREATE TABLE "MealPlan" (
    "MealPlanID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "MealPlanCode" VARCHAR(20) NOT NULL,
    "MealPlanName" VARCHAR(100) NOT NULL,
    "Description" VARCHAR(500),
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "MealPlan_pkey" PRIMARY KEY ("MealPlanID")
);

-- CreateTable
CREATE TABLE "RateBasis" (
    "RateBasisID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "RateBasisCode" VARCHAR(50) NOT NULL,
    "RateBasisName" VARCHAR(100) NOT NULL,
    "Description" VARCHAR(500),
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "RateBasis_pkey" PRIMARY KEY ("RateBasisID")
);

-- CreateIndex
CREATE INDEX "RatePlanType_TenantID_CompanyID_idx" ON "RatePlanType"("TenantID", "CompanyID");

-- CreateIndex
CREATE UNIQUE INDEX "RatePlanType_Tenant_Company_Code_key" ON "RatePlanType"("TenantID", "CompanyID", "RatePlanTypeCode");

-- CreateIndex
CREATE INDEX "MealPlan_TenantID_CompanyID_idx" ON "MealPlan"("TenantID", "CompanyID");

-- CreateIndex
CREATE UNIQUE INDEX "MealPlan_Tenant_Company_Code_key" ON "MealPlan"("TenantID", "CompanyID", "MealPlanCode");

-- CreateIndex
CREATE INDEX "RateBasis_TenantID_CompanyID_idx" ON "RateBasis"("TenantID", "CompanyID");

-- CreateIndex
CREATE UNIQUE INDEX "RateBasis_Tenant_Company_Code_key" ON "RateBasis"("TenantID", "CompanyID", "RateBasisCode");
