-- CreateTable
CREATE TABLE "ServiceProductCancellationPolicy" (
    "ServiceProductCancellationPolicyID" BIGSERIAL NOT NULL,
    "ServiceProductID" BIGINT NOT NULL,
    "PolicyCode" VARCHAR(50) NOT NULL,
    "PolicyName" VARCHAR(150) NOT NULL,
    "ServiceProductSupplierID" BIGINT,
    "ServiceProductOptionID" BIGINT,
    "ServiceProductVariantID" BIGINT,
    "IsDefault" BOOLEAN NOT NULL DEFAULT false,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "ServiceProductCancellationPolicy_pkey" PRIMARY KEY ("ServiceProductCancellationPolicyID")
);

-- CreateTable
CREATE TABLE "ServiceProductCancellationPolicyRule" (
    "ServiceProductCancellationPolicyRuleID" BIGSERIAL NOT NULL,
    "ServiceProductCancellationPolicyID" BIGINT NOT NULL,
    "FromDaysBefore" INTEGER NOT NULL,
    "ToDaysBefore" INTEGER,
    "CancellationPolicyTypeID" BIGINT NOT NULL,
    "PenaltyValue" DECIMAL(18,4) NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "ServiceProductCancellationPolicyRule_pkey" PRIMARY KEY ("ServiceProductCancellationPolicyRuleID")
);

-- CreateIndex
CREATE INDEX "SvcProductCxlPolicy_ProductID_idx" ON "ServiceProductCancellationPolicy"("ServiceProductID");

-- CreateIndex
CREATE INDEX "SvcProductCxlPolicy_SupplierID_idx" ON "ServiceProductCancellationPolicy"("ServiceProductSupplierID");

-- CreateIndex
CREATE INDEX "SvcProductCxlPolicy_OptionID_idx" ON "ServiceProductCancellationPolicy"("ServiceProductOptionID");

-- CreateIndex
CREATE INDEX "SvcProductCxlPolicy_VariantID_idx" ON "ServiceProductCancellationPolicy"("ServiceProductVariantID");

-- CreateIndex
CREATE UNIQUE INDEX "SvcProductCxlPolicy_Product_Code_key" ON "ServiceProductCancellationPolicy"("ServiceProductID", "PolicyCode");

-- CreateIndex
CREATE INDEX "SvcProductCxlPolicyRule_PolicyID_idx" ON "ServiceProductCancellationPolicyRule"("ServiceProductCancellationPolicyID");

-- CreateIndex
CREATE INDEX "SvcProductCxlPolicyRule_TypeID_idx" ON "ServiceProductCancellationPolicyRule"("CancellationPolicyTypeID");

-- AddForeignKey
ALTER TABLE "ServiceProductCancellationPolicy" ADD CONSTRAINT "ServiceProductCancellationPolicy_ServiceProductID_fkey" FOREIGN KEY ("ServiceProductID") REFERENCES "ServiceProduct"("ServiceProductID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductCancellationPolicy" ADD CONSTRAINT "ServiceProductCancellationPolicy_ServiceProductSupplierID_fkey" FOREIGN KEY ("ServiceProductSupplierID") REFERENCES "ServiceProductSupplier"("ServiceProductSupplierID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductCancellationPolicy" ADD CONSTRAINT "ServiceProductCancellationPolicy_ServiceProductOptionID_fkey" FOREIGN KEY ("ServiceProductOptionID") REFERENCES "ServiceProductOption"("ServiceProductOptionID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductCancellationPolicy" ADD CONSTRAINT "ServiceProductCancellationPolicy_ServiceProductVariantID_fkey" FOREIGN KEY ("ServiceProductVariantID") REFERENCES "ServiceProductVariant"("ServiceProductVariantID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductCancellationPolicyRule" ADD CONSTRAINT "ServiceProductCancellationPolicyRule_ServiceProductCancell_fkey" FOREIGN KEY ("ServiceProductCancellationPolicyID") REFERENCES "ServiceProductCancellationPolicy"("ServiceProductCancellationPolicyID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductCancellationPolicyRule" ADD CONSTRAINT "ServiceProductCancellationPolicyRule_CancellationPolicyTyp_fkey" FOREIGN KEY ("CancellationPolicyTypeID") REFERENCES "CancellationPolicyType"("CancellationPolicyTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;
