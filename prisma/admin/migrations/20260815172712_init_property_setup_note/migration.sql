-- AlterTable
ALTER TABLE "DayOfWeek" ALTER COLUMN "CreatedBy" DROP DEFAULT;

-- AlterTable
ALTER TABLE "InventoryType" ALTER COLUMN "CreatedBy" DROP DEFAULT;

-- CreateTable
CREATE TABLE "PropertySetupNote" (
    "PropertySetupNoteID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "PropertyID" INTEGER NOT NULL,
    "StepCode" VARCHAR(50),
    "Note" TEXT NOT NULL,
    "Priority" VARCHAR(20) NOT NULL DEFAULT 'normal',
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertySetupNote_pkey" PRIMARY KEY ("PropertySetupNoteID")
);

-- CreateIndex
CREATE INDEX "PropertySetupNote_Tenant_Company_Property_idx" ON "PropertySetupNote"("TenantID", "CompanyID", "PropertyID");

-- RenameForeignKey
ALTER TABLE "PropertyContractCancellationPolicy" RENAME CONSTRAINT "PropertyContractCancellationPolicy_RatePlanID_fkey" TO "PropertyContractCancellationPolicy_PropertyContractRatePla_fkey";

-- RenameForeignKey
ALTER TABLE "PropertyContractCancellationPolicyRule" RENAME CONSTRAINT "PropertyContractCancellationPolicyRule_PolicyID_fkey" TO "PropertyContractCancellationPolicyRule_PropertyContractCan_fkey";

-- RenameForeignKey
ALTER TABLE "PropertyContractCancellationPolicyRule" RENAME CONSTRAINT "PropertyContractCancellationPolicyRule_TypeID_fkey" TO "PropertyContractCancellationPolicyRule_CancellationPolicyT_fkey";

-- RenameForeignKey
ALTER TABLE "PropertyContractChildPolicyAge" RENAME CONSTRAINT "PropertyContractChildPolicyAge_PolicyID_fkey" TO "PropertyContractChildPolicyAge_PropertyContractChildPolicy_fkey";

-- RenameForeignKey
ALTER TABLE "PropertyContractPromotion" RENAME CONSTRAINT "PropertyContractPromotion_RatePlanID_fkey" TO "PropertyContractPromotion_PropertyContractRatePlanID_fkey";

-- RenameForeignKey
ALTER TABLE "PropertyContractPromotionBenefit" RENAME CONSTRAINT "PropertyContractPromotionBenefit_BenefitTypeID_fkey" TO "PropertyContractPromotionBenefit_PromotionBenefitTypeID_fkey";

-- RenameForeignKey
ALTER TABLE "PropertyContractPromotionBenefit" RENAME CONSTRAINT "PropertyContractPromotionBenefit_PromotionID_fkey" TO "PropertyContractPromotionBenefit_PropertyContractPromotion_fkey";

-- RenameForeignKey
ALTER TABLE "PropertyContractPromotionBenefit" RENAME CONSTRAINT "PropertyContractPromotionBenefit_UpgradeBoardID_fkey" TO "PropertyContractPromotionBenefit_UpgradeToBoardBasisID_fkey";

-- RenameForeignKey
ALTER TABLE "PropertyContractPromotionBenefit" RENAME CONSTRAINT "PropertyContractPromotionBenefit_UpgradeRoomID_fkey" TO "PropertyContractPromotionBenefit_UpgradeToPropertyRoomType_fkey";

-- RenameForeignKey
ALTER TABLE "PropertyContractPromotionCondition" RENAME CONSTRAINT "PropertyContractPromotionCondition_PromotionID_fkey" TO "PropertyContractPromotionCondition_PropertyContractPromoti_fkey";

-- RenameForeignKey
ALTER TABLE "PropertyContractPromotionDay" RENAME CONSTRAINT "PropertyContractPromotionDay_PromotionID_fkey" TO "PropertyContractPromotionDay_PropertyContractPromotionID_fkey";

-- RenameForeignKey
ALTER TABLE "PropertyContractPromotionPeriod" RENAME CONSTRAINT "PropertyContractPromotionPeriod_PromotionID_fkey" TO "PropertyContractPromotionPeriod_PropertyContractPromotionI_fkey";

-- RenameForeignKey
ALTER TABLE "PropertyContractSupplementAge" RENAME CONSTRAINT "PropertyContractSupplementAge_SupplementID_fkey" TO "PropertyContractSupplementAge_PropertyContractSupplementID_fkey";

-- RenameForeignKey
ALTER TABLE "PropertyContractSupplementDay" RENAME CONSTRAINT "PropertyContractSupplementDay_SupplementID_fkey" TO "PropertyContractSupplementDay_PropertyContractSupplementID_fkey";

-- RenameForeignKey
ALTER TABLE "PropertyContractSupplementPeriod" RENAME CONSTRAINT "PropertyContractSupplementPeriod_SupplementID_fkey" TO "PropertyContractSupplementPeriod_PropertyContractSupplemen_fkey";

-- RenameForeignKey
ALTER TABLE "PropertyContractSupplementRatePlan" RENAME CONSTRAINT "PropertyContractSupplementRatePlan_RatePlanID_fkey" TO "PropertyContractSupplementRatePlan_PropertyContractRatePla_fkey";

-- RenameForeignKey
ALTER TABLE "PropertyContractSupplementRatePlan" RENAME CONSTRAINT "PropertyContractSupplementRatePlan_SupplementID_fkey" TO "PropertyContractSupplementRatePlan_PropertyContractSupplem_fkey";

-- AddForeignKey
ALTER TABLE "PropertySetupNote" ADD CONSTRAINT "PropertySetupNote_PropertyID_fkey" FOREIGN KEY ("PropertyID") REFERENCES "Property"("PropertyID") ON DELETE CASCADE ON UPDATE CASCADE;
