-- CreateTable
CREATE TABLE "TaxType" (
    "TaxTypeID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "TaxTypeCode" VARCHAR(50) NOT NULL,
    "TaxTypeName" VARCHAR(150) NOT NULL,
    "Description" VARCHAR(500),
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "TaxType_pkey" PRIMARY KEY ("TaxTypeID")
);

-- CreateTable
CREATE TABLE "Tax" (
    "TaxID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER,
    "CompanyID" INTEGER,
    "TaxTypeID" BIGINT NOT NULL,
    "TaxCode" VARCHAR(50) NOT NULL,
    "TaxName" VARCHAR(200) NOT NULL,
    "CountryID" INTEGER,
    "RegionID" INTEGER,
    "CalculationType" VARCHAR(30) NOT NULL,
    "DefaultRate" DECIMAL(18,4),
    "DefaultAmount" DECIMAL(18,4),
    "CurrencyID" INTEGER,
    "ApplicationBasis" VARCHAR(50) NOT NULL,
    "IsInclusiveDefault" BOOLEAN NOT NULL DEFAULT false,
    "IsCompound" BOOLEAN NOT NULL DEFAULT false,
    "EffectiveFrom" DATE,
    "EffectiveTo" DATE,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "Tax_pkey" PRIMARY KEY ("TaxID")
);

-- CreateTable
CREATE TABLE "PropertyContractTax" (
    "PropertyContractTaxID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "PropertyContractID" BIGINT NOT NULL,
    "TaxID" BIGINT NOT NULL,
    "TaxName" VARCHAR(200) NOT NULL,
    "CalculationType" VARCHAR(30) NOT NULL,
    "TaxRate" DECIMAL(18,4),
    "TaxAmount" DECIMAL(18,4),
    "CurrencyID" INTEGER,
    "ApplicationBasis" VARCHAR(50) NOT NULL,
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

    CONSTRAINT "PropertyContractTax_pkey" PRIMARY KEY ("PropertyContractTaxID")
);

-- CreateIndex
CREATE INDEX "TaxType_TenantID_CompanyID_idx" ON "TaxType"("TenantID", "CompanyID");

-- CreateIndex
CREATE UNIQUE INDEX "TaxType_Tenant_Company_Code_key" ON "TaxType"("TenantID", "CompanyID", "TaxTypeCode");

-- CreateIndex
CREATE UNIQUE INDEX "Tax_TaxCode_key" ON "Tax"("TaxCode");

-- CreateIndex
CREATE INDEX "Tax_TenantID_CompanyID_idx" ON "Tax"("TenantID", "CompanyID");

-- CreateIndex
CREATE INDEX "Tax_TaxTypeID_idx" ON "Tax"("TaxTypeID");

-- CreateIndex
CREATE INDEX "Tax_CountryID_idx" ON "Tax"("CountryID");

-- CreateIndex
CREATE INDEX "Tax_RegionID_idx" ON "Tax"("RegionID");

-- CreateIndex
CREATE INDEX "Tax_CurrencyID_idx" ON "Tax"("CurrencyID");

-- CreateIndex
CREATE INDEX "PropertyContractTax_TenantID_CompanyID_idx" ON "PropertyContractTax"("TenantID", "CompanyID");

-- CreateIndex
CREATE INDEX "PropertyContractTax_PropertyContractID_idx" ON "PropertyContractTax"("PropertyContractID");

-- CreateIndex
CREATE INDEX "PropertyContractTax_TaxID_idx" ON "PropertyContractTax"("TaxID");

-- CreateIndex
CREATE INDEX "PropertyContractTax_CurrencyID_idx" ON "PropertyContractTax"("CurrencyID");

-- AddForeignKey
ALTER TABLE "Tax" ADD CONSTRAINT "Tax_TaxTypeID_fkey" FOREIGN KEY ("TaxTypeID") REFERENCES "TaxType"("TaxTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tax" ADD CONSTRAINT "Tax_CountryID_fkey" FOREIGN KEY ("CountryID") REFERENCES "Country"("CountryID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tax" ADD CONSTRAINT "Tax_RegionID_fkey" FOREIGN KEY ("RegionID") REFERENCES "Region"("RegionID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tax" ADD CONSTRAINT "Tax_CurrencyID_fkey" FOREIGN KEY ("CurrencyID") REFERENCES "Currency"("CurrencyID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyContractTax" ADD CONSTRAINT "PropertyContractTax_PropertyContractID_fkey" FOREIGN KEY ("PropertyContractID") REFERENCES "PropertyContract"("PropertyContractID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyContractTax" ADD CONSTRAINT "PropertyContractTax_TaxID_fkey" FOREIGN KEY ("TaxID") REFERENCES "Tax"("TaxID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyContractTax" ADD CONSTRAINT "PropertyContractTax_CurrencyID_fkey" FOREIGN KEY ("CurrencyID") REFERENCES "Currency"("CurrencyID") ON DELETE RESTRICT ON UPDATE CASCADE;
