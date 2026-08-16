-- CreateTable
CREATE TABLE "PropertyRoomAvailabilityRate" (
    "PropertyRoomAvailabilityRateID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "PropertyRoomAvailabilityID" BIGINT NOT NULL,
    "PropertyContractRatePlanID" BIGINT NOT NULL,
    "OccupancyTypeID" BIGINT NOT NULL,
    "RateAmount" DECIMAL(18,4) NOT NULL,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "PropertyRoomAvailabilityRate_pkey" PRIMARY KEY ("PropertyRoomAvailabilityRateID")
);

-- CreateIndex
CREATE INDEX "PropertyRoomAvailabilityRate_AvailabilityID_idx" ON "PropertyRoomAvailabilityRate"("PropertyRoomAvailabilityID");

-- CreateIndex
CREATE INDEX "PropertyRoomAvailabilityRate_RatePlanID_idx" ON "PropertyRoomAvailabilityRate"("PropertyContractRatePlanID");

-- CreateIndex
CREATE INDEX "PropertyRoomAvailabilityRate_OccupancyTypeID_idx" ON "PropertyRoomAvailabilityRate"("OccupancyTypeID");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyRoomAvailabilityRate_Unique_key" ON "PropertyRoomAvailabilityRate"("TenantID", "PropertyRoomAvailabilityID", "PropertyContractRatePlanID", "OccupancyTypeID");

-- AddForeignKey
ALTER TABLE "PropertyRoomAvailabilityRate" ADD CONSTRAINT "PropertyRoomAvailabilityRate_PropertyRoomAvailabilityID_fkey" FOREIGN KEY ("PropertyRoomAvailabilityID") REFERENCES "PropertyRoomAvailability"("PropertyRoomAvailabilityID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyRoomAvailabilityRate" ADD CONSTRAINT "PropertyRoomAvailabilityRate_PropertyContractRatePlanID_fkey" FOREIGN KEY ("PropertyContractRatePlanID") REFERENCES "PropertyContractRatePlan"("PropertyContractRatePlanID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyRoomAvailabilityRate" ADD CONSTRAINT "PropertyRoomAvailabilityRate_OccupancyTypeID_fkey" FOREIGN KEY ("OccupancyTypeID") REFERENCES "OccupancyType"("OccupancyTypeID") ON DELETE CASCADE ON UPDATE CASCADE;
