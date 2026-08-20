-- CreateTable
CREATE TABLE "ServiceProductClassificationConfiguration" (
    "ServiceProductClassificationConfigurationID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER,
    "CompanyID" INTEGER,
    "ServiceProductClassificationID" BIGINT NOT NULL,
    "IsDurationApplicable" BOOLEAN,
    "IsBookingModelApplicable" BOOLEAN,
    "IsPricingModelApplicable" BOOLEAN,
    "IsPaxApplicable" BOOLEAN,
    "IsAgeApplicable" BOOLEAN,
    "IsPickupApplicable" BOOLEAN,
    "IsDropoffApplicable" BOOLEAN,
    "IsScheduleApplicable" BOOLEAN,
    "IsAvailabilityApplicable" BOOLEAN,
    "IsItineraryApplicable" BOOLEAN,
    "IsCancellationApplicable" BOOLEAN,
    "IsOnlineSellable" BOOLEAN,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "ServiceProductClassificationConfiguration_pkey" PRIMARY KEY ("ServiceProductClassificationConfigurationID")
);

-- CreateIndex
CREATE INDEX "SvcProdClsConfig_ClassificationID_idx" ON "ServiceProductClassificationConfiguration"("ServiceProductClassificationID");

-- CreateIndex
CREATE UNIQUE INDEX "SvcProdClsConfig_Tenant_Company_Classification_key" ON "ServiceProductClassificationConfiguration"("TenantID", "CompanyID", "ServiceProductClassificationID");

-- AddForeignKey
ALTER TABLE "ServiceProductClassificationConfiguration" ADD CONSTRAINT "ServiceProductClassificationConfiguration_ServiceProductCl_fkey" FOREIGN KEY ("ServiceProductClassificationID") REFERENCES "ServiceProductClassificationMaster"("ServiceProductClassificationID") ON DELETE CASCADE ON UPDATE CASCADE;
