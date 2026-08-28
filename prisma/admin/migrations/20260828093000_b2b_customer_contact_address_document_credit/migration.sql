-- B2B customer lookup masters + contact, address, document, credit child tables.

CREATE TABLE "B2BCustomerContactType" (
    "B2BCustomerContactTypeID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "ContactTypeCode" VARCHAR(50) NOT NULL,
    "ContactTypeName" VARCHAR(100) NOT NULL,
    "Description" VARCHAR(250),
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDate" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy" INTEGER,
    "UpdatedDate" TIMESTAMPTZ(6),
    CONSTRAINT "B2BCustomerContactType_pkey" PRIMARY KEY ("B2BCustomerContactTypeID")
);

CREATE UNIQUE INDEX "B2BCustomerContactType_Tenant_Company_Code_key" ON "B2BCustomerContactType"("TenantID", "CompanyID", "ContactTypeCode");
CREATE INDEX "B2BCustomerContactType_TenantID_CompanyID_idx" ON "B2BCustomerContactType"("TenantID", "CompanyID");

CREATE TABLE "AddressTypeMaster" (
    "AddressTypeID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "AddressTypeCode" VARCHAR(50) NOT NULL,
    "AddressTypeName" VARCHAR(100) NOT NULL,
    "Description" VARCHAR(250),
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDate" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy" INTEGER,
    "UpdatedDate" TIMESTAMPTZ(6),
    CONSTRAINT "AddressTypeMaster_pkey" PRIMARY KEY ("AddressTypeID")
);

CREATE UNIQUE INDEX "AddressTypeMaster_Tenant_Company_Code_key" ON "AddressTypeMaster"("TenantID", "CompanyID", "AddressTypeCode");
CREATE INDEX "AddressTypeMaster_TenantID_CompanyID_idx" ON "AddressTypeMaster"("TenantID", "CompanyID");

CREATE TABLE "B2BCustomerDocumentType" (
    "DocumentTypeID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "DocumentTypeCode" VARCHAR(50) NOT NULL,
    "DocumentTypeName" VARCHAR(150) NOT NULL,
    "Description" VARCHAR(250),
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDate" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy" INTEGER,
    "UpdatedDate" TIMESTAMPTZ(6),
    CONSTRAINT "B2BCustomerDocumentType_pkey" PRIMARY KEY ("DocumentTypeID")
);

CREATE UNIQUE INDEX "B2BCustomerDocumentType_Tenant_Company_Code_key" ON "B2BCustomerDocumentType"("TenantID", "CompanyID", "DocumentTypeCode");
CREATE INDEX "B2BCustomerDocumentType_TenantID_CompanyID_idx" ON "B2BCustomerDocumentType"("TenantID", "CompanyID");

CREATE TABLE "B2BCustomerCreditStatus" (
    "B2BCustomerCreditStatusID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "CreditStatusCode" VARCHAR(50) NOT NULL,
    "CreditStatusName" VARCHAR(100) NOT NULL,
    "Description" VARCHAR(250),
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDate" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy" INTEGER,
    "UpdatedDate" TIMESTAMPTZ(6),
    CONSTRAINT "B2BCustomerCreditStatus_pkey" PRIMARY KEY ("B2BCustomerCreditStatusID")
);

CREATE UNIQUE INDEX "B2BCustomerCreditStatus_Tenant_Company_Code_key" ON "B2BCustomerCreditStatus"("TenantID", "CompanyID", "CreditStatusCode");
CREATE INDEX "B2BCustomerCreditStatus_TenantID_CompanyID_idx" ON "B2BCustomerCreditStatus"("TenantID", "CompanyID");

CREATE TABLE "B2BCustomerContact" (
    "B2BCustomerContactID" BIGSERIAL NOT NULL,
    "B2BCustomerID" BIGINT NOT NULL,
    "B2BCustomerContactTypeID" BIGINT NOT NULL,
    "FirstName" VARCHAR(100) NOT NULL,
    "LastName" VARCHAR(100) NOT NULL,
    "Designation" VARCHAR(150),
    "Email" VARCHAR(200),
    "MobileCountryCode" VARCHAR(10),
    "MobileNumber" VARCHAR(30),
    "PhoneCountryCode" VARCHAR(10),
    "PhoneNumber" VARCHAR(30),
    "IsPrimary" BOOLEAN NOT NULL DEFAULT false,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDate" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy" INTEGER,
    "UpdatedDate" TIMESTAMPTZ(6),
    CONSTRAINT "B2BCustomerContact_pkey" PRIMARY KEY ("B2BCustomerContactID")
);

CREATE INDEX "B2BCustomerContact_CustomerID_idx" ON "B2BCustomerContact"("B2BCustomerID");
CREATE INDEX "B2BCustomerContact_TypeID_idx" ON "B2BCustomerContact"("B2BCustomerContactTypeID");
CREATE UNIQUE INDEX "B2BCustomerContact_OnePrimary_key" ON "B2BCustomerContact"("B2BCustomerID") WHERE "IsPrimary" = true AND "IsActive" = true;

CREATE TABLE "B2BCustomerAddress" (
    "B2BCustomerAddressID" BIGSERIAL NOT NULL,
    "B2BCustomerID" BIGINT NOT NULL,
    "AddressTypeID" BIGINT NOT NULL,
    "AddressLine1" VARCHAR(250) NOT NULL,
    "AddressLine2" VARCHAR(250),
    "Area" VARCHAR(150),
    "CountryID" INTEGER NOT NULL,
    "StateID" INTEGER,
    "CityID" INTEGER,
    "PostalCode" VARCHAR(30),
    "Latitude" DECIMAL(10,7),
    "Longitude" DECIMAL(10,7),
    "IsPrimary" BOOLEAN NOT NULL DEFAULT false,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDate" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy" INTEGER,
    "UpdatedDate" TIMESTAMPTZ(6),
    CONSTRAINT "B2BCustomerAddress_pkey" PRIMARY KEY ("B2BCustomerAddressID")
);

CREATE INDEX "B2BCustomerAddress_CustomerID_idx" ON "B2BCustomerAddress"("B2BCustomerID");
CREATE INDEX "B2BCustomerAddress_TypeID_idx" ON "B2BCustomerAddress"("AddressTypeID");
CREATE INDEX "B2BCustomerAddress_CountryID_idx" ON "B2BCustomerAddress"("CountryID");
CREATE INDEX "B2BCustomerAddress_StateID_idx" ON "B2BCustomerAddress"("StateID");
CREATE INDEX "B2BCustomerAddress_CityID_idx" ON "B2BCustomerAddress"("CityID");
CREATE UNIQUE INDEX "B2BCustomerAddress_OnePrimary_key" ON "B2BCustomerAddress"("B2BCustomerID") WHERE "IsPrimary" = true AND "IsActive" = true;

CREATE TABLE "B2BCustomerDocument" (
    "B2BCustomerDocumentID" BIGSERIAL NOT NULL,
    "B2BCustomerID" BIGINT NOT NULL,
    "DocumentTypeID" BIGINT NOT NULL,
    "DocumentNumber" VARCHAR(100) NOT NULL,
    "IssuingCountryID" INTEGER,
    "IssueDate" DATE,
    "ExpiryDate" DATE,
    "DocumentFileID" BIGINT,
    "IsPrimary" BOOLEAN NOT NULL DEFAULT false,
    "IsVerified" BOOLEAN NOT NULL DEFAULT false,
    "VerifiedBy" INTEGER,
    "VerifiedDate" TIMESTAMPTZ(6),
    "StatusID" BIGINT NOT NULL,
    "Remarks" VARCHAR(500),
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDate" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy" INTEGER,
    "UpdatedDate" TIMESTAMPTZ(6),
    CONSTRAINT "B2BCustomerDocument_pkey" PRIMARY KEY ("B2BCustomerDocumentID")
);

CREATE INDEX "B2BCustomerDocument_CustomerID_idx" ON "B2BCustomerDocument"("B2BCustomerID");
CREATE INDEX "B2BCustomerDocument_TypeID_idx" ON "B2BCustomerDocument"("DocumentTypeID");
CREATE INDEX "B2BCustomerDocument_IssuingCountryID_idx" ON "B2BCustomerDocument"("IssuingCountryID");
CREATE INDEX "B2BCustomerDocument_StatusID_idx" ON "B2BCustomerDocument"("StatusID");
CREATE UNIQUE INDEX "B2BCustomerDocument_OnePrimary_key" ON "B2BCustomerDocument"("B2BCustomerID") WHERE "IsPrimary" = true AND "IsActive" = true;

CREATE TABLE "B2BCustomerCredit" (
    "B2BCustomerCreditID" BIGSERIAL NOT NULL,
    "B2BCustomerID" BIGINT NOT NULL,
    "CreditLimit" DECIMAL(18,4) NOT NULL,
    "CreditDays" INTEGER NOT NULL,
    "PaymentTermID" BIGINT,
    "B2BCustomerCreditStatusID" BIGINT NOT NULL,
    "EffectiveFrom" DATE NOT NULL,
    "EffectiveTo" DATE,
    "ApprovedBy" INTEGER,
    "ApprovedDate" TIMESTAMPTZ(6),
    "Remarks" VARCHAR(500),
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDate" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy" INTEGER,
    "UpdatedDate" TIMESTAMPTZ(6),
    CONSTRAINT "B2BCustomerCredit_pkey" PRIMARY KEY ("B2BCustomerCreditID")
);

CREATE INDEX "B2BCustomerCredit_CustomerID_idx" ON "B2BCustomerCredit"("B2BCustomerID");
CREATE INDEX "B2BCustomerCredit_PaymentTermID_idx" ON "B2BCustomerCredit"("PaymentTermID");
CREATE INDEX "B2BCustomerCredit_StatusID_idx" ON "B2BCustomerCredit"("B2BCustomerCreditStatusID");
CREATE UNIQUE INDEX "B2BCustomerCredit_Active_key" ON "B2BCustomerCredit"("B2BCustomerID") WHERE "IsActive" = true;

ALTER TABLE "B2BCustomerContact" ADD CONSTRAINT "B2BCustomerContact_B2BCustomerID_fkey" FOREIGN KEY ("B2BCustomerID") REFERENCES "B2BCustomer"("B2BCustomerID") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "B2BCustomerContact" ADD CONSTRAINT "B2BCustomerContact_B2BCustomerContactTypeID_fkey" FOREIGN KEY ("B2BCustomerContactTypeID") REFERENCES "B2BCustomerContactType"("B2BCustomerContactTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "B2BCustomerAddress" ADD CONSTRAINT "B2BCustomerAddress_B2BCustomerID_fkey" FOREIGN KEY ("B2BCustomerID") REFERENCES "B2BCustomer"("B2BCustomerID") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "B2BCustomerAddress" ADD CONSTRAINT "B2BCustomerAddress_AddressTypeID_fkey" FOREIGN KEY ("AddressTypeID") REFERENCES "AddressTypeMaster"("AddressTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "B2BCustomerAddress" ADD CONSTRAINT "B2BCustomerAddress_CountryID_fkey" FOREIGN KEY ("CountryID") REFERENCES "Country"("CountryID") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "B2BCustomerAddress" ADD CONSTRAINT "B2BCustomerAddress_StateID_fkey" FOREIGN KEY ("StateID") REFERENCES "State"("StateID") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "B2BCustomerAddress" ADD CONSTRAINT "B2BCustomerAddress_CityID_fkey" FOREIGN KEY ("CityID") REFERENCES "City"("CityID") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "B2BCustomerDocument" ADD CONSTRAINT "B2BCustomerDocument_B2BCustomerID_fkey" FOREIGN KEY ("B2BCustomerID") REFERENCES "B2BCustomer"("B2BCustomerID") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "B2BCustomerDocument" ADD CONSTRAINT "B2BCustomerDocument_DocumentTypeID_fkey" FOREIGN KEY ("DocumentTypeID") REFERENCES "B2BCustomerDocumentType"("DocumentTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "B2BCustomerDocument" ADD CONSTRAINT "B2BCustomerDocument_IssuingCountryID_fkey" FOREIGN KEY ("IssuingCountryID") REFERENCES "Country"("CountryID") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "B2BCustomerDocument" ADD CONSTRAINT "B2BCustomerDocument_StatusID_fkey" FOREIGN KEY ("StatusID") REFERENCES "CommonStatus"("CommonStatusID") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "B2BCustomerCredit" ADD CONSTRAINT "B2BCustomerCredit_B2BCustomerID_fkey" FOREIGN KEY ("B2BCustomerID") REFERENCES "B2BCustomer"("B2BCustomerID") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "B2BCustomerCredit" ADD CONSTRAINT "B2BCustomerCredit_PaymentTermID_fkey" FOREIGN KEY ("PaymentTermID") REFERENCES "PaymentTermMaster"("PaymentTermID") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "B2BCustomerCredit" ADD CONSTRAINT "B2BCustomerCredit_B2BCustomerCreditStatusID_fkey" FOREIGN KEY ("B2BCustomerCreditStatusID") REFERENCES "B2BCustomerCreditStatus"("B2BCustomerCreditStatusID") ON DELETE RESTRICT ON UPDATE CASCADE;
