-- Facility master — property-level facilities (Restaurant, Gym, Spa, Parking, …), grouped under a category.
CREATE TABLE "FacilityMaster" (
    "FacilityID" BIGSERIAL NOT NULL,
    "AmenityFacilityCategoryID" BIGINT NOT NULL,
    "FacilityCode" VARCHAR(50) NOT NULL,
    "FacilityName" VARCHAR(250) NOT NULL,
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

    CONSTRAINT "FacilityMaster_pkey" PRIMARY KEY ("FacilityID")
);

CREATE UNIQUE INDEX "FacilityMaster_FacilityCode_key" ON "FacilityMaster"("FacilityCode");
CREATE INDEX "Facility_AmenityFacilityCategoryID_idx" ON "FacilityMaster"("AmenityFacilityCategoryID");

ALTER TABLE "FacilityMaster" ADD CONSTRAINT "FacilityMaster_AmenityFacilityCategoryID_fkey"
  FOREIGN KEY ("AmenityFacilityCategoryID") REFERENCES "AmenityFacilityCategoryMaster"("AmenityFacilityCategoryID") ON DELETE RESTRICT ON UPDATE CASCADE;
