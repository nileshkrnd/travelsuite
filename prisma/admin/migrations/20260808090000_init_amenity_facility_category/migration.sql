-- Amenity/Facility Category master — global lookup classifying amenities & facilities as Property, Room, or Both.
CREATE TABLE "AmenityFacilityCategoryMaster" (
    "AmenityFacilityCategoryID" BIGSERIAL NOT NULL,
    "CategoryCode" VARCHAR(50) NOT NULL,
    "CategoryName" VARCHAR(150) NOT NULL,
    "ApplicableTo" VARCHAR(50) NOT NULL,
    "Description" TEXT,
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDateTime" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDateTime" TIMESTAMPTZ(6),
    "IsDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AmenityFacilityCategoryMaster_pkey" PRIMARY KEY ("AmenityFacilityCategoryID"),
    CONSTRAINT "AmenityFacilityCategoryMaster_ApplicableTo_check" CHECK ("ApplicableTo" IN ('PROPERTY', 'ROOM', 'BOTH'))
);

CREATE UNIQUE INDEX "AmenityFacilityCategoryMaster_CategoryCode_key" ON "AmenityFacilityCategoryMaster"("CategoryCode");
