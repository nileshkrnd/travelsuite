-- Global reference masters (no TenantID / CompanyID)

CREATE TABLE "Country" (
    "CountryID" SERIAL NOT NULL,
    "CountryCode" VARCHAR(10) NOT NULL,
    "CountryName" VARCHAR(200) NOT NULL,
    "DialCode" VARCHAR(20) NOT NULL,
    "Status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "Country_pkey" PRIMARY KEY ("CountryID")
);

CREATE UNIQUE INDEX "Country_CountryCode_key" ON "Country"("CountryCode");

CREATE TABLE "City" (
    "CityID" SERIAL NOT NULL,
    "CountryID" INTEGER NOT NULL,
    "CityCode" VARCHAR(100) NOT NULL,
    "CityName" VARCHAR(200) NOT NULL,
    "Status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "City_pkey" PRIMARY KEY ("CityID")
);

CREATE UNIQUE INDEX "City_Country_Code_key" ON "City"("CountryID", "CityCode");
CREATE INDEX "City_CountryID_idx" ON "City"("CountryID");

ALTER TABLE "City"
  ADD CONSTRAINT "City_CountryID_fkey"
  FOREIGN KEY ("CountryID") REFERENCES "Country"("CountryID")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "Currency" (
    "CurrencyID" SERIAL NOT NULL,
    "CurrencyCode" VARCHAR(10) NOT NULL,
    "CurrencyName" VARCHAR(200) NOT NULL,
    "Symbol" VARCHAR(20) NOT NULL DEFAULT '',
    "SmallCurrencyName" VARCHAR(100) NOT NULL,
    "SignificantDigit" INTEGER NOT NULL DEFAULT 2,
    "Status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "Currency_pkey" PRIMARY KEY ("CurrencyID")
);

CREATE UNIQUE INDEX "Currency_CurrencyCode_key" ON "Currency"("CurrencyCode");
