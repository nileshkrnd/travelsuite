-- Amenity master — individual amenities/facilities (WiFi, TV, Mini Bar, …), grouped under a category.
CREATE TABLE "AmenityMaster" (
    "AmenityID" BIGSERIAL NOT NULL,
    "AmenityFacilityCategoryID" BIGINT NOT NULL,
    "AmenityCode" VARCHAR(50) NOT NULL,
    "AmenityName" VARCHAR(250) NOT NULL,
    "Description" TEXT,
    "Icon" VARCHAR(255),
    "IsFilterable" BOOLEAN NOT NULL DEFAULT false,
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDateTime" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDateTime" TIMESTAMPTZ(6),
    "IsDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AmenityMaster_pkey" PRIMARY KEY ("AmenityID")
);

CREATE UNIQUE INDEX "AmenityMaster_AmenityCode_key" ON "AmenityMaster"("AmenityCode");
CREATE INDEX "Amenity_AmenityFacilityCategoryID_idx" ON "AmenityMaster"("AmenityFacilityCategoryID");

ALTER TABLE "AmenityMaster" ADD CONSTRAINT "AmenityMaster_AmenityFacilityCategoryID_fkey"
  FOREIGN KEY ("AmenityFacilityCategoryID") REFERENCES "AmenityFacilityCategoryMaster"("AmenityFacilityCategoryID") ON DELETE RESTRICT ON UPDATE CASCADE;
