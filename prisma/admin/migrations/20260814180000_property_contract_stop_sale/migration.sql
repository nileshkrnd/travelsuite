-- Stop sale type + reason masters and contract stop sale entities.

CREATE TABLE "StopSaleType" (
    "StopSaleTypeID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "StopSaleTypeCode" VARCHAR(50) NOT NULL,
    "StopSaleTypeName" VARCHAR(100) NOT NULL,
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),
    CONSTRAINT "StopSaleType_pkey" PRIMARY KEY ("StopSaleTypeID")
);

CREATE UNIQUE INDEX "StopSaleType_Tenant_Company_Code_key"
    ON "StopSaleType"("TenantID", "CompanyID", "StopSaleTypeCode");
CREATE INDEX "StopSaleType_TenantID_CompanyID_idx" ON "StopSaleType"("TenantID", "CompanyID");

CREATE TABLE "StopSaleReason" (
    "StopSaleReasonID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "StopSaleReasonCode" VARCHAR(50) NOT NULL,
    "StopSaleReasonName" VARCHAR(100) NOT NULL,
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),
    CONSTRAINT "StopSaleReason_pkey" PRIMARY KEY ("StopSaleReasonID")
);

CREATE UNIQUE INDEX "StopSaleReason_Tenant_Company_Code_key"
    ON "StopSaleReason"("TenantID", "CompanyID", "StopSaleReasonCode");
CREATE INDEX "StopSaleReason_TenantID_CompanyID_idx" ON "StopSaleReason"("TenantID", "CompanyID");

CREATE TABLE "PropertyContractStopSale" (
    "PropertyContractStopSaleID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "PropertyContractID" BIGINT NOT NULL,
    "StopSaleTypeID" BIGINT NOT NULL,
    "PropertyRoomTypeID" BIGINT,
    "PropertyContractRatePlanID" BIGINT,
    "FromDate" DATE NOT NULL,
    "ToDate" DATE NOT NULL,
    "StopSaleReasonID" BIGINT,
    "Remarks" VARCHAR(500),
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),
    CONSTRAINT "PropertyContractStopSale_pkey" PRIMARY KEY ("PropertyContractStopSaleID")
);

CREATE INDEX "PropertyContractStopSale_TenantID_CompanyID_idx" ON "PropertyContractStopSale"("TenantID", "CompanyID");
CREATE INDEX "PropertyContractStopSale_PropertyContractID_idx" ON "PropertyContractStopSale"("PropertyContractID");
CREATE INDEX "PropertyContractStopSale_StopSaleTypeID_idx" ON "PropertyContractStopSale"("StopSaleTypeID");
CREATE INDEX "PropertyContractStopSale_PropertyRoomTypeID_idx" ON "PropertyContractStopSale"("PropertyRoomTypeID");
CREATE INDEX "PropertyContractStopSale_RatePlanID_idx" ON "PropertyContractStopSale"("PropertyContractRatePlanID");
CREATE INDEX "PropertyContractStopSale_StopSaleReasonID_idx" ON "PropertyContractStopSale"("StopSaleReasonID");

CREATE TABLE "PropertyContractStopSaleDay" (
    "PropertyContractStopSaleDayID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "PropertyContractStopSaleID" BIGINT NOT NULL,
    "DayOfWeekID" BIGINT NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),
    CONSTRAINT "PropertyContractStopSaleDay_pkey" PRIMARY KEY ("PropertyContractStopSaleDayID")
);

CREATE UNIQUE INDEX "PropertyContractStopSaleDay_StopSale_Day_key"
    ON "PropertyContractStopSaleDay"("PropertyContractStopSaleID", "DayOfWeekID");
CREATE INDEX "PropertyContractStopSaleDay_StopSaleID_idx" ON "PropertyContractStopSaleDay"("PropertyContractStopSaleID");
CREATE INDEX "PropertyContractStopSaleDay_DayOfWeekID_idx" ON "PropertyContractStopSaleDay"("DayOfWeekID");

ALTER TABLE "PropertyContractStopSale" ADD CONSTRAINT "PropertyContractStopSale_PropertyContractID_fkey"
    FOREIGN KEY ("PropertyContractID") REFERENCES "PropertyContract"("PropertyContractID") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PropertyContractStopSale" ADD CONSTRAINT "PropertyContractStopSale_StopSaleTypeID_fkey"
    FOREIGN KEY ("StopSaleTypeID") REFERENCES "StopSaleType"("StopSaleTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PropertyContractStopSale" ADD CONSTRAINT "PropertyContractStopSale_PropertyRoomTypeID_fkey"
    FOREIGN KEY ("PropertyRoomTypeID") REFERENCES "PropertyRoom"("PropertyRoomID") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PropertyContractStopSale" ADD CONSTRAINT "PropertyContractStopSale_PropertyContractRatePlanID_fkey"
    FOREIGN KEY ("PropertyContractRatePlanID") REFERENCES "PropertyContractRatePlan"("PropertyContractRatePlanID") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PropertyContractStopSale" ADD CONSTRAINT "PropertyContractStopSale_StopSaleReasonID_fkey"
    FOREIGN KEY ("StopSaleReasonID") REFERENCES "StopSaleReason"("StopSaleReasonID") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PropertyContractStopSaleDay" ADD CONSTRAINT "PropertyContractStopSaleDay_PropertyContractStopSaleID_fkey"
    FOREIGN KEY ("PropertyContractStopSaleID") REFERENCES "PropertyContractStopSale"("PropertyContractStopSaleID") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PropertyContractStopSaleDay" ADD CONSTRAINT "PropertyContractStopSaleDay_DayOfWeekID_fkey"
    FOREIGN KEY ("DayOfWeekID") REFERENCES "DayOfWeek"("DayOfWeekID") ON DELETE RESTRICT ON UPDATE CASCADE;
