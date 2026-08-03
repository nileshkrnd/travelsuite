-- CreateTable
CREATE TABLE "AreaType" (
    "AreaTypeID" SERIAL NOT NULL,
    "AreaTypeName" VARCHAR(150) NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDateTime" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDateTime" TIMESTAMPTZ(6),
    "IsDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AreaType_pkey" PRIMARY KEY ("AreaTypeID")
);

-- CreateTable
CREATE TABLE "Area" (
    "AreaID" SERIAL NOT NULL,
    "CountryID" INTEGER NOT NULL,
    "CityID" INTEGER NOT NULL,
    "AreaCode" VARCHAR(30) NOT NULL,
    "AreaName" VARCHAR(150) NOT NULL,
    "NativeName" VARCHAR(150),
    "AreaTypeID" INTEGER,
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

    CONSTRAINT "Area_pkey" PRIMARY KEY ("AreaID")
);

-- CreateIndex
CREATE UNIQUE INDEX "AreaType_AreaTypeName_key" ON "AreaType"("AreaTypeName");

-- CreateIndex
CREATE INDEX "Area_CountryID_idx" ON "Area"("CountryID");

-- CreateIndex
CREATE INDEX "Area_CityID_idx" ON "Area"("CityID");

-- CreateIndex
CREATE UNIQUE INDEX "Area_City_Code_key" ON "Area"("CityID", "AreaCode");

-- AddForeignKey
ALTER TABLE "Area" ADD CONSTRAINT "Area_CountryID_fkey" FOREIGN KEY ("CountryID") REFERENCES "Country"("CountryID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Area" ADD CONSTRAINT "Area_CityID_fkey" FOREIGN KEY ("CityID") REFERENCES "City"("CityID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Area" ADD CONSTRAINT "Area_AreaTypeID_fkey" FOREIGN KEY ("AreaTypeID") REFERENCES "AreaType"("AreaTypeID") ON DELETE SET NULL ON UPDATE CASCADE;
