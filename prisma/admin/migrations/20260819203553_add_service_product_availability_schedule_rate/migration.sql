-- CreateTable
CREATE TABLE "ServiceProductSupplier" (
    "ServiceProductSupplierID" BIGSERIAL NOT NULL,
    "ServiceProductID" BIGINT NOT NULL,
    "SupplierID" BIGINT NOT NULL,
    "SupplierProductCode" VARCHAR(100),
    "IsPrimary" BOOLEAN NOT NULL DEFAULT false,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "ValidFrom" DATE,
    "ValidTo" DATE,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "ServiceProductSupplier_pkey" PRIMARY KEY ("ServiceProductSupplierID")
);

-- CreateTable
CREATE TABLE "ServiceProductAvailability" (
    "ServiceProductAvailabilityID" BIGSERIAL NOT NULL,
    "ServiceProductID" BIGINT NOT NULL,
    "ServiceProductOptionID" BIGINT,
    "ServiceProductVariantID" BIGINT,
    "BookingFromDate" DATE,
    "BookingToDate" DATE,
    "ServiceFromDate" DATE,
    "ServiceToDate" DATE,
    "IsAvailable" BOOLEAN NOT NULL DEFAULT true,
    "CommonStatusID" BIGINT NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "ServiceProductAvailability_pkey" PRIMARY KEY ("ServiceProductAvailabilityID")
);

-- CreateTable
CREATE TABLE "ServiceProductAvailabilityDay" (
    "ServiceProductAvailabilityDayID" BIGSERIAL NOT NULL,
    "ServiceProductAvailabilityID" BIGINT NOT NULL,
    "DayOfWeekID" BIGINT NOT NULL,
    "IsAvailable" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "ServiceProductAvailabilityDay_pkey" PRIMARY KEY ("ServiceProductAvailabilityDayID")
);

-- CreateTable
CREATE TABLE "ServiceProductSchedule" (
    "ServiceProductScheduleID" BIGSERIAL NOT NULL,
    "ServiceProductAvailabilityID" BIGINT NOT NULL,
    "ServiceProductID" BIGINT NOT NULL,
    "ServiceProductOptionID" BIGINT,
    "ServiceProductVariantID" BIGINT,
    "DayOfWeekID" BIGINT,
    "StartTime" TIME(6),
    "EndTime" TIME(6),
    "Capacity" INTEGER,
    "IsAvailable" BOOLEAN NOT NULL DEFAULT true,
    "CommonStatusID" BIGINT NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "ServiceProductSchedule_pkey" PRIMARY KEY ("ServiceProductScheduleID")
);

-- CreateTable
CREATE TABLE "ServiceProductRate" (
    "ServiceProductRateID" BIGSERIAL NOT NULL,
    "ServiceProductID" BIGINT NOT NULL,
    "ServiceProductSupplierID" BIGINT NOT NULL,
    "ServiceProductOptionID" BIGINT,
    "ServiceProductVariantID" BIGINT,
    "ServiceProductScheduleID" BIGINT,
    "RateTypeID" BIGINT NOT NULL,
    "MinimumPax" INTEGER,
    "MaximumPax" INTEGER,
    "MinimumQuantity" DECIMAL(10,2),
    "MaximumQuantity" DECIMAL(10,2),
    "RateAmount" DECIMAL(18,4) NOT NULL,
    "ValidFrom" DATE,
    "ValidTo" DATE,
    "CommonStatusID" BIGINT NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "ServiceProductRate_pkey" PRIMARY KEY ("ServiceProductRateID")
);

-- CreateIndex
CREATE INDEX "SvcProductSupplier_SupplierID_idx" ON "ServiceProductSupplier"("SupplierID");

-- CreateIndex
CREATE UNIQUE INDEX "SvcProductSupplier_Product_Supplier_key" ON "ServiceProductSupplier"("ServiceProductID", "SupplierID");

-- CreateIndex
CREATE INDEX "SvcProductAvail_ProductID_idx" ON "ServiceProductAvailability"("ServiceProductID");

-- CreateIndex
CREATE INDEX "SvcProductAvail_OptionID_idx" ON "ServiceProductAvailability"("ServiceProductOptionID");

-- CreateIndex
CREATE INDEX "SvcProductAvail_VariantID_idx" ON "ServiceProductAvailability"("ServiceProductVariantID");

-- CreateIndex
CREATE INDEX "SvcProductAvail_CommonStatusID_idx" ON "ServiceProductAvailability"("CommonStatusID");

-- CreateIndex
CREATE INDEX "SvcProductAvailDay_DayOfWeekID_idx" ON "ServiceProductAvailabilityDay"("DayOfWeekID");

-- CreateIndex
CREATE UNIQUE INDEX "SvcProductAvailDay_Avail_Day_key" ON "ServiceProductAvailabilityDay"("ServiceProductAvailabilityID", "DayOfWeekID");

-- CreateIndex
CREATE INDEX "SvcProductSchedule_AvailID_idx" ON "ServiceProductSchedule"("ServiceProductAvailabilityID");

-- CreateIndex
CREATE INDEX "SvcProductSchedule_ProductID_idx" ON "ServiceProductSchedule"("ServiceProductID");

-- CreateIndex
CREATE INDEX "SvcProductSchedule_OptionID_idx" ON "ServiceProductSchedule"("ServiceProductOptionID");

-- CreateIndex
CREATE INDEX "SvcProductSchedule_VariantID_idx" ON "ServiceProductSchedule"("ServiceProductVariantID");

-- CreateIndex
CREATE INDEX "SvcProductSchedule_DayOfWeekID_idx" ON "ServiceProductSchedule"("DayOfWeekID");

-- CreateIndex
CREATE INDEX "SvcProductSchedule_CommonStatusID_idx" ON "ServiceProductSchedule"("CommonStatusID");

-- CreateIndex
CREATE INDEX "SvcProductRate_ProductID_idx" ON "ServiceProductRate"("ServiceProductID");

-- CreateIndex
CREATE INDEX "SvcProductRate_SupplierLinkID_idx" ON "ServiceProductRate"("ServiceProductSupplierID");

-- CreateIndex
CREATE INDEX "SvcProductRate_OptionID_idx" ON "ServiceProductRate"("ServiceProductOptionID");

-- CreateIndex
CREATE INDEX "SvcProductRate_VariantID_idx" ON "ServiceProductRate"("ServiceProductVariantID");

-- CreateIndex
CREATE INDEX "SvcProductRate_ScheduleID_idx" ON "ServiceProductRate"("ServiceProductScheduleID");

-- CreateIndex
CREATE INDEX "SvcProductRate_RateTypeID_idx" ON "ServiceProductRate"("RateTypeID");

-- CreateIndex
CREATE INDEX "SvcProductRate_CommonStatusID_idx" ON "ServiceProductRate"("CommonStatusID");

-- AddForeignKey
ALTER TABLE "ServiceProductSupplier" ADD CONSTRAINT "ServiceProductSupplier_ServiceProductID_fkey" FOREIGN KEY ("ServiceProductID") REFERENCES "ServiceProduct"("ServiceProductID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductSupplier" ADD CONSTRAINT "ServiceProductSupplier_SupplierID_fkey" FOREIGN KEY ("SupplierID") REFERENCES "Supplier"("SupplierID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductAvailability" ADD CONSTRAINT "ServiceProductAvailability_ServiceProductID_fkey" FOREIGN KEY ("ServiceProductID") REFERENCES "ServiceProduct"("ServiceProductID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductAvailability" ADD CONSTRAINT "ServiceProductAvailability_ServiceProductOptionID_fkey" FOREIGN KEY ("ServiceProductOptionID") REFERENCES "ServiceProductOption"("ServiceProductOptionID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductAvailability" ADD CONSTRAINT "ServiceProductAvailability_ServiceProductVariantID_fkey" FOREIGN KEY ("ServiceProductVariantID") REFERENCES "ServiceProductVariant"("ServiceProductVariantID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductAvailability" ADD CONSTRAINT "ServiceProductAvailability_CommonStatusID_fkey" FOREIGN KEY ("CommonStatusID") REFERENCES "CommonStatus"("CommonStatusID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductAvailabilityDay" ADD CONSTRAINT "ServiceProductAvailabilityDay_ServiceProductAvailabilityID_fkey" FOREIGN KEY ("ServiceProductAvailabilityID") REFERENCES "ServiceProductAvailability"("ServiceProductAvailabilityID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductAvailabilityDay" ADD CONSTRAINT "ServiceProductAvailabilityDay_DayOfWeekID_fkey" FOREIGN KEY ("DayOfWeekID") REFERENCES "DayOfWeek"("DayOfWeekID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductSchedule" ADD CONSTRAINT "ServiceProductSchedule_ServiceProductAvailabilityID_fkey" FOREIGN KEY ("ServiceProductAvailabilityID") REFERENCES "ServiceProductAvailability"("ServiceProductAvailabilityID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductSchedule" ADD CONSTRAINT "ServiceProductSchedule_ServiceProductID_fkey" FOREIGN KEY ("ServiceProductID") REFERENCES "ServiceProduct"("ServiceProductID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductSchedule" ADD CONSTRAINT "ServiceProductSchedule_ServiceProductOptionID_fkey" FOREIGN KEY ("ServiceProductOptionID") REFERENCES "ServiceProductOption"("ServiceProductOptionID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductSchedule" ADD CONSTRAINT "ServiceProductSchedule_ServiceProductVariantID_fkey" FOREIGN KEY ("ServiceProductVariantID") REFERENCES "ServiceProductVariant"("ServiceProductVariantID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductSchedule" ADD CONSTRAINT "ServiceProductSchedule_DayOfWeekID_fkey" FOREIGN KEY ("DayOfWeekID") REFERENCES "DayOfWeek"("DayOfWeekID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductSchedule" ADD CONSTRAINT "ServiceProductSchedule_CommonStatusID_fkey" FOREIGN KEY ("CommonStatusID") REFERENCES "CommonStatus"("CommonStatusID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductRate" ADD CONSTRAINT "ServiceProductRate_ServiceProductID_fkey" FOREIGN KEY ("ServiceProductID") REFERENCES "ServiceProduct"("ServiceProductID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductRate" ADD CONSTRAINT "ServiceProductRate_ServiceProductSupplierID_fkey" FOREIGN KEY ("ServiceProductSupplierID") REFERENCES "ServiceProductSupplier"("ServiceProductSupplierID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductRate" ADD CONSTRAINT "ServiceProductRate_ServiceProductOptionID_fkey" FOREIGN KEY ("ServiceProductOptionID") REFERENCES "ServiceProductOption"("ServiceProductOptionID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductRate" ADD CONSTRAINT "ServiceProductRate_ServiceProductVariantID_fkey" FOREIGN KEY ("ServiceProductVariantID") REFERENCES "ServiceProductVariant"("ServiceProductVariantID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductRate" ADD CONSTRAINT "ServiceProductRate_ServiceProductScheduleID_fkey" FOREIGN KEY ("ServiceProductScheduleID") REFERENCES "ServiceProductSchedule"("ServiceProductScheduleID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductRate" ADD CONSTRAINT "ServiceProductRate_RateTypeID_fkey" FOREIGN KEY ("RateTypeID") REFERENCES "RateType"("RateTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductRate" ADD CONSTRAINT "ServiceProductRate_CommonStatusID_fkey" FOREIGN KEY ("CommonStatusID") REFERENCES "CommonStatus"("CommonStatusID") ON DELETE RESTRICT ON UPDATE CASCADE;
