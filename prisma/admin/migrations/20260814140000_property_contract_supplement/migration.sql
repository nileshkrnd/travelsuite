-- Supplement type master + contract supplement entities (periods, age bands, rate plans, days).

CREATE TABLE "SupplementType" (
    "SupplementTypeID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "SupplementTypeCode" VARCHAR(50) NOT NULL,
    "SupplementTypeName" VARCHAR(100) NOT NULL,
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "SupplementType_pkey" PRIMARY KEY ("SupplementTypeID")
);

CREATE UNIQUE INDEX "SupplementType_Tenant_Company_Code_key"
    ON "SupplementType"("TenantID", "CompanyID", "SupplementTypeCode");

CREATE INDEX "SupplementType_TenantID_CompanyID_idx"
    ON "SupplementType"("TenantID", "CompanyID");

CREATE TABLE "PropertyContractSupplement" (
    "PropertyContractSupplementID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "PropertyContractID" BIGINT NOT NULL,
    "SupplementTypeID" BIGINT NOT NULL,
    "SupplementCode" VARCHAR(50) NOT NULL,
    "SupplementName" VARCHAR(150) NOT NULL,
    "PropertyRoomTypeID" BIGINT,
    "RateBasisID" BIGINT NOT NULL,
    "Amount" DECIMAL(18, 4) NOT NULL,
    "IsMandatory" BOOLEAN NOT NULL DEFAULT false,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "PropertyContractSupplement_pkey" PRIMARY KEY ("PropertyContractSupplementID")
);

CREATE UNIQUE INDEX "PropertyContractSupplement_Contract_Code_key"
    ON "PropertyContractSupplement"("TenantID", "PropertyContractID", "SupplementCode");

CREATE INDEX "PropertyContractSupplement_TenantID_CompanyID_idx"
    ON "PropertyContractSupplement"("TenantID", "CompanyID");

CREATE INDEX "PropertyContractSupplement_PropertyContractID_idx"
    ON "PropertyContractSupplement"("PropertyContractID");

CREATE INDEX "PropertyContractSupplement_SupplementTypeID_idx"
    ON "PropertyContractSupplement"("SupplementTypeID");

CREATE INDEX "PropertyContractSupplement_PropertyRoomTypeID_idx"
    ON "PropertyContractSupplement"("PropertyRoomTypeID");

CREATE INDEX "PropertyContractSupplement_RateBasisID_idx"
    ON "PropertyContractSupplement"("RateBasisID");

CREATE TABLE "PropertyContractSupplementPeriod" (
    "PropertyContractSupplementPeriodID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "PropertyContractSupplementID" BIGINT NOT NULL,
    "FromDate" DATE NOT NULL,
    "ToDate" DATE NOT NULL,
    "IsMandatory" BOOLEAN NOT NULL DEFAULT false,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "PropertyContractSupplementPeriod_pkey" PRIMARY KEY ("PropertyContractSupplementPeriodID")
);

CREATE INDEX "PropertyContractSupplementPeriod_TenantID_CompanyID_idx"
    ON "PropertyContractSupplementPeriod"("TenantID", "CompanyID");

CREATE INDEX "PropertyContractSupplementPeriod_SupplementID_idx"
    ON "PropertyContractSupplementPeriod"("PropertyContractSupplementID");

CREATE TABLE "PropertyContractSupplementAge" (
    "PropertyContractSupplementAgeID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "PropertyContractSupplementID" BIGINT NOT NULL,
    "FromAge" DECIMAL(5, 2) NOT NULL,
    "ToAge" DECIMAL(5, 2) NOT NULL,
    "RateBasisID" BIGINT NOT NULL,
    "Amount" DECIMAL(18, 4) NOT NULL,
    "IsFree" BOOLEAN NOT NULL DEFAULT false,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "PropertyContractSupplementAge_pkey" PRIMARY KEY ("PropertyContractSupplementAgeID")
);

CREATE INDEX "PropertyContractSupplementAge_TenantID_CompanyID_idx"
    ON "PropertyContractSupplementAge"("TenantID", "CompanyID");

CREATE INDEX "PropertyContractSupplementAge_SupplementID_idx"
    ON "PropertyContractSupplementAge"("PropertyContractSupplementID");

CREATE INDEX "PropertyContractSupplementAge_RateBasisID_idx"
    ON "PropertyContractSupplementAge"("RateBasisID");

CREATE TABLE "PropertyContractSupplementRatePlan" (
    "PropertyContractSupplementRatePlanID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "PropertyContractSupplementID" BIGINT NOT NULL,
    "PropertyContractRatePlanID" BIGINT NOT NULL,
    "Amount" DECIMAL(18, 4) NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "PropertyContractSupplementRatePlan_pkey" PRIMARY KEY ("PropertyContractSupplementRatePlanID")
);

CREATE UNIQUE INDEX "PropertyContractSupplementRatePlan_Unique_key"
    ON "PropertyContractSupplementRatePlan"("PropertyContractSupplementID", "PropertyContractRatePlanID");

CREATE INDEX "PropertyContractSupplementRatePlan_TenantID_CompanyID_idx"
    ON "PropertyContractSupplementRatePlan"("TenantID", "CompanyID");

CREATE INDEX "PropertyContractSupplementRatePlan_SupplementID_idx"
    ON "PropertyContractSupplementRatePlan"("PropertyContractSupplementID");

CREATE INDEX "PropertyContractSupplementRatePlan_RatePlanID_idx"
    ON "PropertyContractSupplementRatePlan"("PropertyContractRatePlanID");

CREATE TABLE "PropertyContractSupplementDay" (
    "PropertyContractSupplementDayID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "PropertyContractSupplementID" BIGINT NOT NULL,
    "DayOfWeekID" BIGINT NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "PropertyContractSupplementDay_pkey" PRIMARY KEY ("PropertyContractSupplementDayID")
);

CREATE UNIQUE INDEX "PropertyContractSupplementDay_Supplement_Day_key"
    ON "PropertyContractSupplementDay"("PropertyContractSupplementID", "DayOfWeekID");

CREATE INDEX "PropertyContractSupplementDay_SupplementID_idx"
    ON "PropertyContractSupplementDay"("PropertyContractSupplementID");

CREATE INDEX "PropertyContractSupplementDay_DayOfWeekID_idx"
    ON "PropertyContractSupplementDay"("DayOfWeekID");

ALTER TABLE "PropertyContractSupplement"
    ADD CONSTRAINT "PropertyContractSupplement_PropertyContractID_fkey"
    FOREIGN KEY ("PropertyContractID") REFERENCES "PropertyContract"("PropertyContractID") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PropertyContractSupplement"
    ADD CONSTRAINT "PropertyContractSupplement_SupplementTypeID_fkey"
    FOREIGN KEY ("SupplementTypeID") REFERENCES "SupplementType"("SupplementTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PropertyContractSupplement"
    ADD CONSTRAINT "PropertyContractSupplement_PropertyRoomTypeID_fkey"
    FOREIGN KEY ("PropertyRoomTypeID") REFERENCES "PropertyRoom"("PropertyRoomID") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PropertyContractSupplement"
    ADD CONSTRAINT "PropertyContractSupplement_RateBasisID_fkey"
    FOREIGN KEY ("RateBasisID") REFERENCES "RateBasis"("RateBasisID") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PropertyContractSupplementPeriod"
    ADD CONSTRAINT "PropertyContractSupplementPeriod_SupplementID_fkey"
    FOREIGN KEY ("PropertyContractSupplementID") REFERENCES "PropertyContractSupplement"("PropertyContractSupplementID") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PropertyContractSupplementAge"
    ADD CONSTRAINT "PropertyContractSupplementAge_SupplementID_fkey"
    FOREIGN KEY ("PropertyContractSupplementID") REFERENCES "PropertyContractSupplement"("PropertyContractSupplementID") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PropertyContractSupplementAge"
    ADD CONSTRAINT "PropertyContractSupplementAge_RateBasisID_fkey"
    FOREIGN KEY ("RateBasisID") REFERENCES "RateBasis"("RateBasisID") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PropertyContractSupplementRatePlan"
    ADD CONSTRAINT "PropertyContractSupplementRatePlan_SupplementID_fkey"
    FOREIGN KEY ("PropertyContractSupplementID") REFERENCES "PropertyContractSupplement"("PropertyContractSupplementID") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PropertyContractSupplementRatePlan"
    ADD CONSTRAINT "PropertyContractSupplementRatePlan_RatePlanID_fkey"
    FOREIGN KEY ("PropertyContractRatePlanID") REFERENCES "PropertyContractRatePlan"("PropertyContractRatePlanID") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PropertyContractSupplementDay"
    ADD CONSTRAINT "PropertyContractSupplementDay_SupplementID_fkey"
    FOREIGN KEY ("PropertyContractSupplementID") REFERENCES "PropertyContractSupplement"("PropertyContractSupplementID") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PropertyContractSupplementDay"
    ADD CONSTRAINT "PropertyContractSupplementDay_DayOfWeekID_fkey"
    FOREIGN KEY ("DayOfWeekID") REFERENCES "DayOfWeek"("DayOfWeekID") ON DELETE RESTRICT ON UPDATE CASCADE;
