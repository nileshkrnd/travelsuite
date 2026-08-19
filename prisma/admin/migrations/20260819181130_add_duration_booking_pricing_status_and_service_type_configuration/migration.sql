-- CreateTable
CREATE TABLE "DurationUnit" (
    "DurationUnitID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER,
    "CompanyID" INTEGER,
    "DurationUnitCode" VARCHAR(50) NOT NULL,
    "DurationUnitName" VARCHAR(100) NOT NULL,
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "DurationUnit_pkey" PRIMARY KEY ("DurationUnitID")
);

-- CreateTable
CREATE TABLE "BookingModel" (
    "BookingModelID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER,
    "CompanyID" INTEGER,
    "BookingModelCode" VARCHAR(50) NOT NULL,
    "BookingModelName" VARCHAR(100) NOT NULL,
    "Description" VARCHAR(500),
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "BookingModel_pkey" PRIMARY KEY ("BookingModelID")
);

-- CreateTable
CREATE TABLE "PricingModel" (
    "PricingModelID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER,
    "CompanyID" INTEGER,
    "PricingModelCode" VARCHAR(50) NOT NULL,
    "PricingModelName" VARCHAR(100) NOT NULL,
    "Description" VARCHAR(500),
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "PricingModel_pkey" PRIMARY KEY ("PricingModelID")
);

-- CreateTable
CREATE TABLE "CommonStatusType" (
    "CommonStatusTypeID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER,
    "CompanyID" INTEGER,
    "StatusTypeCode" VARCHAR(50) NOT NULL,
    "StatusTypeName" VARCHAR(100) NOT NULL,
    "Description" VARCHAR(500),
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "CommonStatusType_pkey" PRIMARY KEY ("CommonStatusTypeID")
);

-- CreateTable
CREATE TABLE "CommonStatus" (
    "CommonStatusID" BIGSERIAL NOT NULL,
    "CommonStatusTypeID" BIGINT NOT NULL,
    "TenantID" INTEGER,
    "CompanyID" INTEGER,
    "StatusCode" VARCHAR(50) NOT NULL,
    "StatusName" VARCHAR(100) NOT NULL,
    "Description" VARCHAR(500),
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsInitial" BOOLEAN NOT NULL DEFAULT false,
    "IsFinal" BOOLEAN NOT NULL DEFAULT false,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "CommonStatus_pkey" PRIMARY KEY ("CommonStatusID")
);

-- CreateTable
CREATE TABLE "ServiceTypeConfiguration" (
    "ServiceTypeConfigurationID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER,
    "CompanyID" INTEGER,
    "ServiceTypeID" BIGINT NOT NULL,
    "IsDurationApplicable" BOOLEAN NOT NULL DEFAULT false,
    "IsBookingModelApplicable" BOOLEAN NOT NULL DEFAULT false,
    "IsPricingModelApplicable" BOOLEAN NOT NULL DEFAULT false,
    "IsPaxApplicable" BOOLEAN NOT NULL DEFAULT false,
    "IsAgeApplicable" BOOLEAN NOT NULL DEFAULT false,
    "IsPickupApplicable" BOOLEAN NOT NULL DEFAULT false,
    "IsDropoffApplicable" BOOLEAN NOT NULL DEFAULT false,
    "IsScheduleApplicable" BOOLEAN NOT NULL DEFAULT false,
    "IsAvailabilityApplicable" BOOLEAN NOT NULL DEFAULT false,
    "IsItineraryApplicable" BOOLEAN NOT NULL DEFAULT false,
    "IsCancellationApplicable" BOOLEAN NOT NULL DEFAULT false,
    "IsOnlineSellable" BOOLEAN NOT NULL DEFAULT false,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "ServiceTypeConfiguration_pkey" PRIMARY KEY ("ServiceTypeConfigurationID")
);

-- CreateIndex
CREATE INDEX "DurationUnit_TenantID_CompanyID_idx" ON "DurationUnit"("TenantID", "CompanyID");

-- CreateIndex
CREATE UNIQUE INDEX "DurationUnit_Tenant_Company_Code_key" ON "DurationUnit"("TenantID", "CompanyID", "DurationUnitCode");

-- CreateIndex
CREATE INDEX "BookingModel_TenantID_CompanyID_idx" ON "BookingModel"("TenantID", "CompanyID");

-- CreateIndex
CREATE UNIQUE INDEX "BookingModel_Tenant_Company_Code_key" ON "BookingModel"("TenantID", "CompanyID", "BookingModelCode");

-- CreateIndex
CREATE INDEX "PricingModel_TenantID_CompanyID_idx" ON "PricingModel"("TenantID", "CompanyID");

-- CreateIndex
CREATE UNIQUE INDEX "PricingModel_Tenant_Company_Code_key" ON "PricingModel"("TenantID", "CompanyID", "PricingModelCode");

-- CreateIndex
CREATE INDEX "CommonStatusType_TenantID_CompanyID_idx" ON "CommonStatusType"("TenantID", "CompanyID");

-- CreateIndex
CREATE UNIQUE INDEX "CommonStatusType_Tenant_Company_Code_key" ON "CommonStatusType"("TenantID", "CompanyID", "StatusTypeCode");

-- CreateIndex
CREATE INDEX "CommonStatus_TenantID_CompanyID_idx" ON "CommonStatus"("TenantID", "CompanyID");

-- CreateIndex
CREATE INDEX "CommonStatus_StatusTypeID_idx" ON "CommonStatus"("CommonStatusTypeID");

-- CreateIndex
CREATE UNIQUE INDEX "CommonStatus_Tenant_Company_Type_Code_key" ON "CommonStatus"("TenantID", "CompanyID", "CommonStatusTypeID", "StatusCode");

-- CreateIndex
CREATE INDEX "ServiceTypeConfiguration_ServiceTypeID_idx" ON "ServiceTypeConfiguration"("ServiceTypeID");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceTypeConfiguration_Tenant_Company_Type_key" ON "ServiceTypeConfiguration"("TenantID", "CompanyID", "ServiceTypeID");

-- AddForeignKey
ALTER TABLE "CommonStatus" ADD CONSTRAINT "CommonStatus_CommonStatusTypeID_fkey" FOREIGN KEY ("CommonStatusTypeID") REFERENCES "CommonStatusType"("CommonStatusTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceTypeConfiguration" ADD CONSTRAINT "ServiceTypeConfiguration_ServiceTypeID_fkey" FOREIGN KEY ("ServiceTypeID") REFERENCES "ServiceTypeMaster"("ServiceTypeID") ON DELETE CASCADE ON UPDATE CASCADE;
