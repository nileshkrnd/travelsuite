-- CreateTable
CREATE TABLE "ServiceProductItinerary" (
    "ServiceProductItineraryID" BIGSERIAL NOT NULL,
    "ServiceProductID" BIGINT NOT NULL,
    "ParentServiceProductItineraryID" BIGINT,
    "DayNumber" INTEGER,
    "SequenceNumber" INTEGER NOT NULL,
    "Title" VARCHAR(250) NOT NULL,
    "Description" TEXT,
    "DurationValue" DECIMAL(10,2),
    "DurationUnitID" BIGINT,
    "StartTime" TIME(6),
    "EndTime" TIME(6),
    "ServiceProductLocationID" BIGINT,
    "IsOvernight" BOOLEAN NOT NULL DEFAULT false,
    "IsOptional" BOOLEAN NOT NULL DEFAULT false,
    "IsHighlight" BOOLEAN NOT NULL DEFAULT false,
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "CommonStatusID" BIGINT NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "ServiceProductItinerary_pkey" PRIMARY KEY ("ServiceProductItineraryID")
);

-- CreateIndex
CREATE INDEX "SvcProductItinerary_ProductID_idx" ON "ServiceProductItinerary"("ServiceProductID");

-- CreateIndex
CREATE INDEX "SvcProductItinerary_ParentID_idx" ON "ServiceProductItinerary"("ParentServiceProductItineraryID");

-- CreateIndex
CREATE INDEX "SvcProductItinerary_DurationUnitID_idx" ON "ServiceProductItinerary"("DurationUnitID");

-- CreateIndex
CREATE INDEX "SvcProductItinerary_LocationID_idx" ON "ServiceProductItinerary"("ServiceProductLocationID");

-- CreateIndex
CREATE INDEX "SvcProductItinerary_CommonStatusID_idx" ON "ServiceProductItinerary"("CommonStatusID");

-- AddForeignKey
ALTER TABLE "ServiceProductItinerary" ADD CONSTRAINT "ServiceProductItinerary_ServiceProductID_fkey" FOREIGN KEY ("ServiceProductID") REFERENCES "ServiceProduct"("ServiceProductID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductItinerary" ADD CONSTRAINT "ServiceProductItinerary_ParentServiceProductItineraryID_fkey" FOREIGN KEY ("ParentServiceProductItineraryID") REFERENCES "ServiceProductItinerary"("ServiceProductItineraryID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductItinerary" ADD CONSTRAINT "ServiceProductItinerary_DurationUnitID_fkey" FOREIGN KEY ("DurationUnitID") REFERENCES "DurationUnit"("DurationUnitID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductItinerary" ADD CONSTRAINT "ServiceProductItinerary_ServiceProductLocationID_fkey" FOREIGN KEY ("ServiceProductLocationID") REFERENCES "ServiceProductLocation"("ServiceProductLocationID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductItinerary" ADD CONSTRAINT "ServiceProductItinerary_CommonStatusID_fkey" FOREIGN KEY ("CommonStatusID") REFERENCES "CommonStatus"("CommonStatusID") ON DELETE RESTRICT ON UPDATE CASCADE;
