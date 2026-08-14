-- CreateTable
CREATE TABLE "RoomSizeUnitMaster" (
    "RoomSizeUnitID" BIGSERIAL NOT NULL,
    "RoomSizeUnitCode" VARCHAR(50) NOT NULL,
    "RoomSizeUnitName" VARCHAR(200) NOT NULL,
    "Description" TEXT,
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDateTime" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDateTime" TIMESTAMPTZ(6),
    "IsDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "RoomSizeUnitMaster_pkey" PRIMARY KEY ("RoomSizeUnitID")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoomSizeUnitMaster_RoomSizeUnitCode_key" ON "RoomSizeUnitMaster"("RoomSizeUnitCode");

-- Seed SQM / SQFT
INSERT INTO "RoomSizeUnitMaster" ("RoomSizeUnitCode", "RoomSizeUnitName", "DisplayOrder", "IsActive", "CreatedBy", "IsDeleted")
VALUES
  ('SQM', 'Square Meter', 1, true, 1, false),
  ('SQFT', 'Square Feet', 2, true, 1, false);

-- AlterTable
ALTER TABLE "PropertyRoom"
  ADD COLUMN "Description" TEXT,
  ADD COLUMN "RoomSize" DECIMAL(10,2),
  ADD COLUMN "RoomSizeUnitID" BIGINT,
  ADD COLUMN "SmokingTypeID" BIGINT,
  ADD COLUMN "ViewTypeID" BIGINT,
  ADD COLUMN "ExtraBedAllowed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "MaxExtraBed" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "DisplayOrder" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "PropertyRoom_RoomSizeUnitID_idx" ON "PropertyRoom"("RoomSizeUnitID");

-- CreateIndex
CREATE INDEX "PropertyRoom_SmokingTypeID_idx" ON "PropertyRoom"("SmokingTypeID");

-- CreateIndex
CREATE INDEX "PropertyRoom_ViewTypeID_idx" ON "PropertyRoom"("ViewTypeID");

-- AddForeignKey
ALTER TABLE "PropertyRoom" ADD CONSTRAINT "PropertyRoom_RoomSizeUnitID_fkey" FOREIGN KEY ("RoomSizeUnitID") REFERENCES "RoomSizeUnitMaster"("RoomSizeUnitID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyRoom" ADD CONSTRAINT "PropertyRoom_SmokingTypeID_fkey" FOREIGN KEY ("SmokingTypeID") REFERENCES "SmokingTypeMaster"("SmokingTypeID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyRoom" ADD CONSTRAINT "PropertyRoom_ViewTypeID_fkey" FOREIGN KEY ("ViewTypeID") REFERENCES "ViewTypeMaster"("ViewTypeID") ON DELETE SET NULL ON UPDATE CASCADE;
