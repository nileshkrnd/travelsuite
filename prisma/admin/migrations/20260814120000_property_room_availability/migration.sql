-- PropertyRoomAvailability — daily inventory per property room type (ARI availability).

CREATE TABLE "PropertyRoomAvailability" (
    "PropertyRoomAvailabilityID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "PropertyID" INTEGER NOT NULL,
    "PropertyRoomTypeID" BIGINT NOT NULL,
    "AvailabilityDate" DATE NOT NULL,
    "AvailableUnits" INTEGER NOT NULL DEFAULT 0,
    "StopSell" BOOLEAN NOT NULL DEFAULT false,
    "MinLengthOfStay" INTEGER,
    "MaxLengthOfStay" INTEGER,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "PropertyRoomAvailability_pkey" PRIMARY KEY ("PropertyRoomAvailabilityID")
);

CREATE UNIQUE INDEX "PropertyRoomAvailability_Room_Date_key"
    ON "PropertyRoomAvailability"("TenantID", "PropertyRoomTypeID", "AvailabilityDate");

CREATE INDEX "PropertyRoomAvailability_TenantID_CompanyID_idx"
    ON "PropertyRoomAvailability"("TenantID", "CompanyID");

CREATE INDEX "PropertyRoomAvailability_Property_Date_idx"
    ON "PropertyRoomAvailability"("PropertyID", "AvailabilityDate");

CREATE INDEX "PropertyRoomAvailability_PropertyRoomTypeID_idx"
    ON "PropertyRoomAvailability"("PropertyRoomTypeID");

ALTER TABLE "PropertyRoomAvailability"
    ADD CONSTRAINT "PropertyRoomAvailability_PropertyID_fkey"
    FOREIGN KEY ("PropertyID") REFERENCES "Property"("PropertyID") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PropertyRoomAvailability"
    ADD CONSTRAINT "PropertyRoomAvailability_PropertyRoomTypeID_fkey"
    FOREIGN KEY ("PropertyRoomTypeID") REFERENCES "PropertyRoom"("PropertyRoomID") ON DELETE CASCADE ON UPDATE CASCADE;
