-- CreateTable
CREATE TABLE "AirlineType" (
    "AirlineTypeID" SERIAL NOT NULL,
    "AirlineTypeName" VARCHAR(100) NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "AirlineType_pkey" PRIMARY KEY ("AirlineTypeID")
);

-- CreateTable
CREATE TABLE "Airline" (
    "AirlineID" SERIAL NOT NULL,
    "AirlineTypeID" INTEGER NOT NULL,
    "AirlineCode" VARCHAR(3) NOT NULL,
    "AirlineName" VARCHAR(200) NOT NULL,
    "AirlineNumericCode" INTEGER,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),
    "PNRMaxDigit" INTEGER NOT NULL,
    "TKTMaxDigit" INTEGER NOT NULL,
    "IsTKTNumberOnly" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Airline_pkey" PRIMARY KEY ("AirlineID")
);

-- CreateTable
CREATE TABLE "Airport" (
    "AirportID" SERIAL NOT NULL,
    "AirportCode" VARCHAR(3) NOT NULL,
    "AirportName" VARCHAR(300) NOT NULL,
    "CountryID" INTEGER NOT NULL,
    "CityID" INTEGER NOT NULL,
    "ParentAirportID" INTEGER NOT NULL DEFAULT 0,
    "Latitude" VARCHAR(20),
    "Longitude" VARCHAR(20),
    "IsActive" BOOLEAN DEFAULT true,
    "CreatedBy" INTEGER,
    "CreatedDtTm" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "Airport_pkey" PRIMARY KEY ("AirportID")
);

-- CreateIndex
CREATE UNIQUE INDEX "AirlineType_AirlineTypeName_key" ON "AirlineType"("AirlineTypeName");

-- CreateIndex
CREATE UNIQUE INDEX "Airline_AirlineCode_key" ON "Airline"("AirlineCode");

-- CreateIndex
CREATE INDEX "Airline_AirlineTypeID_idx" ON "Airline"("AirlineTypeID");

-- CreateIndex
CREATE UNIQUE INDEX "Airport_AirportCode_key" ON "Airport"("AirportCode");

-- CreateIndex
CREATE INDEX "Airport_CountryID_idx" ON "Airport"("CountryID");

-- CreateIndex
CREATE INDEX "Airport_CityID_idx" ON "Airport"("CityID");

-- AddForeignKey
ALTER TABLE "Airline" ADD CONSTRAINT "Airline_AirlineTypeID_fkey" FOREIGN KEY ("AirlineTypeID") REFERENCES "AirlineType"("AirlineTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Airport" ADD CONSTRAINT "Airport_CountryID_fkey" FOREIGN KEY ("CountryID") REFERENCES "Country"("CountryID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Airport" ADD CONSTRAINT "Airport_CityID_fkey" FOREIGN KEY ("CityID") REFERENCES "City"("CityID") ON DELETE RESTRICT ON UPDATE CASCADE;
