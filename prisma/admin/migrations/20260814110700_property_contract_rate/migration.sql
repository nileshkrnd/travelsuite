-- CreateTable
CREATE TABLE "OccupancyType" (
    "OccupancyTypeID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "OccupancyTypeCode" VARCHAR(50) NOT NULL,
    "OccupancyTypeName" VARCHAR(100) NOT NULL,
    "Description" VARCHAR(500),
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "OccupancyType_pkey" PRIMARY KEY ("OccupancyTypeID")
);

-- CreateIndex
CREATE UNIQUE INDEX "OccupancyType_Tenant_Company_Code_key" ON "OccupancyType"("TenantID", "CompanyID", "OccupancyTypeCode");

-- CreateIndex
CREATE INDEX "OccupancyType_TenantID_CompanyID_idx" ON "OccupancyType"("TenantID", "CompanyID");

-- CreateTable
CREATE TABLE "PropertyContractRate" (
    "PropertyContractRateID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "PropertyContractID" BIGINT NOT NULL,
    "PropertyContractSeasonPeriodID" BIGINT NOT NULL,
    "PropertyContractRatePlanID" BIGINT NOT NULL,
    "PropertyRoomTypeID" BIGINT NOT NULL,
    "OccupancyTypeID" BIGINT NOT NULL,
    "RateAmount" DECIMAL(18,4) NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "PropertyContractRate_pkey" PRIMARY KEY ("PropertyContractRateID")
);

-- CreateIndex
CREATE UNIQUE INDEX "PropertyContractRate_Unique_key" ON "PropertyContractRate"("TenantID", "PropertyContractID", "PropertyContractSeasonPeriodID", "PropertyContractRatePlanID", "PropertyRoomTypeID", "OccupancyTypeID");

-- CreateIndex
CREATE INDEX "PropertyContractRate_TenantID_CompanyID_idx" ON "PropertyContractRate"("TenantID", "CompanyID");

-- CreateIndex
CREATE INDEX "PropertyContractRate_PropertyContractID_idx" ON "PropertyContractRate"("PropertyContractID");

-- CreateIndex
CREATE INDEX "PropertyContractRate_SeasonPeriodID_idx" ON "PropertyContractRate"("PropertyContractSeasonPeriodID");

-- CreateIndex
CREATE INDEX "PropertyContractRate_RatePlanID_idx" ON "PropertyContractRate"("PropertyContractRatePlanID");

-- CreateIndex
CREATE INDEX "PropertyContractRate_PropertyRoomTypeID_idx" ON "PropertyContractRate"("PropertyRoomTypeID");

-- CreateIndex
CREATE INDEX "PropertyContractRate_OccupancyTypeID_idx" ON "PropertyContractRate"("OccupancyTypeID");

-- AddForeignKey
ALTER TABLE "PropertyContractRate" ADD CONSTRAINT "PropertyContractRate_PropertyContractID_fkey" FOREIGN KEY ("PropertyContractID") REFERENCES "PropertyContract"("PropertyContractID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyContractRate" ADD CONSTRAINT "PropertyContractRate_PropertyContractSeasonPeriodID_fkey" FOREIGN KEY ("PropertyContractSeasonPeriodID") REFERENCES "PropertyContractSeasonPeriod"("PropertyContractSeasonPeriodID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyContractRate" ADD CONSTRAINT "PropertyContractRate_PropertyContractRatePlanID_fkey" FOREIGN KEY ("PropertyContractRatePlanID") REFERENCES "PropertyContractRatePlan"("PropertyContractRatePlanID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyContractRate" ADD CONSTRAINT "PropertyContractRate_PropertyRoomTypeID_fkey" FOREIGN KEY ("PropertyRoomTypeID") REFERENCES "PropertyRoom"("PropertyRoomID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyContractRate" ADD CONSTRAINT "PropertyContractRate_OccupancyTypeID_fkey" FOREIGN KEY ("OccupancyTypeID") REFERENCES "OccupancyType"("OccupancyTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;
