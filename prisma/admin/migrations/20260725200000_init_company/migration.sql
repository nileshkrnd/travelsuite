-- CreateTable
CREATE TABLE "Company" (
    "CompanyID" SERIAL NOT NULL,
    "CompanyUid" VARCHAR(100) NOT NULL,
    "CompanyGroupID" INTEGER,
    "CompanyCode" VARCHAR(20) NOT NULL,
    "CompanyName" VARCHAR(200) NOT NULL,
    "Address1" VARCHAR(200) NOT NULL,
    "Address2" VARCHAR(200) NOT NULL DEFAULT '',
    "CountryID" INTEGER NOT NULL,
    "CityID" INTEGER NOT NULL,
    "CurrencyID" INTEGER NOT NULL,
    "ZipCode" VARCHAR(50) NOT NULL,
    "CountryDialCode" VARCHAR(5) NOT NULL,
    "ContactNumber" VARCHAR(20),
    "Fax" VARCHAR(50),
    "ContactPerson" VARCHAR(200),
    "EmailAddress" VARCHAR(200),
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),
    "IsRoundOff" BOOLEAN NOT NULL DEFAULT false,
    "NoOfSignificantDigits" INTEGER NOT NULL DEFAULT 2,
    "IsDisplayNumberInThousands" BOOLEAN,
    "TenantID" INTEGER NOT NULL,
    "CompanyLogo" VARCHAR(100) NOT NULL DEFAULT '',
    "CompanyFavIcon" VARCHAR(100) NOT NULL DEFAULT '',

    CONSTRAINT "Company_pkey" PRIMARY KEY ("CompanyID")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_CompanyUid_key" ON "Company"("CompanyUid");

-- CreateIndex
CREATE INDEX "Company_TenantID_idx" ON "Company"("TenantID");

-- CreateIndex
CREATE INDEX "Company_CountryID_idx" ON "Company"("CountryID");

-- CreateIndex
CREATE INDEX "Company_CityID_idx" ON "Company"("CityID");

-- CreateIndex
CREATE INDEX "Company_CurrencyID_idx" ON "Company"("CurrencyID");

-- CreateIndex
CREATE UNIQUE INDEX "Company_Tenant_Code_key" ON "Company"("TenantID", "CompanyCode");

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_CountryID_fkey" FOREIGN KEY ("CountryID") REFERENCES "Country"("CountryID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_CityID_fkey" FOREIGN KEY ("CityID") REFERENCES "City"("CityID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_CurrencyID_fkey" FOREIGN KEY ("CurrencyID") REFERENCES "Currency"("CurrencyID") ON DELETE RESTRICT ON UPDATE CASCADE;
