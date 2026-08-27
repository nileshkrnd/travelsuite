-- CreateTable
CREATE TABLE "CashCustomerTypeMaster" (
    "CashCustomerTypeID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "CustomerTypeCode" VARCHAR(50) NOT NULL,
    "CustomerTypeName" VARCHAR(100) NOT NULL,
    "Description" VARCHAR(250),
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDate" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy" INTEGER,
    "UpdatedDate" TIMESTAMPTZ(6),

    CONSTRAINT "CashCustomerTypeMaster_pkey" PRIMARY KEY ("CashCustomerTypeID")
);

-- CreateTable
CREATE TABLE "CashCustomer" (
    "CashCustomerID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "CashCustomerCode" VARCHAR(50) NOT NULL,
    "CashCustomerTypeID" BIGINT NOT NULL,
    "CustomerName" VARCHAR(250) NOT NULL,
    "FirstName" VARCHAR(100),
    "LastName" VARCHAR(100),
    "MobileCountryCode" VARCHAR(10),
    "MobileNumber" VARCHAR(30),
    "Email" VARCHAR(200),
    "CountryID" INTEGER,
    "NationalityID" INTEGER,
    "CurrencyID" INTEGER NOT NULL,
    "StatusID" BIGINT NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDate" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy" INTEGER,
    "UpdatedDate" TIMESTAMPTZ(6),

    CONSTRAINT "CashCustomer_pkey" PRIMARY KEY ("CashCustomerID")
);

-- CreateIndex
CREATE INDEX "CashCustomerTypeMaster_TenantID_CompanyID_idx" ON "CashCustomerTypeMaster"("TenantID", "CompanyID");

-- CreateIndex
CREATE UNIQUE INDEX "CashCustomerTypeMaster_Tenant_Company_Code_key" ON "CashCustomerTypeMaster"("TenantID", "CompanyID", "CustomerTypeCode");

-- CreateIndex
CREATE INDEX "CashCustomer_TenantID_CompanyID_idx" ON "CashCustomer"("TenantID", "CompanyID");

-- CreateIndex
CREATE INDEX "CashCustomer_TypeID_idx" ON "CashCustomer"("CashCustomerTypeID");

-- CreateIndex
CREATE INDEX "CashCustomer_CountryID_idx" ON "CashCustomer"("CountryID");

-- CreateIndex
CREATE INDEX "CashCustomer_NationalityID_idx" ON "CashCustomer"("NationalityID");

-- CreateIndex
CREATE INDEX "CashCustomer_CurrencyID_idx" ON "CashCustomer"("CurrencyID");

-- CreateIndex
CREATE INDEX "CashCustomer_StatusID_idx" ON "CashCustomer"("StatusID");

-- CreateIndex
CREATE UNIQUE INDEX "CashCustomer_Tenant_Company_Code_key" ON "CashCustomer"("TenantID", "CompanyID", "CashCustomerCode");

-- AddForeignKey
ALTER TABLE "CashCustomer" ADD CONSTRAINT "CashCustomer_CashCustomerTypeID_fkey" FOREIGN KEY ("CashCustomerTypeID") REFERENCES "CashCustomerTypeMaster"("CashCustomerTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashCustomer" ADD CONSTRAINT "CashCustomer_CountryID_fkey" FOREIGN KEY ("CountryID") REFERENCES "Country"("CountryID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashCustomer" ADD CONSTRAINT "CashCustomer_NationalityID_fkey" FOREIGN KEY ("NationalityID") REFERENCES "Country"("CountryID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashCustomer" ADD CONSTRAINT "CashCustomer_CurrencyID_fkey" FOREIGN KEY ("CurrencyID") REFERENCES "Currency"("CurrencyID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashCustomer" ADD CONSTRAINT "CashCustomer_StatusID_fkey" FOREIGN KEY ("StatusID") REFERENCES "CommonStatus"("CommonStatusID") ON DELETE RESTRICT ON UPDATE CASCADE;
