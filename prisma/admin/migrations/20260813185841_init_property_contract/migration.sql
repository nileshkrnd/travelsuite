-- CreateTable
CREATE TABLE "ContractType" (
    "ContractTypeID" BIGSERIAL NOT NULL,
    "ContractTypeName" VARCHAR(100) NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "ContractType_pkey" PRIMARY KEY ("ContractTypeID")
);

-- CreateTable
CREATE TABLE "ContractStatus" (
    "ContractStatusID" BIGSERIAL NOT NULL,
    "ContractStatusName" VARCHAR(100) NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "ContractStatus_pkey" PRIMARY KEY ("ContractStatusID")
);

-- CreateTable
CREATE TABLE "PropertyContract" (
    "PropertyContractID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "PropertyID" INTEGER NOT NULL,
    "SupplierID" BIGINT NOT NULL,
    "ContractNumber" VARCHAR(100) NOT NULL,
    "ContractName" VARCHAR(200) NOT NULL,
    "ContractTypeID" BIGINT NOT NULL,
    "StartDate" DATE NOT NULL,
    "EndDate" DATE NOT NULL,
    "ContractCurrencyID" INTEGER NOT NULL,
    "ContractStatusID" BIGINT NOT NULL,
    "ContractVersion" INTEGER NOT NULL DEFAULT 1,
    "SignedDate" DATE,
    "SignedByEmployeeID" INTEGER,
    "SupplierContactID" BIGINT,
    "PaymentTerms" TEXT,
    "GeneralTerms" TEXT,
    "Remarks" TEXT,
    "ContractFileUrl" VARCHAR(500),
    "ContractFileName" VARCHAR(255),
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "PropertyContract_pkey" PRIMARY KEY ("PropertyContractID")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContractType_ContractTypeName_key" ON "ContractType"("ContractTypeName");

-- CreateIndex
CREATE UNIQUE INDEX "ContractStatus_ContractStatusName_key" ON "ContractStatus"("ContractStatusName");

-- CreateIndex
CREATE INDEX "PropertyContract_TenantID_CompanyID_idx" ON "PropertyContract"("TenantID", "CompanyID");

-- CreateIndex
CREATE INDEX "PropertyContract_PropertyID_idx" ON "PropertyContract"("PropertyID");

-- CreateIndex
CREATE INDEX "PropertyContract_SupplierID_idx" ON "PropertyContract"("SupplierID");

-- CreateIndex
CREATE INDEX "PropertyContract_ContractStatusID_idx" ON "PropertyContract"("ContractStatusID");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyContract_Tenant_Property_Number_key" ON "PropertyContract"("TenantID", "PropertyID", "ContractNumber");

-- AddForeignKey
ALTER TABLE "PropertyContract" ADD CONSTRAINT "PropertyContract_PropertyID_fkey" FOREIGN KEY ("PropertyID") REFERENCES "Property"("PropertyID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyContract" ADD CONSTRAINT "PropertyContract_SupplierID_fkey" FOREIGN KEY ("SupplierID") REFERENCES "Supplier"("SupplierID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyContract" ADD CONSTRAINT "PropertyContract_ContractTypeID_fkey" FOREIGN KEY ("ContractTypeID") REFERENCES "ContractType"("ContractTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyContract" ADD CONSTRAINT "PropertyContract_ContractStatusID_fkey" FOREIGN KEY ("ContractStatusID") REFERENCES "ContractStatus"("ContractStatusID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyContract" ADD CONSTRAINT "PropertyContract_ContractCurrencyID_fkey" FOREIGN KEY ("ContractCurrencyID") REFERENCES "Currency"("CurrencyID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyContract" ADD CONSTRAINT "PropertyContract_SignedByEmployeeID_fkey" FOREIGN KEY ("SignedByEmployeeID") REFERENCES "Employee"("EmployeeID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyContract" ADD CONSTRAINT "PropertyContract_SupplierContactID_fkey" FOREIGN KEY ("SupplierContactID") REFERENCES "SupplierUser"("SupplierUserID") ON DELETE SET NULL ON UPDATE CASCADE;
