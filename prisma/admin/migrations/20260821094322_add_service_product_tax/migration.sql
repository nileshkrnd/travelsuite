-- CreateTable
CREATE TABLE "TaxCalculationType" (
    "TaxCalculationTypeID" BIGSERIAL NOT NULL,
    "TaxCalculationTypeCode" VARCHAR(50) NOT NULL,
    "TaxCalculationTypeName" VARCHAR(100) NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "TaxCalculationType_pkey" PRIMARY KEY ("TaxCalculationTypeID")
);

-- CreateTable
CREATE TABLE "TaxApplicationBasis" (
    "TaxApplicationBasisID" BIGSERIAL NOT NULL,
    "TaxApplicationBasisCode" VARCHAR(50) NOT NULL,
    "TaxApplicationBasisName" VARCHAR(100) NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "TaxApplicationBasis_pkey" PRIMARY KEY ("TaxApplicationBasisID")
);

-- CreateTable
CREATE TABLE "ServiceProductTax" (
    "ServiceProductTaxID" BIGSERIAL NOT NULL,
    "ServiceProductID" BIGINT NOT NULL,
    "ServiceProductSupplierID" BIGINT,
    "ServiceProductOptionID" BIGINT,
    "ServiceProductVariantID" BIGINT,
    "TaxID" BIGINT NOT NULL,
    "TaxName" VARCHAR(200) NOT NULL,
    "TaxCalculationTypeID" BIGINT NOT NULL,
    "TaxRate" DECIMAL(18,4),
    "TaxAmount" DECIMAL(18,4),
    "TaxApplicationBasisID" BIGINT NOT NULL,
    "IsInclusive" BOOLEAN NOT NULL DEFAULT false,
    "IsCompound" BOOLEAN NOT NULL DEFAULT false,
    "SequenceNo" INTEGER NOT NULL DEFAULT 0,
    "FromDate" DATE NOT NULL,
    "ToDate" DATE,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "Remarks" VARCHAR(500),
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "ServiceProductTax_pkey" PRIMARY KEY ("ServiceProductTaxID")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaxCalculationType_TaxCalculationTypeCode_key" ON "TaxCalculationType"("TaxCalculationTypeCode");

-- CreateIndex
CREATE UNIQUE INDEX "TaxApplicationBasis_TaxApplicationBasisCode_key" ON "TaxApplicationBasis"("TaxApplicationBasisCode");

-- CreateIndex
CREATE INDEX "SvcProductTax_ProductID_idx" ON "ServiceProductTax"("ServiceProductID");

-- CreateIndex
CREATE INDEX "SvcProductTax_SupplierID_idx" ON "ServiceProductTax"("ServiceProductSupplierID");

-- CreateIndex
CREATE INDEX "SvcProductTax_OptionID_idx" ON "ServiceProductTax"("ServiceProductOptionID");

-- CreateIndex
CREATE INDEX "SvcProductTax_VariantID_idx" ON "ServiceProductTax"("ServiceProductVariantID");

-- CreateIndex
CREATE INDEX "SvcProductTax_TaxID_idx" ON "ServiceProductTax"("TaxID");

-- CreateIndex
CREATE INDEX "SvcProductTax_CalcTypeID_idx" ON "ServiceProductTax"("TaxCalculationTypeID");

-- CreateIndex
CREATE INDEX "SvcProductTax_BasisID_idx" ON "ServiceProductTax"("TaxApplicationBasisID");

-- AddForeignKey
ALTER TABLE "ServiceProductTax" ADD CONSTRAINT "ServiceProductTax_ServiceProductID_fkey" FOREIGN KEY ("ServiceProductID") REFERENCES "ServiceProduct"("ServiceProductID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductTax" ADD CONSTRAINT "ServiceProductTax_ServiceProductSupplierID_fkey" FOREIGN KEY ("ServiceProductSupplierID") REFERENCES "ServiceProductSupplier"("ServiceProductSupplierID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductTax" ADD CONSTRAINT "ServiceProductTax_ServiceProductOptionID_fkey" FOREIGN KEY ("ServiceProductOptionID") REFERENCES "ServiceProductOption"("ServiceProductOptionID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductTax" ADD CONSTRAINT "ServiceProductTax_ServiceProductVariantID_fkey" FOREIGN KEY ("ServiceProductVariantID") REFERENCES "ServiceProductVariant"("ServiceProductVariantID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductTax" ADD CONSTRAINT "ServiceProductTax_TaxID_fkey" FOREIGN KEY ("TaxID") REFERENCES "Tax"("TaxID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductTax" ADD CONSTRAINT "ServiceProductTax_TaxCalculationTypeID_fkey" FOREIGN KEY ("TaxCalculationTypeID") REFERENCES "TaxCalculationType"("TaxCalculationTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductTax" ADD CONSTRAINT "ServiceProductTax_TaxApplicationBasisID_fkey" FOREIGN KEY ("TaxApplicationBasisID") REFERENCES "TaxApplicationBasis"("TaxApplicationBasisID") ON DELETE RESTRICT ON UPDATE CASCADE;
