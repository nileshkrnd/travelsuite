-- CreateTable
CREATE TABLE "ServiceProductLocationType" (
    "ServiceProductLocationTypeID" BIGSERIAL NOT NULL,
    "LocationTypeCode" VARCHAR(50) NOT NULL,
    "LocationTypeName" VARCHAR(100) NOT NULL,
    "Description" VARCHAR(500),
    "IsPickupLocation" BOOLEAN NOT NULL DEFAULT false,
    "IsDropoffLocation" BOOLEAN NOT NULL DEFAULT false,
    "IsMeetingPoint" BOOLEAN NOT NULL DEFAULT false,
    "IsDestination" BOOLEAN NOT NULL DEFAULT false,
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "ServiceProductLocationType_pkey" PRIMARY KEY ("ServiceProductLocationTypeID")
);

-- CreateTable
CREATE TABLE "ServiceProductLocation" (
    "ServiceProductLocationID" BIGSERIAL NOT NULL,
    "ServiceProductID" BIGINT NOT NULL,
    "ServiceProductLocationTypeID" BIGINT NOT NULL,
    "CountryID" INTEGER NOT NULL,
    "RegionID" INTEGER,
    "CityID" INTEGER,
    "AreaID" INTEGER,
    "LocationName" VARCHAR(250) NOT NULL,
    "AddressLine1" VARCHAR(500),
    "AddressLine2" VARCHAR(500),
    "PostalCode" VARCHAR(30),
    "Latitude" DECIMAL(10,7),
    "Longitude" DECIMAL(10,7),
    "GooglePlaceID" VARCHAR(200),
    "GoogleMapURL" VARCHAR(1000),
    "LocationInstructions" VARCHAR(2000),
    "IsPrimary" BOOLEAN NOT NULL DEFAULT false,
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "CommonStatusID" BIGINT NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "ServiceProductLocation_pkey" PRIMARY KEY ("ServiceProductLocationID")
);

-- CreateTable
CREATE TABLE "ServiceProductSupplierLocation" (
    "ServiceProductSupplierLocationID" BIGSERIAL NOT NULL,
    "ServiceProductSupplierID" BIGINT NOT NULL,
    "ServiceProductLocationID" BIGINT,
    "ServiceProductLocationTypeID" BIGINT NOT NULL,
    "CountryID" INTEGER NOT NULL,
    "RegionID" INTEGER,
    "CityID" INTEGER,
    "AreaID" INTEGER,
    "SupplierLocationCode" VARCHAR(100),
    "SupplierLocationName" VARCHAR(250) NOT NULL,
    "SupplierLocationReference" VARCHAR(200),
    "AddressLine1" VARCHAR(500),
    "AddressLine2" VARCHAR(500),
    "PostalCode" VARCHAR(30),
    "Latitude" DECIMAL(10,7),
    "Longitude" DECIMAL(10,7),
    "SupplierGooglePlaceID" VARCHAR(200),
    "LocationInstructions" VARCHAR(2000),
    "IsPickupAvailable" BOOLEAN NOT NULL DEFAULT false,
    "IsDropoffAvailable" BOOLEAN NOT NULL DEFAULT false,
    "IsMeetingPoint" BOOLEAN NOT NULL DEFAULT false,
    "IsPrimary" BOOLEAN NOT NULL DEFAULT false,
    "IsAvailable" BOOLEAN NOT NULL DEFAULT true,
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "CommonStatusID" BIGINT NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "ServiceProductSupplierLocation_pkey" PRIMARY KEY ("ServiceProductSupplierLocationID")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceProductLocationType_LocationTypeCode_key" ON "ServiceProductLocationType"("LocationTypeCode");

-- CreateIndex
CREATE INDEX "SvcProductLocation_ProductID_idx" ON "ServiceProductLocation"("ServiceProductID");

-- CreateIndex
CREATE INDEX "SvcProductLocation_TypeID_idx" ON "ServiceProductLocation"("ServiceProductLocationTypeID");

-- CreateIndex
CREATE INDEX "SvcProductLocation_CountryID_idx" ON "ServiceProductLocation"("CountryID");

-- CreateIndex
CREATE INDEX "SvcProductLocation_CityID_idx" ON "ServiceProductLocation"("CityID");

-- CreateIndex
CREATE INDEX "SvcProductLocation_AreaID_idx" ON "ServiceProductLocation"("AreaID");

-- CreateIndex
CREATE INDEX "SvcProductLocation_CommonStatusID_idx" ON "ServiceProductLocation"("CommonStatusID");

-- CreateIndex
CREATE INDEX "SvcProductSupplierLoc_SupplierLinkID_idx" ON "ServiceProductSupplierLocation"("ServiceProductSupplierID");

-- CreateIndex
CREATE INDEX "SvcProductSupplierLoc_LocationID_idx" ON "ServiceProductSupplierLocation"("ServiceProductLocationID");

-- CreateIndex
CREATE INDEX "SvcProductSupplierLoc_TypeID_idx" ON "ServiceProductSupplierLocation"("ServiceProductLocationTypeID");

-- CreateIndex
CREATE INDEX "SvcProductSupplierLoc_CountryID_idx" ON "ServiceProductSupplierLocation"("CountryID");

-- CreateIndex
CREATE INDEX "SvcProductSupplierLoc_CityID_idx" ON "ServiceProductSupplierLocation"("CityID");

-- CreateIndex
CREATE INDEX "SvcProductSupplierLoc_CommonStatusID_idx" ON "ServiceProductSupplierLocation"("CommonStatusID");

-- AddForeignKey
ALTER TABLE "ServiceProductLocation" ADD CONSTRAINT "ServiceProductLocation_ServiceProductID_fkey" FOREIGN KEY ("ServiceProductID") REFERENCES "ServiceProduct"("ServiceProductID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductLocation" ADD CONSTRAINT "ServiceProductLocation_ServiceProductLocationTypeID_fkey" FOREIGN KEY ("ServiceProductLocationTypeID") REFERENCES "ServiceProductLocationType"("ServiceProductLocationTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductLocation" ADD CONSTRAINT "ServiceProductLocation_CountryID_fkey" FOREIGN KEY ("CountryID") REFERENCES "Country"("CountryID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductLocation" ADD CONSTRAINT "ServiceProductLocation_RegionID_fkey" FOREIGN KEY ("RegionID") REFERENCES "Region"("RegionID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductLocation" ADD CONSTRAINT "ServiceProductLocation_CityID_fkey" FOREIGN KEY ("CityID") REFERENCES "City"("CityID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductLocation" ADD CONSTRAINT "ServiceProductLocation_AreaID_fkey" FOREIGN KEY ("AreaID") REFERENCES "Area"("AreaID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductLocation" ADD CONSTRAINT "ServiceProductLocation_CommonStatusID_fkey" FOREIGN KEY ("CommonStatusID") REFERENCES "CommonStatus"("CommonStatusID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductSupplierLocation" ADD CONSTRAINT "ServiceProductSupplierLocation_ServiceProductSupplierID_fkey" FOREIGN KEY ("ServiceProductSupplierID") REFERENCES "ServiceProductSupplier"("ServiceProductSupplierID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductSupplierLocation" ADD CONSTRAINT "ServiceProductSupplierLocation_ServiceProductLocationID_fkey" FOREIGN KEY ("ServiceProductLocationID") REFERENCES "ServiceProductLocation"("ServiceProductLocationID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductSupplierLocation" ADD CONSTRAINT "ServiceProductSupplierLocation_ServiceProductLocationTypeI_fkey" FOREIGN KEY ("ServiceProductLocationTypeID") REFERENCES "ServiceProductLocationType"("ServiceProductLocationTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductSupplierLocation" ADD CONSTRAINT "ServiceProductSupplierLocation_CountryID_fkey" FOREIGN KEY ("CountryID") REFERENCES "Country"("CountryID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductSupplierLocation" ADD CONSTRAINT "ServiceProductSupplierLocation_RegionID_fkey" FOREIGN KEY ("RegionID") REFERENCES "Region"("RegionID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductSupplierLocation" ADD CONSTRAINT "ServiceProductSupplierLocation_CityID_fkey" FOREIGN KEY ("CityID") REFERENCES "City"("CityID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductSupplierLocation" ADD CONSTRAINT "ServiceProductSupplierLocation_AreaID_fkey" FOREIGN KEY ("AreaID") REFERENCES "Area"("AreaID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductSupplierLocation" ADD CONSTRAINT "ServiceProductSupplierLocation_CommonStatusID_fkey" FOREIGN KEY ("CommonStatusID") REFERENCES "CommonStatus"("CommonStatusID") ON DELETE RESTRICT ON UPDATE CASCADE;
