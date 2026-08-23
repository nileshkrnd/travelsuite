-- CreateTable
CREATE TABLE "PaymentTermMaster" (
    "PaymentTermID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "PaymentTermCode" VARCHAR(50) NOT NULL,
    "PaymentTermName" VARCHAR(100) NOT NULL,
    "NumberOfDays" INTEGER NOT NULL DEFAULT 0,
    "Description" VARCHAR(250),
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "PaymentTermMaster_pkey" PRIMARY KEY ("PaymentTermID")
);

-- CreateTable
CREATE TABLE "B2BCustomerType" (
    "B2BCustomerTypeID" BIGSERIAL NOT NULL,
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

    CONSTRAINT "B2BCustomerType_pkey" PRIMARY KEY ("B2BCustomerTypeID")
);

-- CreateTable
CREATE TABLE "B2BCustomerCategory" (
    "B2BCustomerCategoryID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "B2BCustomerTypeID" BIGINT NOT NULL,
    "CategoryCode" VARCHAR(50) NOT NULL,
    "CategoryName" VARCHAR(150) NOT NULL,
    "Description" VARCHAR(250),
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDate" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy" INTEGER,
    "UpdatedDate" TIMESTAMPTZ(6),

    CONSTRAINT "B2BCustomerCategory_pkey" PRIMARY KEY ("B2BCustomerCategoryID")
);

-- CreateTable
CREATE TABLE "B2BCustomer" (
    "B2BCustomerID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "B2BCustomerCode" VARCHAR(50) NOT NULL,
    "B2BCustomerName" VARCHAR(250) NOT NULL,
    "B2BCustomerTypeID" BIGINT NOT NULL,
    "B2BCustomerCategoryID" BIGINT,
    "ParentB2BCustomerID" BIGINT,
    "RegistrationNumber" VARCHAR(100),
    "TaxRegistrationNumber" VARCHAR(100),
    "CountryID" INTEGER NOT NULL,
    "CurrencyID" INTEGER NOT NULL,
    "PaymentTermID" BIGINT,
    "CreditLimit" DECIMAL(18,4),
    "CreditDays" INTEGER,
    "AccountManagerID" INTEGER,
    "StatusID" BIGINT NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDate" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy" INTEGER,
    "UpdatedDate" TIMESTAMPTZ(6),

    CONSTRAINT "B2BCustomer_pkey" PRIMARY KEY ("B2BCustomerID")
);

-- CreateIndex
CREATE INDEX "PaymentTermMaster_TenantID_CompanyID_idx" ON "PaymentTermMaster"("TenantID", "CompanyID");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTermMaster_Tenant_Company_Code_key" ON "PaymentTermMaster"("TenantID", "CompanyID", "PaymentTermCode");

-- CreateIndex
CREATE INDEX "B2BCustomerType_TenantID_CompanyID_idx" ON "B2BCustomerType"("TenantID", "CompanyID");

-- CreateIndex
CREATE UNIQUE INDEX "B2BCustomerType_Tenant_Company_Code_key" ON "B2BCustomerType"("TenantID", "CompanyID", "CustomerTypeCode");

-- CreateIndex
CREATE INDEX "B2BCustomerCategory_TenantID_CompanyID_idx" ON "B2BCustomerCategory"("TenantID", "CompanyID");

-- CreateIndex
CREATE INDEX "B2BCustomerCategory_TypeID_idx" ON "B2BCustomerCategory"("B2BCustomerTypeID");

-- CreateIndex
CREATE UNIQUE INDEX "B2BCustomerCategory_Tenant_Company_Type_Code_key" ON "B2BCustomerCategory"("TenantID", "CompanyID", "B2BCustomerTypeID", "CategoryCode");

-- CreateIndex
CREATE INDEX "B2BCustomer_TenantID_CompanyID_idx" ON "B2BCustomer"("TenantID", "CompanyID");

-- CreateIndex
CREATE INDEX "B2BCustomer_TypeID_idx" ON "B2BCustomer"("B2BCustomerTypeID");

-- CreateIndex
CREATE INDEX "B2BCustomer_CategoryID_idx" ON "B2BCustomer"("B2BCustomerCategoryID");

-- CreateIndex
CREATE INDEX "B2BCustomer_ParentID_idx" ON "B2BCustomer"("ParentB2BCustomerID");

-- CreateIndex
CREATE INDEX "B2BCustomer_CountryID_idx" ON "B2BCustomer"("CountryID");

-- CreateIndex
CREATE INDEX "B2BCustomer_CurrencyID_idx" ON "B2BCustomer"("CurrencyID");

-- CreateIndex
CREATE INDEX "B2BCustomer_PaymentTermID_idx" ON "B2BCustomer"("PaymentTermID");

-- CreateIndex
CREATE INDEX "B2BCustomer_AccountManagerID_idx" ON "B2BCustomer"("AccountManagerID");

-- CreateIndex
CREATE INDEX "B2BCustomer_StatusID_idx" ON "B2BCustomer"("StatusID");

-- CreateIndex
CREATE UNIQUE INDEX "B2BCustomer_Tenant_Company_Code_key" ON "B2BCustomer"("TenantID", "CompanyID", "B2BCustomerCode");

-- AddForeignKey
ALTER TABLE "B2BCustomerCategory" ADD CONSTRAINT "B2BCustomerCategory_B2BCustomerTypeID_fkey" FOREIGN KEY ("B2BCustomerTypeID") REFERENCES "B2BCustomerType"("B2BCustomerTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "B2BCustomer" ADD CONSTRAINT "B2BCustomer_B2BCustomerTypeID_fkey" FOREIGN KEY ("B2BCustomerTypeID") REFERENCES "B2BCustomerType"("B2BCustomerTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "B2BCustomer" ADD CONSTRAINT "B2BCustomer_B2BCustomerCategoryID_fkey" FOREIGN KEY ("B2BCustomerCategoryID") REFERENCES "B2BCustomerCategory"("B2BCustomerCategoryID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "B2BCustomer" ADD CONSTRAINT "B2BCustomer_ParentB2BCustomerID_fkey" FOREIGN KEY ("ParentB2BCustomerID") REFERENCES "B2BCustomer"("B2BCustomerID") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "B2BCustomer" ADD CONSTRAINT "B2BCustomer_CountryID_fkey" FOREIGN KEY ("CountryID") REFERENCES "Country"("CountryID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "B2BCustomer" ADD CONSTRAINT "B2BCustomer_CurrencyID_fkey" FOREIGN KEY ("CurrencyID") REFERENCES "Currency"("CurrencyID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "B2BCustomer" ADD CONSTRAINT "B2BCustomer_PaymentTermID_fkey" FOREIGN KEY ("PaymentTermID") REFERENCES "PaymentTermMaster"("PaymentTermID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "B2BCustomer" ADD CONSTRAINT "B2BCustomer_AccountManagerID_fkey" FOREIGN KEY ("AccountManagerID") REFERENCES "Employee"("EmployeeID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "B2BCustomer" ADD CONSTRAINT "B2BCustomer_StatusID_fkey" FOREIGN KEY ("StatusID") REFERENCES "CommonStatus"("CommonStatusID") ON DELETE RESTRICT ON UPDATE CASCADE;
