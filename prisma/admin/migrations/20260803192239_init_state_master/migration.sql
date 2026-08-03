-- CreateTable
CREATE TABLE "StateAdministrativeType" (
    "StateAdministrativeTypeID" SERIAL NOT NULL,
    "TypeName" VARCHAR(100) NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "StateAdministrativeType_pkey" PRIMARY KEY ("StateAdministrativeTypeID")
);

-- CreateTable
CREATE TABLE "State" (
    "StateID" SERIAL NOT NULL,
    "CountryID" INTEGER NOT NULL,
    "StateCode" VARCHAR(20) NOT NULL,
    "ISOCode" VARCHAR(20),
    "StateName" VARCHAR(150) NOT NULL,
    "NativeName" VARCHAR(150),
    "StateAdministrativeTypeID" INTEGER,
    "CapitalCityID" INTEGER,
    "Latitude" DECIMAL(9,6),
    "Longitude" DECIMAL(9,6),
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDateTime" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDateTime" TIMESTAMPTZ(6),
    "IsDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "State_pkey" PRIMARY KEY ("StateID")
);

-- CreateIndex
CREATE UNIQUE INDEX "StateAdministrativeType_TypeName_key" ON "StateAdministrativeType"("TypeName");

-- CreateIndex
CREATE UNIQUE INDEX "State_ISOCode_key" ON "State"("ISOCode");

-- CreateIndex
CREATE INDEX "State_CountryID_idx" ON "State"("CountryID");

-- CreateIndex
CREATE UNIQUE INDEX "State_Country_Code_key" ON "State"("CountryID", "StateCode");

-- AddForeignKey
ALTER TABLE "State" ADD CONSTRAINT "State_CountryID_fkey" FOREIGN KEY ("CountryID") REFERENCES "Country"("CountryID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "State" ADD CONSTRAINT "State_StateAdministrativeTypeID_fkey" FOREIGN KEY ("StateAdministrativeTypeID") REFERENCES "StateAdministrativeType"("StateAdministrativeTypeID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "State" ADD CONSTRAINT "State_CapitalCityID_fkey" FOREIGN KEY ("CapitalCityID") REFERENCES "City"("CityID") ON DELETE SET NULL ON UPDATE CASCADE;
