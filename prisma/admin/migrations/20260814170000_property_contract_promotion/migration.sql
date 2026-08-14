-- Promotion type + benefit type masters and contract promotion entities.

CREATE TABLE "PromotionType" (
    "PromotionTypeID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "PromotionTypeCode" VARCHAR(50) NOT NULL,
    "PromotionTypeName" VARCHAR(100) NOT NULL,
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),
    CONSTRAINT "PromotionType_pkey" PRIMARY KEY ("PromotionTypeID")
);

CREATE UNIQUE INDEX "PromotionType_Tenant_Company_Code_key"
    ON "PromotionType"("TenantID", "CompanyID", "PromotionTypeCode");
CREATE INDEX "PromotionType_TenantID_CompanyID_idx" ON "PromotionType"("TenantID", "CompanyID");

CREATE TABLE "PromotionBenefitType" (
    "PromotionBenefitTypeID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "PromotionBenefitTypeCode" VARCHAR(50) NOT NULL,
    "PromotionBenefitTypeName" VARCHAR(100) NOT NULL,
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),
    CONSTRAINT "PromotionBenefitType_pkey" PRIMARY KEY ("PromotionBenefitTypeID")
);

CREATE UNIQUE INDEX "PromotionBenefitType_Tenant_Company_Code_key"
    ON "PromotionBenefitType"("TenantID", "CompanyID", "PromotionBenefitTypeCode");
CREATE INDEX "PromotionBenefitType_TenantID_CompanyID_idx" ON "PromotionBenefitType"("TenantID", "CompanyID");

CREATE TABLE "PropertyContractPromotion" (
    "PropertyContractPromotionID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "PropertyContractID" BIGINT NOT NULL,
    "PromotionTypeID" BIGINT NOT NULL,
    "PromotionCode" VARCHAR(50) NOT NULL,
    "PromotionName" VARCHAR(150) NOT NULL,
    "PropertyRoomTypeID" BIGINT,
    "PropertyContractRatePlanID" BIGINT,
    "IsStackable" BOOLEAN NOT NULL DEFAULT false,
    "Priority" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),
    CONSTRAINT "PropertyContractPromotion_pkey" PRIMARY KEY ("PropertyContractPromotionID")
);

CREATE UNIQUE INDEX "PropertyContractPromotion_Contract_Code_key"
    ON "PropertyContractPromotion"("TenantID", "PropertyContractID", "PromotionCode");
CREATE INDEX "PropertyContractPromotion_TenantID_CompanyID_idx" ON "PropertyContractPromotion"("TenantID", "CompanyID");
CREATE INDEX "PropertyContractPromotion_PropertyContractID_idx" ON "PropertyContractPromotion"("PropertyContractID");
CREATE INDEX "PropertyContractPromotion_PromotionTypeID_idx" ON "PropertyContractPromotion"("PromotionTypeID");
CREATE INDEX "PropertyContractPromotion_PropertyRoomTypeID_idx" ON "PropertyContractPromotion"("PropertyRoomTypeID");
CREATE INDEX "PropertyContractPromotion_RatePlanID_idx" ON "PropertyContractPromotion"("PropertyContractRatePlanID");

CREATE TABLE "PropertyContractPromotionPeriod" (
    "PropertyContractPromotionPeriodID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "PropertyContractPromotionID" BIGINT NOT NULL,
    "BookingFromDate" DATE NOT NULL,
    "BookingToDate" DATE NOT NULL,
    "StayFromDate" DATE NOT NULL,
    "StayToDate" DATE NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),
    CONSTRAINT "PropertyContractPromotionPeriod_pkey" PRIMARY KEY ("PropertyContractPromotionPeriodID")
);

CREATE INDEX "PropertyContractPromotionPeriod_TenantID_CompanyID_idx" ON "PropertyContractPromotionPeriod"("TenantID", "CompanyID");
CREATE INDEX "PropertyContractPromotionPeriod_PromotionID_idx" ON "PropertyContractPromotionPeriod"("PropertyContractPromotionID");

CREATE TABLE "PropertyContractPromotionCondition" (
    "PropertyContractPromotionConditionID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "PropertyContractPromotionID" BIGINT NOT NULL,
    "MinNights" INTEGER,
    "MaxNights" INTEGER,
    "MinAdults" INTEGER,
    "MaxAdults" INTEGER,
    "MinChild" INTEGER,
    "MaxChild" INTEGER,
    "MinRooms" INTEGER,
    "MaxRooms" INTEGER,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),
    CONSTRAINT "PropertyContractPromotionCondition_pkey" PRIMARY KEY ("PropertyContractPromotionConditionID")
);

CREATE INDEX "PropertyContractPromotionCondition_TenantID_CompanyID_idx" ON "PropertyContractPromotionCondition"("TenantID", "CompanyID");
CREATE INDEX "PropertyContractPromotionCondition_PromotionID_idx" ON "PropertyContractPromotionCondition"("PropertyContractPromotionID");

CREATE TABLE "PropertyContractPromotionBenefit" (
    "PropertyContractPromotionBenefitID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "PropertyContractPromotionID" BIGINT NOT NULL,
    "PromotionBenefitTypeID" BIGINT NOT NULL,
    "Value" DECIMAL(18, 4),
    "StayNights" INTEGER,
    "PayNights" INTEGER,
    "FreeNights" INTEGER,
    "UpgradeToPropertyRoomTypeID" BIGINT,
    "UpgradeToBoardBasisID" BIGINT,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),
    CONSTRAINT "PropertyContractPromotionBenefit_pkey" PRIMARY KEY ("PropertyContractPromotionBenefitID")
);

CREATE INDEX "PropertyContractPromotionBenefit_TenantID_CompanyID_idx" ON "PropertyContractPromotionBenefit"("TenantID", "CompanyID");
CREATE INDEX "PropertyContractPromotionBenefit_PromotionID_idx" ON "PropertyContractPromotionBenefit"("PropertyContractPromotionID");
CREATE INDEX "PropertyContractPromotionBenefit_BenefitTypeID_idx" ON "PropertyContractPromotionBenefit"("PromotionBenefitTypeID");

CREATE TABLE "PropertyContractPromotionDay" (
    "PropertyContractPromotionDayID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "PropertyContractPromotionID" BIGINT NOT NULL,
    "DayOfWeekID" BIGINT NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),
    CONSTRAINT "PropertyContractPromotionDay_pkey" PRIMARY KEY ("PropertyContractPromotionDayID")
);

CREATE UNIQUE INDEX "PropertyContractPromotionDay_Promotion_Day_key"
    ON "PropertyContractPromotionDay"("PropertyContractPromotionID", "DayOfWeekID");
CREATE INDEX "PropertyContractPromotionDay_PromotionID_idx" ON "PropertyContractPromotionDay"("PropertyContractPromotionID");
CREATE INDEX "PropertyContractPromotionDay_DayOfWeekID_idx" ON "PropertyContractPromotionDay"("DayOfWeekID");

ALTER TABLE "PropertyContractPromotion"
    ADD CONSTRAINT "PropertyContractPromotion_PropertyContractID_fkey"
    FOREIGN KEY ("PropertyContractID") REFERENCES "PropertyContract"("PropertyContractID") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PropertyContractPromotion"
    ADD CONSTRAINT "PropertyContractPromotion_PromotionTypeID_fkey"
    FOREIGN KEY ("PromotionTypeID") REFERENCES "PromotionType"("PromotionTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PropertyContractPromotion"
    ADD CONSTRAINT "PropertyContractPromotion_PropertyRoomTypeID_fkey"
    FOREIGN KEY ("PropertyRoomTypeID") REFERENCES "PropertyRoom"("PropertyRoomID") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PropertyContractPromotion"
    ADD CONSTRAINT "PropertyContractPromotion_RatePlanID_fkey"
    FOREIGN KEY ("PropertyContractRatePlanID") REFERENCES "PropertyContractRatePlan"("PropertyContractRatePlanID") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PropertyContractPromotionPeriod"
    ADD CONSTRAINT "PropertyContractPromotionPeriod_PromotionID_fkey"
    FOREIGN KEY ("PropertyContractPromotionID") REFERENCES "PropertyContractPromotion"("PropertyContractPromotionID") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PropertyContractPromotionCondition"
    ADD CONSTRAINT "PropertyContractPromotionCondition_PromotionID_fkey"
    FOREIGN KEY ("PropertyContractPromotionID") REFERENCES "PropertyContractPromotion"("PropertyContractPromotionID") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PropertyContractPromotionBenefit"
    ADD CONSTRAINT "PropertyContractPromotionBenefit_PromotionID_fkey"
    FOREIGN KEY ("PropertyContractPromotionID") REFERENCES "PropertyContractPromotion"("PropertyContractPromotionID") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PropertyContractPromotionBenefit"
    ADD CONSTRAINT "PropertyContractPromotionBenefit_BenefitTypeID_fkey"
    FOREIGN KEY ("PromotionBenefitTypeID") REFERENCES "PromotionBenefitType"("PromotionBenefitTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PropertyContractPromotionBenefit"
    ADD CONSTRAINT "PropertyContractPromotionBenefit_UpgradeRoomID_fkey"
    FOREIGN KEY ("UpgradeToPropertyRoomTypeID") REFERENCES "PropertyRoom"("PropertyRoomID") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PropertyContractPromotionBenefit"
    ADD CONSTRAINT "PropertyContractPromotionBenefit_UpgradeBoardID_fkey"
    FOREIGN KEY ("UpgradeToBoardBasisID") REFERENCES "MealPlan"("MealPlanID") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PropertyContractPromotionDay"
    ADD CONSTRAINT "PropertyContractPromotionDay_PromotionID_fkey"
    FOREIGN KEY ("PropertyContractPromotionID") REFERENCES "PropertyContractPromotion"("PropertyContractPromotionID") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PropertyContractPromotionDay"
    ADD CONSTRAINT "PropertyContractPromotionDay_DayOfWeekID_fkey"
    FOREIGN KEY ("DayOfWeekID") REFERENCES "DayOfWeek"("DayOfWeekID") ON DELETE RESTRICT ON UPDATE CASCADE;
