-- CreateTable
CREATE TABLE "ServiceProduct" (
    "ServiceProductID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "ServiceProductCode" VARCHAR(50) NOT NULL,
    "ServiceProductName" VARCHAR(250) NOT NULL,
    "ServiceTypeID" BIGINT NOT NULL,
    "ServiceProductClassificationID" BIGINT NOT NULL,
    "ServiceProductCategoryID" BIGINT,
    "SupplierID" BIGINT,
    "CountryID" INTEGER,
    "RegionID" INTEGER,
    "CityID" INTEGER,
    "ShortDescription" VARCHAR(1000),
    "Description" TEXT,
    "IsOnlineSellable" BOOLEAN NOT NULL DEFAULT false,
    "IsFeatured" BOOLEAN NOT NULL DEFAULT false,
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "CommonStatusID" BIGINT NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "ServiceProduct_pkey" PRIMARY KEY ("ServiceProductID")
);

-- CreateTable
CREATE TABLE "ServiceProductConfiguration" (
    "ServiceProductConfigurationID" BIGSERIAL NOT NULL,
    "ServiceProductID" BIGINT NOT NULL,
    "DurationValue" DECIMAL(10,2),
    "DurationUnitID" BIGINT,
    "BookingModelID" BIGINT,
    "PricingModelID" BIGINT,
    "MinimumPax" INTEGER,
    "MaximumPax" INTEGER,
    "MinimumAge" INTEGER,
    "MaximumAge" INTEGER,
    "IsInstantConfirmation" BOOLEAN NOT NULL DEFAULT false,
    "IsRequestOnly" BOOLEAN NOT NULL DEFAULT false,
    "IsDateRequired" BOOLEAN NOT NULL DEFAULT false,
    "IsTimeRequired" BOOLEAN NOT NULL DEFAULT false,
    "IsPickupRequired" BOOLEAN NOT NULL DEFAULT false,
    "IsDropoffRequired" BOOLEAN NOT NULL DEFAULT false,
    "IsScheduleRequired" BOOLEAN NOT NULL DEFAULT false,
    "IsAvailabilityRequired" BOOLEAN NOT NULL DEFAULT false,
    "IsItineraryRequired" BOOLEAN NOT NULL DEFAULT false,
    "IsCancellationPolicyRequired" BOOLEAN NOT NULL DEFAULT false,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "ServiceProductConfiguration_pkey" PRIMARY KEY ("ServiceProductConfigurationID")
);

-- CreateTable
CREATE TABLE "ServiceProductStatusHistory" (
    "ServiceProductStatusHistoryID" BIGSERIAL NOT NULL,
    "ServiceProductID" BIGINT NOT NULL,
    "FromCommonStatusID" BIGINT,
    "ToCommonStatusID" BIGINT NOT NULL,
    "Remarks" VARCHAR(1000),
    "ChangedBy" INTEGER NOT NULL,
    "ChangedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceProductStatusHistory_pkey" PRIMARY KEY ("ServiceProductStatusHistoryID")
);

-- CreateTable
CREATE TABLE "ServiceProductOption" (
    "ServiceProductOptionID" BIGSERIAL NOT NULL,
    "ServiceProductID" BIGINT NOT NULL,
    "OptionCode" VARCHAR(50) NOT NULL,
    "OptionName" VARCHAR(200) NOT NULL,
    "Description" VARCHAR(1000),
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsDefault" BOOLEAN NOT NULL DEFAULT false,
    "IsOnlineSellable" BOOLEAN NOT NULL DEFAULT false,
    "CommonStatusID" BIGINT NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "ServiceProductOption_pkey" PRIMARY KEY ("ServiceProductOptionID")
);

-- CreateTable
CREATE TABLE "ServiceProductVariant" (
    "ServiceProductVariantID" BIGSERIAL NOT NULL,
    "ServiceProductOptionID" BIGINT NOT NULL,
    "VariantCode" VARCHAR(50) NOT NULL,
    "VariantName" VARCHAR(200) NOT NULL,
    "Description" VARCHAR(1000),
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsDefault" BOOLEAN NOT NULL DEFAULT false,
    "IsOnlineSellable" BOOLEAN NOT NULL DEFAULT false,
    "CommonStatusID" BIGINT NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "ServiceProductVariant_pkey" PRIMARY KEY ("ServiceProductVariantID")
);

-- CreateIndex
CREATE INDEX "ServiceProduct_TenantID_CompanyID_idx" ON "ServiceProduct"("TenantID", "CompanyID");

-- CreateIndex
CREATE INDEX "ServiceProduct_ServiceTypeID_idx" ON "ServiceProduct"("ServiceTypeID");

-- CreateIndex
CREATE INDEX "ServiceProduct_ClassificationID_idx" ON "ServiceProduct"("ServiceProductClassificationID");

-- CreateIndex
CREATE INDEX "ServiceProduct_CategoryID_idx" ON "ServiceProduct"("ServiceProductCategoryID");

-- CreateIndex
CREATE INDEX "ServiceProduct_SupplierID_idx" ON "ServiceProduct"("SupplierID");

-- CreateIndex
CREATE INDEX "ServiceProduct_CommonStatusID_idx" ON "ServiceProduct"("CommonStatusID");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceProduct_Tenant_Company_Code_key" ON "ServiceProduct"("TenantID", "CompanyID", "ServiceProductCode");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceProductConfiguration_ServiceProductID_key" ON "ServiceProductConfiguration"("ServiceProductID");

-- CreateIndex
CREATE INDEX "SvcProductConfig_DurationUnitID_idx" ON "ServiceProductConfiguration"("DurationUnitID");

-- CreateIndex
CREATE INDEX "SvcProductConfig_BookingModelID_idx" ON "ServiceProductConfiguration"("BookingModelID");

-- CreateIndex
CREATE INDEX "SvcProductConfig_PricingModelID_idx" ON "ServiceProductConfiguration"("PricingModelID");

-- CreateIndex
CREATE INDEX "SvcProductStatusHistory_ProductID_idx" ON "ServiceProductStatusHistory"("ServiceProductID");

-- CreateIndex
CREATE INDEX "SvcProductOption_ProductID_idx" ON "ServiceProductOption"("ServiceProductID");

-- CreateIndex
CREATE INDEX "SvcProductOption_CommonStatusID_idx" ON "ServiceProductOption"("CommonStatusID");

-- CreateIndex
CREATE UNIQUE INDEX "SvcProductOption_Product_Code_key" ON "ServiceProductOption"("ServiceProductID", "OptionCode");

-- CreateIndex
CREATE INDEX "SvcProductVariant_OptionID_idx" ON "ServiceProductVariant"("ServiceProductOptionID");

-- CreateIndex
CREATE INDEX "SvcProductVariant_CommonStatusID_idx" ON "ServiceProductVariant"("CommonStatusID");

-- CreateIndex
CREATE UNIQUE INDEX "SvcProductVariant_Option_Code_key" ON "ServiceProductVariant"("ServiceProductOptionID", "VariantCode");

-- AddForeignKey
ALTER TABLE "ServiceProduct" ADD CONSTRAINT "ServiceProduct_ServiceTypeID_fkey" FOREIGN KEY ("ServiceTypeID") REFERENCES "ServiceTypeMaster"("ServiceTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProduct" ADD CONSTRAINT "ServiceProduct_ServiceProductClassificationID_fkey" FOREIGN KEY ("ServiceProductClassificationID") REFERENCES "ServiceProductClassificationMaster"("ServiceProductClassificationID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProduct" ADD CONSTRAINT "ServiceProduct_ServiceProductCategoryID_fkey" FOREIGN KEY ("ServiceProductCategoryID") REFERENCES "ServiceProductCategory"("ServiceProductCategoryID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProduct" ADD CONSTRAINT "ServiceProduct_SupplierID_fkey" FOREIGN KEY ("SupplierID") REFERENCES "Supplier"("SupplierID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProduct" ADD CONSTRAINT "ServiceProduct_CountryID_fkey" FOREIGN KEY ("CountryID") REFERENCES "Country"("CountryID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProduct" ADD CONSTRAINT "ServiceProduct_RegionID_fkey" FOREIGN KEY ("RegionID") REFERENCES "Region"("RegionID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProduct" ADD CONSTRAINT "ServiceProduct_CityID_fkey" FOREIGN KEY ("CityID") REFERENCES "City"("CityID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProduct" ADD CONSTRAINT "ServiceProduct_CommonStatusID_fkey" FOREIGN KEY ("CommonStatusID") REFERENCES "CommonStatus"("CommonStatusID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductConfiguration" ADD CONSTRAINT "ServiceProductConfiguration_ServiceProductID_fkey" FOREIGN KEY ("ServiceProductID") REFERENCES "ServiceProduct"("ServiceProductID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductConfiguration" ADD CONSTRAINT "ServiceProductConfiguration_DurationUnitID_fkey" FOREIGN KEY ("DurationUnitID") REFERENCES "DurationUnit"("DurationUnitID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductConfiguration" ADD CONSTRAINT "ServiceProductConfiguration_BookingModelID_fkey" FOREIGN KEY ("BookingModelID") REFERENCES "BookingModel"("BookingModelID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductConfiguration" ADD CONSTRAINT "ServiceProductConfiguration_PricingModelID_fkey" FOREIGN KEY ("PricingModelID") REFERENCES "PricingModel"("PricingModelID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductStatusHistory" ADD CONSTRAINT "ServiceProductStatusHistory_ServiceProductID_fkey" FOREIGN KEY ("ServiceProductID") REFERENCES "ServiceProduct"("ServiceProductID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductStatusHistory" ADD CONSTRAINT "ServiceProductStatusHistory_FromCommonStatusID_fkey" FOREIGN KEY ("FromCommonStatusID") REFERENCES "CommonStatus"("CommonStatusID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductStatusHistory" ADD CONSTRAINT "ServiceProductStatusHistory_ToCommonStatusID_fkey" FOREIGN KEY ("ToCommonStatusID") REFERENCES "CommonStatus"("CommonStatusID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductOption" ADD CONSTRAINT "ServiceProductOption_ServiceProductID_fkey" FOREIGN KEY ("ServiceProductID") REFERENCES "ServiceProduct"("ServiceProductID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductOption" ADD CONSTRAINT "ServiceProductOption_CommonStatusID_fkey" FOREIGN KEY ("CommonStatusID") REFERENCES "CommonStatus"("CommonStatusID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductVariant" ADD CONSTRAINT "ServiceProductVariant_ServiceProductOptionID_fkey" FOREIGN KEY ("ServiceProductOptionID") REFERENCES "ServiceProductOption"("ServiceProductOptionID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductVariant" ADD CONSTRAINT "ServiceProductVariant_CommonStatusID_fkey" FOREIGN KEY ("CommonStatusID") REFERENCES "CommonStatus"("CommonStatusID") ON DELETE RESTRICT ON UPDATE CASCADE;
