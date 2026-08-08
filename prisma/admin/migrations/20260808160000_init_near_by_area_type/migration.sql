-- Near By Area Type master — categorizes nearby points of interest shown on a property's listing.
CREATE TABLE "NearByAreaTypeMaster" (
    "NearByAreaTypeID" BIGSERIAL NOT NULL,
    "NearByAreaTypeCode" VARCHAR(50) NOT NULL,
    "NearByAreaTypeName" VARCHAR(200) NOT NULL,
    "Description" TEXT,
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDateTime" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDateTime" TIMESTAMPTZ(6),
    "IsDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "NearByAreaTypeMaster_pkey" PRIMARY KEY ("NearByAreaTypeID")
);

CREATE UNIQUE INDEX "NearByAreaTypeMaster_NearByAreaTypeCode_key" ON "NearByAreaTypeMaster"("NearByAreaTypeCode");
