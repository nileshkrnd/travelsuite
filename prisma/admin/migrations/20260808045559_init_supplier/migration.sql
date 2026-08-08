-- CreateTable
CREATE TABLE "Supplier" (
    "SupplierID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "SupplierCode" VARCHAR(50) NOT NULL,
    "SupplierName" VARCHAR(200) NOT NULL,
    "SupplierLegalName" VARCHAR(250) NOT NULL,
    "SupplierTypeID" BIGINT NOT NULL,
    "RegistrationNumber" VARCHAR(100),
    "TaxVATNumber" VARCHAR(100),
    "CountryID" INTEGER NOT NULL,
    "StateID" INTEGER,
    "CityID" INTEGER NOT NULL,
    "Address" TEXT NOT NULL,
    "PostalCode" VARCHAR(20),
    "Website" VARCHAR(250),
    "CurrencyID" INTEGER NOT NULL,
    "TimeZoneID" INTEGER NOT NULL,
    "RequiresExtranetAccess" BOOLEAN NOT NULL DEFAULT false,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDateTime" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDateTime" TIMESTAMPTZ(6),
    "IsDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("SupplierID")
);

-- CreateIndex
CREATE INDEX "Supplier_TenantID_CompanyID_idx" ON "Supplier"("TenantID", "CompanyID");

-- CreateIndex
CREATE INDEX "Supplier_SupplierTypeID_idx" ON "Supplier"("SupplierTypeID");

-- CreateIndex
CREATE INDEX "Supplier_CountryID_idx" ON "Supplier"("CountryID");

-- CreateIndex
CREATE INDEX "Supplier_CityID_idx" ON "Supplier"("CityID");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_Tenant_Code_key" ON "Supplier"("TenantID", "SupplierCode");

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_SupplierTypeID_fkey" FOREIGN KEY ("SupplierTypeID") REFERENCES "SupplierType"("SupplierTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_CountryID_fkey" FOREIGN KEY ("CountryID") REFERENCES "Country"("CountryID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_StateID_fkey" FOREIGN KEY ("StateID") REFERENCES "State"("StateID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_CityID_fkey" FOREIGN KEY ("CityID") REFERENCES "City"("CityID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_CurrencyID_fkey" FOREIGN KEY ("CurrencyID") REFERENCES "Currency"("CurrencyID") ON DELETE RESTRICT ON UPDATE CASCADE;
