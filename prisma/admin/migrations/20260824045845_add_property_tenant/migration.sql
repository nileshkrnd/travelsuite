-- CreateTable
CREATE TABLE "PropertyTenantTypeMaster" (
    "PropertyTenantTypeID" BIGSERIAL NOT NULL,
    "TenantTypeCode" VARCHAR(50) NOT NULL,
    "TenantTypeName" VARCHAR(100) NOT NULL,
    "Description" VARCHAR(250),
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDate" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy" INTEGER,
    "UpdatedDate" TIMESTAMPTZ(6),

    CONSTRAINT "PropertyTenantTypeMaster_pkey" PRIMARY KEY ("PropertyTenantTypeID")
);

-- CreateTable
CREATE TABLE "IdentityDocumentTypeMaster" (
    "IdentityDocumentTypeID" BIGSERIAL NOT NULL,
    "DocumentTypeCode" VARCHAR(50) NOT NULL,
    "DocumentTypeName" VARCHAR(100) NOT NULL,
    "Description" VARCHAR(250),
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDate" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy" INTEGER,
    "UpdatedDate" TIMESTAMPTZ(6),

    CONSTRAINT "IdentityDocumentTypeMaster_pkey" PRIMARY KEY ("IdentityDocumentTypeID")
);

-- CreateTable
CREATE TABLE "IdentityDocumentCountryMaster" (
    "IdentityDocumentCountryID" BIGSERIAL NOT NULL,
    "IdentityDocumentTypeID" BIGINT NOT NULL,
    "CountryID" INTEGER NOT NULL,
    "DocumentDisplayName" VARCHAR(150) NOT NULL,
    "DocumentShortName" VARCHAR(50),
    "IssuingAuthority" VARCHAR(200),
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDate" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy" INTEGER,
    "UpdatedDate" TIMESTAMPTZ(6),

    CONSTRAINT "IdentityDocumentCountryMaster_pkey" PRIMARY KEY ("IdentityDocumentCountryID")
);

-- CreateTable
CREATE TABLE "PropertyTenantAddressTypeMaster" (
    "PropertyTenantAddressTypeID" BIGSERIAL NOT NULL,
    "AddressTypeCode" VARCHAR(50) NOT NULL,
    "AddressTypeName" VARCHAR(100) NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "PropertyTenantAddressTypeMaster_pkey" PRIMARY KEY ("PropertyTenantAddressTypeID")
);

-- CreateTable
CREATE TABLE "PropertyTenant" (
    "PropertyTenantID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "TenantCode" VARCHAR(50) NOT NULL,
    "PropertyTenantTypeID" BIGINT NOT NULL,
    "TenantName" VARCHAR(250) NOT NULL,
    "LegalName" VARCHAR(250),
    "RegistrationNumber" VARCHAR(100),
    "TaxRegistrationNumber" VARCHAR(100),
    "NationalityID" INTEGER,
    "CountryOfResidenceID" INTEGER,
    "CountryID" INTEGER NOT NULL,
    "CityID" INTEGER,
    "ContactPersonName" VARCHAR(150),
    "Email" VARCHAR(200),
    "MobileCountryCode" VARCHAR(10),
    "MobileNumber" VARCHAR(30),
    "StatusID" BIGINT NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDate" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy" INTEGER,
    "UpdatedDate" TIMESTAMPTZ(6),

    CONSTRAINT "PropertyTenant_pkey" PRIMARY KEY ("PropertyTenantID")
);

-- CreateTable
CREATE TABLE "PropertyTenantDocument" (
    "PropertyTenantDocumentID" BIGSERIAL NOT NULL,
    "PropertyTenantID" BIGINT NOT NULL,
    "IdentityDocumentCountryID" BIGINT NOT NULL,
    "DocumentNumber" VARCHAR(100) NOT NULL,
    "IssueDate" DATE,
    "ExpiryDate" DATE,
    "DocumentFileURL" VARCHAR(500),
    "IsPrimary" BOOLEAN NOT NULL DEFAULT false,
    "IsVerified" BOOLEAN NOT NULL DEFAULT false,
    "VerifiedDate" TIMESTAMPTZ(6),
    "VerifiedBy" INTEGER,
    "StatusID" BIGINT NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDate" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy" INTEGER,
    "UpdatedDate" TIMESTAMPTZ(6),

    CONSTRAINT "PropertyTenantDocument_pkey" PRIMARY KEY ("PropertyTenantDocumentID")
);

-- CreateTable
CREATE TABLE "PropertyTenantAddress" (
    "PropertyTenantAddressID" BIGSERIAL NOT NULL,
    "PropertyTenantID" BIGINT NOT NULL,
    "AddressTypeID" BIGINT NOT NULL,
    "AddressLine1" VARCHAR(250) NOT NULL,
    "AddressLine2" VARCHAR(250),
    "Area" VARCHAR(150),
    "CountryID" INTEGER NOT NULL,
    "StateID" INTEGER,
    "CityID" INTEGER,
    "PostalCode" VARCHAR(30),
    "IsPrimary" BOOLEAN NOT NULL DEFAULT false,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDate" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy" INTEGER,
    "UpdatedDate" TIMESTAMPTZ(6),

    CONSTRAINT "PropertyTenantAddress_pkey" PRIMARY KEY ("PropertyTenantAddressID")
);

-- CreateIndex
CREATE UNIQUE INDEX "PropertyTenantTypeMaster_TenantTypeCode_key" ON "PropertyTenantTypeMaster"("TenantTypeCode");

-- CreateIndex
CREATE UNIQUE INDEX "IdentityDocumentTypeMaster_DocumentTypeCode_key" ON "IdentityDocumentTypeMaster"("DocumentTypeCode");

-- CreateIndex
CREATE INDEX "IdentityDocumentCountryMaster_CountryID_idx" ON "IdentityDocumentCountryMaster"("CountryID");

-- CreateIndex
CREATE UNIQUE INDEX "IdentityDocumentCountryMaster_Type_Country_key" ON "IdentityDocumentCountryMaster"("IdentityDocumentTypeID", "CountryID");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyTenantAddressTypeMaster_AddressTypeCode_key" ON "PropertyTenantAddressTypeMaster"("AddressTypeCode");

-- CreateIndex
CREATE INDEX "PropertyTenant_TenantID_CompanyID_idx" ON "PropertyTenant"("TenantID", "CompanyID");

-- CreateIndex
CREATE INDEX "PropertyTenant_TypeID_idx" ON "PropertyTenant"("PropertyTenantTypeID");

-- CreateIndex
CREATE INDEX "PropertyTenant_NationalityID_idx" ON "PropertyTenant"("NationalityID");

-- CreateIndex
CREATE INDEX "PropertyTenant_CountryOfResidenceID_idx" ON "PropertyTenant"("CountryOfResidenceID");

-- CreateIndex
CREATE INDEX "PropertyTenant_CountryID_idx" ON "PropertyTenant"("CountryID");

-- CreateIndex
CREATE INDEX "PropertyTenant_CityID_idx" ON "PropertyTenant"("CityID");

-- CreateIndex
CREATE INDEX "PropertyTenant_StatusID_idx" ON "PropertyTenant"("StatusID");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyTenant_Tenant_Company_Code_key" ON "PropertyTenant"("TenantID", "CompanyID", "TenantCode");

-- CreateIndex
CREATE INDEX "PropertyTenantDocument_PropertyTenantID_idx" ON "PropertyTenantDocument"("PropertyTenantID");

-- CreateIndex
CREATE INDEX "PropertyTenantDocument_DocCountryID_idx" ON "PropertyTenantDocument"("IdentityDocumentCountryID");

-- CreateIndex
CREATE INDEX "PropertyTenantDocument_StatusID_idx" ON "PropertyTenantDocument"("StatusID");

-- CreateIndex
CREATE INDEX "PropertyTenantAddress_PropertyTenantID_idx" ON "PropertyTenantAddress"("PropertyTenantID");

-- CreateIndex
CREATE INDEX "PropertyTenantAddress_CountryID_idx" ON "PropertyTenantAddress"("CountryID");

-- CreateIndex
CREATE INDEX "PropertyTenantAddress_StateID_idx" ON "PropertyTenantAddress"("StateID");

-- CreateIndex
CREATE INDEX "PropertyTenantAddress_CityID_idx" ON "PropertyTenantAddress"("CityID");

-- AddForeignKey
ALTER TABLE "IdentityDocumentCountryMaster" ADD CONSTRAINT "IdentityDocumentCountryMaster_IdentityDocumentTypeID_fkey" FOREIGN KEY ("IdentityDocumentTypeID") REFERENCES "IdentityDocumentTypeMaster"("IdentityDocumentTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdentityDocumentCountryMaster" ADD CONSTRAINT "IdentityDocumentCountryMaster_CountryID_fkey" FOREIGN KEY ("CountryID") REFERENCES "Country"("CountryID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyTenant" ADD CONSTRAINT "PropertyTenant_PropertyTenantTypeID_fkey" FOREIGN KEY ("PropertyTenantTypeID") REFERENCES "PropertyTenantTypeMaster"("PropertyTenantTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyTenant" ADD CONSTRAINT "PropertyTenant_NationalityID_fkey" FOREIGN KEY ("NationalityID") REFERENCES "Country"("CountryID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyTenant" ADD CONSTRAINT "PropertyTenant_CountryOfResidenceID_fkey" FOREIGN KEY ("CountryOfResidenceID") REFERENCES "Country"("CountryID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyTenant" ADD CONSTRAINT "PropertyTenant_CountryID_fkey" FOREIGN KEY ("CountryID") REFERENCES "Country"("CountryID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyTenant" ADD CONSTRAINT "PropertyTenant_CityID_fkey" FOREIGN KEY ("CityID") REFERENCES "City"("CityID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyTenant" ADD CONSTRAINT "PropertyTenant_StatusID_fkey" FOREIGN KEY ("StatusID") REFERENCES "CommonStatus"("CommonStatusID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyTenantDocument" ADD CONSTRAINT "PropertyTenantDocument_PropertyTenantID_fkey" FOREIGN KEY ("PropertyTenantID") REFERENCES "PropertyTenant"("PropertyTenantID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyTenantDocument" ADD CONSTRAINT "PropertyTenantDocument_IdentityDocumentCountryID_fkey" FOREIGN KEY ("IdentityDocumentCountryID") REFERENCES "IdentityDocumentCountryMaster"("IdentityDocumentCountryID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyTenantDocument" ADD CONSTRAINT "PropertyTenantDocument_StatusID_fkey" FOREIGN KEY ("StatusID") REFERENCES "CommonStatus"("CommonStatusID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyTenantAddress" ADD CONSTRAINT "PropertyTenantAddress_PropertyTenantID_fkey" FOREIGN KEY ("PropertyTenantID") REFERENCES "PropertyTenant"("PropertyTenantID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyTenantAddress" ADD CONSTRAINT "PropertyTenantAddress_AddressTypeID_fkey" FOREIGN KEY ("AddressTypeID") REFERENCES "PropertyTenantAddressTypeMaster"("PropertyTenantAddressTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyTenantAddress" ADD CONSTRAINT "PropertyTenantAddress_CountryID_fkey" FOREIGN KEY ("CountryID") REFERENCES "Country"("CountryID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyTenantAddress" ADD CONSTRAINT "PropertyTenantAddress_StateID_fkey" FOREIGN KEY ("StateID") REFERENCES "State"("StateID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyTenantAddress" ADD CONSTRAINT "PropertyTenantAddress_CityID_fkey" FOREIGN KEY ("CityID") REFERENCES "City"("CityID") ON DELETE SET NULL ON UPDATE CASCADE;
