-- CreateTable
CREATE TABLE "PropertyContractRatePlan" (
    "PropertyContractRatePlanID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "PropertyContractID" BIGINT NOT NULL,
    "RatePlanCode" VARCHAR(50) NOT NULL,
    "RatePlanName" VARCHAR(150) NOT NULL,
    "RatePlanTypeID" BIGINT NOT NULL,
    "MealPlanID" BIGINT NOT NULL,
    "RateBasisID" BIGINT NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "PropertyContractRatePlan_pkey" PRIMARY KEY ("PropertyContractRatePlanID")
);

-- CreateIndex
CREATE INDEX "PropertyContractRatePlan_TenantID_CompanyID_idx" ON "PropertyContractRatePlan"("TenantID", "CompanyID");

-- CreateIndex
CREATE INDEX "PropertyContractRatePlan_PropertyContractID_idx" ON "PropertyContractRatePlan"("PropertyContractID");

-- CreateIndex
CREATE INDEX "PropertyContractRatePlan_RatePlanTypeID_idx" ON "PropertyContractRatePlan"("RatePlanTypeID");

-- CreateIndex
CREATE INDEX "PropertyContractRatePlan_MealPlanID_idx" ON "PropertyContractRatePlan"("MealPlanID");

-- CreateIndex
CREATE INDEX "PropertyContractRatePlan_RateBasisID_idx" ON "PropertyContractRatePlan"("RateBasisID");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyContractRatePlan_Tenant_Contract_Code_key" ON "PropertyContractRatePlan"("TenantID", "PropertyContractID", "RatePlanCode");

-- AddForeignKey
ALTER TABLE "PropertyContractRatePlan" ADD CONSTRAINT "PropertyContractRatePlan_PropertyContractID_fkey" FOREIGN KEY ("PropertyContractID") REFERENCES "PropertyContract"("PropertyContractID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyContractRatePlan" ADD CONSTRAINT "PropertyContractRatePlan_RatePlanTypeID_fkey" FOREIGN KEY ("RatePlanTypeID") REFERENCES "RatePlanType"("RatePlanTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyContractRatePlan" ADD CONSTRAINT "PropertyContractRatePlan_MealPlanID_fkey" FOREIGN KEY ("MealPlanID") REFERENCES "MealPlan"("MealPlanID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyContractRatePlan" ADD CONSTRAINT "PropertyContractRatePlan_RateBasisID_fkey" FOREIGN KEY ("RateBasisID") REFERENCES "RateBasis"("RateBasisID") ON DELETE RESTRICT ON UPDATE CASCADE;
