-- Property media (photos/videos) — attached to a Property, one may be marked the cover image.
CREATE TABLE "PropertyMediaMaster" (
    "PropertyMediaID" BIGSERIAL NOT NULL,
    "PropertyID" INTEGER NOT NULL,
    "MediaType" VARCHAR(20) NOT NULL,
    "ImageType" VARCHAR(50) NOT NULL,
    "MediaUrl" VARCHAR(500) NOT NULL,
    "FileName" VARCHAR(255),
    "Description" TEXT,
    "IsCover" BOOLEAN NOT NULL DEFAULT false,
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDateTime" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDateTime" TIMESTAMPTZ(6),
    "IsDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PropertyMediaMaster_pkey" PRIMARY KEY ("PropertyMediaID")
);

CREATE INDEX "PropertyMedia_PropertyID_idx" ON "PropertyMediaMaster"("PropertyID");

ALTER TABLE "PropertyMediaMaster" ADD CONSTRAINT "PropertyMediaMaster_PropertyID_fkey"
  FOREIGN KEY ("PropertyID") REFERENCES "Property"("PropertyID") ON DELETE CASCADE ON UPDATE CASCADE;

-- At most one active cover image/video per property.
CREATE UNIQUE INDEX "PropertyMediaMaster_OneCover_key" ON "PropertyMediaMaster"("PropertyID")
  WHERE "IsCover" = true AND "IsDeleted" = false;
