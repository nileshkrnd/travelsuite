-- Room Category master — Standard, Superior, Deluxe, Executive, Suite, Villa, …
CREATE TABLE "RoomCategoryMaster" (
    "RoomCategoryID" BIGSERIAL NOT NULL,
    "RoomCategoryCode" VARCHAR(50) NOT NULL,
    "RoomCategoryName" VARCHAR(200) NOT NULL,
    "Description" TEXT,
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDateTime" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDateTime" TIMESTAMPTZ(6),
    "IsDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "RoomCategoryMaster_pkey" PRIMARY KEY ("RoomCategoryID")
);

CREATE UNIQUE INDEX "RoomCategoryMaster_RoomCategoryCode_key" ON "RoomCategoryMaster"("RoomCategoryCode");

-- Room Type master — individual room types, grouped under a Room Category.
CREATE TABLE "RoomTypeMaster" (
    "RoomTypeID" BIGSERIAL NOT NULL,
    "RoomCategoryID" BIGINT NOT NULL,
    "RoomTypeCode" VARCHAR(50) NOT NULL,
    "RoomTypeName" VARCHAR(200) NOT NULL,
    "Description" TEXT,
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDateTime" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDateTime" TIMESTAMPTZ(6),
    "IsDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "RoomTypeMaster_pkey" PRIMARY KEY ("RoomTypeID")
);

CREATE UNIQUE INDEX "RoomTypeMaster_RoomTypeCode_key" ON "RoomTypeMaster"("RoomTypeCode");
CREATE INDEX "RoomType_RoomCategoryID_idx" ON "RoomTypeMaster"("RoomCategoryID");

ALTER TABLE "RoomTypeMaster" ADD CONSTRAINT "RoomTypeMaster_RoomCategoryID_fkey"
  FOREIGN KEY ("RoomCategoryID") REFERENCES "RoomCategoryMaster"("RoomCategoryID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Bed Type master — Single, Twin, Double, Queen, King, Sofa Bed, …
CREATE TABLE "BedTypeMaster" (
    "BedTypeID" BIGSERIAL NOT NULL,
    "BedTypeCode" VARCHAR(50) NOT NULL,
    "BedTypeName" VARCHAR(200) NOT NULL,
    "BedSize" VARCHAR(50),
    "Description" TEXT,
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDateTime" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDateTime" TIMESTAMPTZ(6),
    "IsDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BedTypeMaster_pkey" PRIMARY KEY ("BedTypeID")
);

CREATE UNIQUE INDEX "BedTypeMaster_BedTypeCode_key" ON "BedTypeMaster"("BedTypeCode");

-- Smoking Type master — Non Smoking, Smoking Allowed, Balcony Smoking, …
CREATE TABLE "SmokingTypeMaster" (
    "SmokingTypeID" BIGSERIAL NOT NULL,
    "SmokingTypeCode" VARCHAR(50) NOT NULL,
    "SmokingTypeName" VARCHAR(200) NOT NULL,
    "Description" TEXT,
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDateTime" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDateTime" TIMESTAMPTZ(6),
    "IsDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SmokingTypeMaster_pkey" PRIMARY KEY ("SmokingTypeID")
);

CREATE UNIQUE INDEX "SmokingTypeMaster_SmokingTypeCode_key" ON "SmokingTypeMaster"("SmokingTypeCode");

-- View Type master — City, Sea, Pool, Garden, Beach, Mountain, Desert, Landmark View, …
CREATE TABLE "ViewTypeMaster" (
    "ViewTypeID" BIGSERIAL NOT NULL,
    "ViewTypeCode" VARCHAR(50) NOT NULL,
    "ViewTypeName" VARCHAR(200) NOT NULL,
    "Description" TEXT,
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDateTime" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDateTime" TIMESTAMPTZ(6),
    "IsDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ViewTypeMaster_pkey" PRIMARY KEY ("ViewTypeID")
);

CREATE UNIQUE INDEX "ViewTypeMaster_ViewTypeCode_key" ON "ViewTypeMaster"("ViewTypeCode");
