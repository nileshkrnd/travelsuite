-- Floor type lookup
CREATE TABLE "FloorTypeMaster" (
    "FloorTypeID" BIGSERIAL NOT NULL,
    "FloorTypeCode" VARCHAR(50) NOT NULL,
    "FloorTypeName" VARCHAR(100) NOT NULL,
    "Description" VARCHAR(250),
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDate" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy" INTEGER,
    "UpdatedDate" TIMESTAMPTZ(6),

    CONSTRAINT "FloorTypeMaster_pkey" PRIMARY KEY ("FloorTypeID")
);

CREATE UNIQUE INDEX "FloorTypeMaster_FloorTypeCode_key" ON "FloorTypeMaster"("FloorTypeCode");

-- Property floor register
CREATE TABLE "PropertyFloorMaster" (
    "PropertyFloorID" BIGSERIAL NOT NULL,
    "PropertyID" INTEGER NOT NULL,
    "FloorCode" VARCHAR(50) NOT NULL,
    "FloorNumber" INTEGER NOT NULL,
    "FloorName" VARCHAR(100) NOT NULL,
    "FloorTypeID" BIGINT NOT NULL,
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "TotalUnits" INTEGER,
    "OccupiedUnits" INTEGER,
    "AvailableUnits" INTEGER,
    "FloorArea" DECIMAL(18,4),
    "AreaUnitID" BIGINT,
    "Description" VARCHAR(500),
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDate" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy" INTEGER,
    "UpdatedDate" TIMESTAMPTZ(6),

    CONSTRAINT "PropertyFloorMaster_pkey" PRIMARY KEY ("PropertyFloorID")
);

CREATE UNIQUE INDEX "PropertyFloor_Property_Code_key" ON "PropertyFloorMaster"("PropertyID", "FloorCode");
CREATE UNIQUE INDEX "PropertyFloor_Property_Number_key" ON "PropertyFloorMaster"("PropertyID", "FloorNumber");
CREATE INDEX "PropertyFloor_PropertyID_idx" ON "PropertyFloorMaster"("PropertyID");
CREATE INDEX "PropertyFloor_FloorTypeID_idx" ON "PropertyFloorMaster"("FloorTypeID");
CREATE INDEX "PropertyFloor_AreaUnitID_idx" ON "PropertyFloorMaster"("AreaUnitID");

-- Unit type lookup
CREATE TABLE "UnitTypeMaster" (
    "UnitTypeID" BIGSERIAL NOT NULL,
    "UnitTypeCode" VARCHAR(50) NOT NULL,
    "UnitTypeName" VARCHAR(100) NOT NULL,
    "Description" VARCHAR(250),
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDate" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy" INTEGER,
    "UpdatedDate" TIMESTAMPTZ(6),

    CONSTRAINT "UnitTypeMaster_pkey" PRIMARY KEY ("UnitTypeID")
);

CREATE UNIQUE INDEX "UnitTypeMaster_UnitTypeCode_key" ON "UnitTypeMaster"("UnitTypeCode");

-- Unit category lookup
CREATE TABLE "UnitCategoryMaster" (
    "UnitCategoryID" BIGSERIAL NOT NULL,
    "UnitCategoryCode" VARCHAR(50) NOT NULL,
    "UnitCategoryName" VARCHAR(100) NOT NULL,
    "Description" VARCHAR(250),
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDate" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy" INTEGER,
    "UpdatedDate" TIMESTAMPTZ(6),

    CONSTRAINT "UnitCategoryMaster_pkey" PRIMARY KEY ("UnitCategoryID")
);

CREATE UNIQUE INDEX "UnitCategoryMaster_UnitCategoryCode_key" ON "UnitCategoryMaster"("UnitCategoryCode");

-- Unit status lookup
CREATE TABLE "UnitStatusMaster" (
    "UnitStatusID" BIGSERIAL NOT NULL,
    "StatusCode" VARCHAR(50) NOT NULL,
    "StatusName" VARCHAR(100) NOT NULL,
    "Description" VARCHAR(250),
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDate" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy" INTEGER,
    "UpdatedDate" TIMESTAMPTZ(6),

    CONSTRAINT "UnitStatusMaster_pkey" PRIMARY KEY ("UnitStatusID")
);

CREATE UNIQUE INDEX "UnitStatusMaster_StatusCode_key" ON "UnitStatusMaster"("StatusCode");

-- Furnished status lookup
CREATE TABLE "FurnishedStatusMaster" (
    "FurnishedStatusID" BIGSERIAL NOT NULL,
    "FurnishedStatusCode" VARCHAR(50) NOT NULL,
    "FurnishedStatusName" VARCHAR(100) NOT NULL,
    "Description" VARCHAR(250),
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDate" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy" INTEGER,
    "UpdatedDate" TIMESTAMPTZ(6),

    CONSTRAINT "FurnishedStatusMaster_pkey" PRIMARY KEY ("FurnishedStatusID")
);

CREATE UNIQUE INDEX "FurnishedStatusMaster_FurnishedStatusCode_key" ON "FurnishedStatusMaster"("FurnishedStatusCode");

-- Unit register
CREATE TABLE "UnitMaster" (
    "UnitID" BIGSERIAL NOT NULL,
    "PropertyID" INTEGER NOT NULL,
    "PropertyFloorID" BIGINT NOT NULL,
    "UnitCode" VARCHAR(50) NOT NULL,
    "UnitNumber" VARCHAR(50) NOT NULL,
    "UnitName" VARCHAR(150),
    "UnitTypeID" BIGINT NOT NULL,
    "UnitCategoryID" BIGINT,
    "UnitStatusID" BIGINT NOT NULL,
    "Area" DECIMAL(18,4) NOT NULL,
    "AreaUnitID" BIGINT NOT NULL,
    "BedroomCount" INTEGER,
    "BathroomCount" INTEGER,
    "ParkingCount" INTEGER,
    "BalconyCount" INTEGER,
    "FurnishedStatusID" BIGINT,
    "ViewTypeID" BIGINT,
    "UnitDescription" VARCHAR(1000),
    "IsRentable" BOOLEAN NOT NULL DEFAULT true,
    "IsSaleable" BOOLEAN NOT NULL DEFAULT false,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDate" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy" INTEGER,
    "UpdatedDate" TIMESTAMPTZ(6),

    CONSTRAINT "UnitMaster_pkey" PRIMARY KEY ("UnitID")
);

CREATE UNIQUE INDEX "Unit_Property_Code_key" ON "UnitMaster"("PropertyID", "UnitCode");
CREATE INDEX "Unit_PropertyID_idx" ON "UnitMaster"("PropertyID");
CREATE INDEX "Unit_PropertyFloorID_idx" ON "UnitMaster"("PropertyFloorID");
CREATE INDEX "Unit_UnitTypeID_idx" ON "UnitMaster"("UnitTypeID");
CREATE INDEX "Unit_UnitCategoryID_idx" ON "UnitMaster"("UnitCategoryID");
CREATE INDEX "Unit_UnitStatusID_idx" ON "UnitMaster"("UnitStatusID");
CREATE INDEX "Unit_AreaUnitID_idx" ON "UnitMaster"("AreaUnitID");
CREATE INDEX "Unit_FurnishedStatusID_idx" ON "UnitMaster"("FurnishedStatusID");
CREATE INDEX "Unit_ViewTypeID_idx" ON "UnitMaster"("ViewTypeID");

ALTER TABLE "PropertyFloorMaster" ADD CONSTRAINT "PropertyFloorMaster_PropertyID_fkey"
  FOREIGN KEY ("PropertyID") REFERENCES "Property"("PropertyID") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PropertyFloorMaster" ADD CONSTRAINT "PropertyFloorMaster_FloorTypeID_fkey"
  FOREIGN KEY ("FloorTypeID") REFERENCES "FloorTypeMaster"("FloorTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PropertyFloorMaster" ADD CONSTRAINT "PropertyFloorMaster_AreaUnitID_fkey"
  FOREIGN KEY ("AreaUnitID") REFERENCES "RoomSizeUnitMaster"("RoomSizeUnitID") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "UnitMaster" ADD CONSTRAINT "UnitMaster_PropertyID_fkey"
  FOREIGN KEY ("PropertyID") REFERENCES "Property"("PropertyID") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UnitMaster" ADD CONSTRAINT "UnitMaster_PropertyFloorID_fkey"
  FOREIGN KEY ("PropertyFloorID") REFERENCES "PropertyFloorMaster"("PropertyFloorID") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UnitMaster" ADD CONSTRAINT "UnitMaster_UnitTypeID_fkey"
  FOREIGN KEY ("UnitTypeID") REFERENCES "UnitTypeMaster"("UnitTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UnitMaster" ADD CONSTRAINT "UnitMaster_UnitCategoryID_fkey"
  FOREIGN KEY ("UnitCategoryID") REFERENCES "UnitCategoryMaster"("UnitCategoryID") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "UnitMaster" ADD CONSTRAINT "UnitMaster_UnitStatusID_fkey"
  FOREIGN KEY ("UnitStatusID") REFERENCES "UnitStatusMaster"("UnitStatusID") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UnitMaster" ADD CONSTRAINT "UnitMaster_AreaUnitID_fkey"
  FOREIGN KEY ("AreaUnitID") REFERENCES "RoomSizeUnitMaster"("RoomSizeUnitID") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UnitMaster" ADD CONSTRAINT "UnitMaster_FurnishedStatusID_fkey"
  FOREIGN KEY ("FurnishedStatusID") REFERENCES "FurnishedStatusMaster"("FurnishedStatusID") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "UnitMaster" ADD CONSTRAINT "UnitMaster_ViewTypeID_fkey"
  FOREIGN KEY ("ViewTypeID") REFERENCES "ViewTypeMaster"("ViewTypeID") ON DELETE SET NULL ON UPDATE CASCADE;
