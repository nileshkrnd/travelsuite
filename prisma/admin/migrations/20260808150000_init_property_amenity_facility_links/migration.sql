-- Many-to-many: Property <-> Amenity (which amenities from the Amenity master a property offers).
CREATE TABLE "PropertyAmenityLink" (
    "PropertyID" INTEGER NOT NULL,
    "AmenityID" BIGINT NOT NULL,

    CONSTRAINT "PropertyAmenityLink_pkey" PRIMARY KEY ("PropertyID", "AmenityID")
);

CREATE INDEX "PropertyAmenityLink_AmenityID_idx" ON "PropertyAmenityLink"("AmenityID");

ALTER TABLE "PropertyAmenityLink" ADD CONSTRAINT "PropertyAmenityLink_PropertyID_fkey"
  FOREIGN KEY ("PropertyID") REFERENCES "Property"("PropertyID") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PropertyAmenityLink" ADD CONSTRAINT "PropertyAmenityLink_AmenityID_fkey"
  FOREIGN KEY ("AmenityID") REFERENCES "AmenityMaster"("AmenityID") ON DELETE CASCADE ON UPDATE CASCADE;

-- Many-to-many: Property <-> Facility (which facilities from the Facility master a property offers).
CREATE TABLE "PropertyFacilityLink" (
    "PropertyID" INTEGER NOT NULL,
    "FacilityID" BIGINT NOT NULL,

    CONSTRAINT "PropertyFacilityLink_pkey" PRIMARY KEY ("PropertyID", "FacilityID")
);

CREATE INDEX "PropertyFacilityLink_FacilityID_idx" ON "PropertyFacilityLink"("FacilityID");

ALTER TABLE "PropertyFacilityLink" ADD CONSTRAINT "PropertyFacilityLink_PropertyID_fkey"
  FOREIGN KEY ("PropertyID") REFERENCES "Property"("PropertyID") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PropertyFacilityLink" ADD CONSTRAINT "PropertyFacilityLink_FacilityID_fkey"
  FOREIGN KEY ("FacilityID") REFERENCES "FacilityMaster"("FacilityID") ON DELETE CASCADE ON UPDATE CASCADE;
