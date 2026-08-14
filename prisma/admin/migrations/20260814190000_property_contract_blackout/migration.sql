-- Blackout type + reason masters and contract blackout entities.

CREATE TABLE "BlackoutType" (
    "BlackoutTypeID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "BlackoutTypeCode" VARCHAR(50) NOT NULL,
    "BlackoutTypeName" VARCHAR(100) NOT NULL,
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),
    CONSTRAINT "BlackoutType_pkey" PRIMARY KEY ("BlackoutTypeID")
);

CREATE UNIQUE INDEX "BlackoutType_Tenant_Company_Code_key"
    ON "BlackoutType"("TenantID", "CompanyID", "BlackoutTypeCode");
CREATE INDEX "BlackoutType_TenantID_CompanyID_idx" ON "BlackoutType"("TenantID", "CompanyID");

CREATE TABLE "BlackoutReason" (
    "BlackoutReasonID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "BlackoutReasonCode" VARCHAR(50) NOT NULL,
    "BlackoutReasonName" VARCHAR(100) NOT NULL,
    "Description" VARCHAR(250),
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),
    CONSTRAINT "BlackoutReason_pkey" PRIMARY KEY ("BlackoutReasonID")
);

CREATE UNIQUE INDEX "BlackoutReason_Tenant_Company_Code_key"
    ON "BlackoutReason"("TenantID", "CompanyID", "BlackoutReasonCode");
CREATE INDEX "BlackoutReason_TenantID_CompanyID_idx" ON "BlackoutReason"("TenantID", "CompanyID");

CREATE TABLE "PropertyContractBlackout" (
    "PropertyContractBlackoutID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "PropertyContractID" BIGINT NOT NULL,
    "BlackoutTypeID" BIGINT NOT NULL,
    "PropertyRoomTypeID" BIGINT,
    "PropertyContractRatePlanID" BIGINT,
    "FromDate" DATE NOT NULL,
    "ToDate" DATE NOT NULL,
    "BlackoutReasonID" BIGINT,
    "Remarks" VARCHAR(500),
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),
    CONSTRAINT "PropertyContractBlackout_pkey" PRIMARY KEY ("PropertyContractBlackoutID")
);

CREATE INDEX "PropertyContractBlackout_TenantID_CompanyID_idx" ON "PropertyContractBlackout"("TenantID", "CompanyID");
CREATE INDEX "PropertyContractBlackout_PropertyContractID_idx" ON "PropertyContractBlackout"("PropertyContractID");
CREATE INDEX "PropertyContractBlackout_BlackoutTypeID_idx" ON "PropertyContractBlackout"("BlackoutTypeID");
CREATE INDEX "PropertyContractBlackout_PropertyRoomTypeID_idx" ON "PropertyContractBlackout"("PropertyRoomTypeID");
CREATE INDEX "PropertyContractBlackout_RatePlanID_idx" ON "PropertyContractBlackout"("PropertyContractRatePlanID");
CREATE INDEX "PropertyContractBlackout_BlackoutReasonID_idx" ON "PropertyContractBlackout"("BlackoutReasonID");

CREATE TABLE "PropertyContractBlackoutDay" (
    "PropertyContractBlackoutDayID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "PropertyContractBlackoutID" BIGINT NOT NULL,
    "DayOfWeekID" BIGINT NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),
    CONSTRAINT "PropertyContractBlackoutDay_pkey" PRIMARY KEY ("PropertyContractBlackoutDayID")
);

CREATE UNIQUE INDEX "PropertyContractBlackoutDay_Blackout_Day_key"
    ON "PropertyContractBlackoutDay"("PropertyContractBlackoutID", "DayOfWeekID");
CREATE INDEX "PropertyContractBlackoutDay_BlackoutID_idx" ON "PropertyContractBlackoutDay"("PropertyContractBlackoutID");
CREATE INDEX "PropertyContractBlackoutDay_DayOfWeekID_idx" ON "PropertyContractBlackoutDay"("DayOfWeekID");

ALTER TABLE "PropertyContractBlackout" ADD CONSTRAINT "PropertyContractBlackout_PropertyContractID_fkey"
    FOREIGN KEY ("PropertyContractID") REFERENCES "PropertyContract"("PropertyContractID") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PropertyContractBlackout" ADD CONSTRAINT "PropertyContractBlackout_BlackoutTypeID_fkey"
    FOREIGN KEY ("BlackoutTypeID") REFERENCES "BlackoutType"("BlackoutTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PropertyContractBlackout" ADD CONSTRAINT "PropertyContractBlackout_PropertyRoomTypeID_fkey"
    FOREIGN KEY ("PropertyRoomTypeID") REFERENCES "PropertyRoom"("PropertyRoomID") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PropertyContractBlackout" ADD CONSTRAINT "PropertyContractBlackout_PropertyContractRatePlanID_fkey"
    FOREIGN KEY ("PropertyContractRatePlanID") REFERENCES "PropertyContractRatePlan"("PropertyContractRatePlanID") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PropertyContractBlackout" ADD CONSTRAINT "PropertyContractBlackout_BlackoutReasonID_fkey"
    FOREIGN KEY ("BlackoutReasonID") REFERENCES "BlackoutReason"("BlackoutReasonID") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PropertyContractBlackoutDay" ADD CONSTRAINT "PropertyContractBlackoutDay_PropertyContractBlackoutID_fkey"
    FOREIGN KEY ("PropertyContractBlackoutID") REFERENCES "PropertyContractBlackout"("PropertyContractBlackoutID") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PropertyContractBlackoutDay" ADD CONSTRAINT "PropertyContractBlackoutDay_DayOfWeekID_fkey"
    FOREIGN KEY ("DayOfWeekID") REFERENCES "DayOfWeek"("DayOfWeekID") ON DELETE RESTRICT ON UPDATE CASCADE;
