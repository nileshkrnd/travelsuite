-- CreateTable
CREATE TABLE "LocationType" (
    "LocationTypeID" SERIAL NOT NULL,
    "LocationTypeName" VARCHAR(150) NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDateTime" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDateTime" TIMESTAMPTZ(6),
    "IsDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "LocationType_pkey" PRIMARY KEY ("LocationTypeID")
);

-- CreateTable
CREATE TABLE "Location" (
    "LocationID" SERIAL NOT NULL,
    "CountryID" INTEGER NOT NULL,
    "StateID" INTEGER,
    "CityID" INTEGER NOT NULL,
    "AreaID" INTEGER NOT NULL,
    "LocationCode" VARCHAR(30) NOT NULL,
    "LocationName" VARCHAR(150) NOT NULL,
    "NativeName" VARCHAR(150),
    "LocationTypeID" INTEGER,
    "ZoneNumber" VARCHAR(20),
    "Latitude" DECIMAL(9,6),
    "Longitude" DECIMAL(9,6),
    "GooglePlaceID" VARCHAR(255),
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsPopular" BOOLEAN NOT NULL DEFAULT false,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDateTime" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDateTime" TIMESTAMPTZ(6),
    "IsDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("LocationID")
);

-- CreateIndex
CREATE UNIQUE INDEX "LocationType_LocationTypeName_key" ON "LocationType"("LocationTypeName");

-- CreateIndex
CREATE INDEX "Location_CountryID_idx" ON "Location"("CountryID");

-- CreateIndex
CREATE INDEX "Location_StateID_idx" ON "Location"("StateID");

-- CreateIndex
CREATE INDEX "Location_CityID_idx" ON "Location"("CityID");

-- CreateIndex
CREATE INDEX "Location_AreaID_idx" ON "Location"("AreaID");

-- CreateIndex
CREATE UNIQUE INDEX "Location_Area_Code_key" ON "Location"("AreaID", "LocationCode");

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_CountryID_fkey" FOREIGN KEY ("CountryID") REFERENCES "Country"("CountryID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_StateID_fkey" FOREIGN KEY ("StateID") REFERENCES "State"("StateID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_CityID_fkey" FOREIGN KEY ("CityID") REFERENCES "City"("CityID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_AreaID_fkey" FOREIGN KEY ("AreaID") REFERENCES "Area"("AreaID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_LocationTypeID_fkey" FOREIGN KEY ("LocationTypeID") REFERENCES "LocationType"("LocationTypeID") ON DELETE SET NULL ON UPDATE CASCADE;
