-- CreateTable
CREATE TABLE "RuleType" (
    "RuleTypeID" BIGSERIAL NOT NULL,
    "RuleTypeCode" VARCHAR(50) NOT NULL,
    "RuleTypeName" VARCHAR(100) NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "RuleType_pkey" PRIMARY KEY ("RuleTypeID")
);

-- CreateTable
CREATE TABLE "ServiceProductInventory" (
    "ServiceProductInventoryID" BIGSERIAL NOT NULL,
    "ServiceProductID" BIGINT NOT NULL,
    "ServiceProductSupplierID" BIGINT,
    "ServiceProductOptionID" BIGINT,
    "ServiceProductVariantID" BIGINT,
    "ServiceProductScheduleID" BIGINT,
    "InventoryTypeID" BIGINT NOT NULL,
    "ValidFrom" DATE,
    "ValidTo" DATE,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "ServiceProductInventory_pkey" PRIMARY KEY ("ServiceProductInventoryID")
);

-- CreateTable
CREATE TABLE "ServiceProductInventoryPeriod" (
    "ServiceProductInventoryPeriodID" BIGSERIAL NOT NULL,
    "ServiceProductInventoryID" BIGINT NOT NULL,
    "FromDate" DATE NOT NULL,
    "ToDate" DATE NOT NULL,
    "IsMonday" BOOLEAN NOT NULL DEFAULT true,
    "IsTuesday" BOOLEAN NOT NULL DEFAULT true,
    "IsWednesday" BOOLEAN NOT NULL DEFAULT true,
    "IsThursday" BOOLEAN NOT NULL DEFAULT true,
    "IsFriday" BOOLEAN NOT NULL DEFAULT true,
    "IsSaturday" BOOLEAN NOT NULL DEFAULT true,
    "IsSunday" BOOLEAN NOT NULL DEFAULT true,
    "AllotmentQty" INTEGER NOT NULL DEFAULT 0,
    "ReleaseDays" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "ServiceProductInventoryPeriod_pkey" PRIMARY KEY ("ServiceProductInventoryPeriodID")
);

-- CreateTable
CREATE TABLE "ServiceProductMarketRule" (
    "ServiceProductMarketRuleID" BIGSERIAL NOT NULL,
    "ServiceProductID" BIGINT NOT NULL,
    "ServiceProductSupplierID" BIGINT,
    "ServiceProductOptionID" BIGINT,
    "ServiceProductVariantID" BIGINT,
    "MarketTypeID" BIGINT NOT NULL,
    "RegionID" INTEGER,
    "CountryID" INTEGER,
    "CityID" INTEGER,
    "MarketGroupID" BIGINT,
    "RuleTypeID" BIGINT NOT NULL,
    "FromDate" DATE,
    "ToDate" DATE,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "ServiceProductMarketRule_pkey" PRIMARY KEY ("ServiceProductMarketRuleID")
);

-- CreateIndex
CREATE UNIQUE INDEX "RuleType_RuleTypeCode_key" ON "RuleType"("RuleTypeCode");

-- CreateIndex
CREATE INDEX "SvcProductInventory_ProductID_idx" ON "ServiceProductInventory"("ServiceProductID");

-- CreateIndex
CREATE INDEX "SvcProductInventory_SupplierID_idx" ON "ServiceProductInventory"("ServiceProductSupplierID");

-- CreateIndex
CREATE INDEX "SvcProductInventory_OptionID_idx" ON "ServiceProductInventory"("ServiceProductOptionID");

-- CreateIndex
CREATE INDEX "SvcProductInventory_VariantID_idx" ON "ServiceProductInventory"("ServiceProductVariantID");

-- CreateIndex
CREATE INDEX "SvcProductInventory_ScheduleID_idx" ON "ServiceProductInventory"("ServiceProductScheduleID");

-- CreateIndex
CREATE INDEX "SvcProductInventory_TypeID_idx" ON "ServiceProductInventory"("InventoryTypeID");

-- CreateIndex
CREATE INDEX "SvcProductInventoryPeriod_InventoryID_idx" ON "ServiceProductInventoryPeriod"("ServiceProductInventoryID");

-- CreateIndex
CREATE INDEX "SvcProductMarketRule_ProductID_idx" ON "ServiceProductMarketRule"("ServiceProductID");

-- CreateIndex
CREATE INDEX "SvcProductMarketRule_SupplierID_idx" ON "ServiceProductMarketRule"("ServiceProductSupplierID");

-- CreateIndex
CREATE INDEX "SvcProductMarketRule_OptionID_idx" ON "ServiceProductMarketRule"("ServiceProductOptionID");

-- CreateIndex
CREATE INDEX "SvcProductMarketRule_VariantID_idx" ON "ServiceProductMarketRule"("ServiceProductVariantID");

-- CreateIndex
CREATE INDEX "SvcProductMarketRule_MarketTypeID_idx" ON "ServiceProductMarketRule"("MarketTypeID");

-- CreateIndex
CREATE INDEX "SvcProductMarketRule_RegionID_idx" ON "ServiceProductMarketRule"("RegionID");

-- CreateIndex
CREATE INDEX "SvcProductMarketRule_CountryID_idx" ON "ServiceProductMarketRule"("CountryID");

-- CreateIndex
CREATE INDEX "SvcProductMarketRule_CityID_idx" ON "ServiceProductMarketRule"("CityID");

-- CreateIndex
CREATE INDEX "SvcProductMarketRule_MarketGroupID_idx" ON "ServiceProductMarketRule"("MarketGroupID");

-- CreateIndex
CREATE INDEX "SvcProductMarketRule_RuleTypeID_idx" ON "ServiceProductMarketRule"("RuleTypeID");

-- AddForeignKey
ALTER TABLE "ServiceProductInventory" ADD CONSTRAINT "ServiceProductInventory_ServiceProductID_fkey" FOREIGN KEY ("ServiceProductID") REFERENCES "ServiceProduct"("ServiceProductID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductInventory" ADD CONSTRAINT "ServiceProductInventory_ServiceProductSupplierID_fkey" FOREIGN KEY ("ServiceProductSupplierID") REFERENCES "ServiceProductSupplier"("ServiceProductSupplierID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductInventory" ADD CONSTRAINT "ServiceProductInventory_ServiceProductOptionID_fkey" FOREIGN KEY ("ServiceProductOptionID") REFERENCES "ServiceProductOption"("ServiceProductOptionID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductInventory" ADD CONSTRAINT "ServiceProductInventory_ServiceProductVariantID_fkey" FOREIGN KEY ("ServiceProductVariantID") REFERENCES "ServiceProductVariant"("ServiceProductVariantID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductInventory" ADD CONSTRAINT "ServiceProductInventory_ServiceProductScheduleID_fkey" FOREIGN KEY ("ServiceProductScheduleID") REFERENCES "ServiceProductSchedule"("ServiceProductScheduleID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductInventory" ADD CONSTRAINT "ServiceProductInventory_InventoryTypeID_fkey" FOREIGN KEY ("InventoryTypeID") REFERENCES "InventoryType"("InventoryTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductInventoryPeriod" ADD CONSTRAINT "ServiceProductInventoryPeriod_ServiceProductInventoryID_fkey" FOREIGN KEY ("ServiceProductInventoryID") REFERENCES "ServiceProductInventory"("ServiceProductInventoryID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductMarketRule" ADD CONSTRAINT "ServiceProductMarketRule_ServiceProductID_fkey" FOREIGN KEY ("ServiceProductID") REFERENCES "ServiceProduct"("ServiceProductID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductMarketRule" ADD CONSTRAINT "ServiceProductMarketRule_ServiceProductSupplierID_fkey" FOREIGN KEY ("ServiceProductSupplierID") REFERENCES "ServiceProductSupplier"("ServiceProductSupplierID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductMarketRule" ADD CONSTRAINT "ServiceProductMarketRule_ServiceProductOptionID_fkey" FOREIGN KEY ("ServiceProductOptionID") REFERENCES "ServiceProductOption"("ServiceProductOptionID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductMarketRule" ADD CONSTRAINT "ServiceProductMarketRule_ServiceProductVariantID_fkey" FOREIGN KEY ("ServiceProductVariantID") REFERENCES "ServiceProductVariant"("ServiceProductVariantID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductMarketRule" ADD CONSTRAINT "ServiceProductMarketRule_MarketTypeID_fkey" FOREIGN KEY ("MarketTypeID") REFERENCES "MarketType"("MarketTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductMarketRule" ADD CONSTRAINT "ServiceProductMarketRule_RegionID_fkey" FOREIGN KEY ("RegionID") REFERENCES "Region"("RegionID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductMarketRule" ADD CONSTRAINT "ServiceProductMarketRule_CountryID_fkey" FOREIGN KEY ("CountryID") REFERENCES "Country"("CountryID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductMarketRule" ADD CONSTRAINT "ServiceProductMarketRule_CityID_fkey" FOREIGN KEY ("CityID") REFERENCES "City"("CityID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductMarketRule" ADD CONSTRAINT "ServiceProductMarketRule_MarketGroupID_fkey" FOREIGN KEY ("MarketGroupID") REFERENCES "MarketGroup"("MarketGroupID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductMarketRule" ADD CONSTRAINT "ServiceProductMarketRule_RuleTypeID_fkey" FOREIGN KEY ("RuleTypeID") REFERENCES "RuleType"("RuleTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;
