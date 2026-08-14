-- InventoryType lookup + PropertyContractInventory (contract allotment / inventory rules).

CREATE TABLE "InventoryType" (
    "InventoryTypeID" BIGSERIAL NOT NULL,
    "InventoryTypeCode" VARCHAR(50) NOT NULL,
    "InventoryTypeName" VARCHAR(100) NOT NULL,
    "Description" VARCHAR(500),
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL DEFAULT 1,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "InventoryType_pkey" PRIMARY KEY ("InventoryTypeID")
);

CREATE UNIQUE INDEX "InventoryType_InventoryTypeCode_key" ON "InventoryType"("InventoryTypeCode");

INSERT INTO "InventoryType" ("InventoryTypeCode", "InventoryTypeName", "Description", "DisplayOrder", "CreatedBy")
VALUES
    ('ALLOTMENT', 'Allotment', 'Fixed contracted room allotment', 1, 1),
    ('FREE_SALE', 'Free Sale', 'Sell until property capacity', 2, 1),
    ('ON_REQUEST', 'On Request', 'Availability confirmed on request', 3, 1);

CREATE TABLE "PropertyContractInventory" (
    "PropertyContractInventoryID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "PropertyContractID" BIGINT NOT NULL,
    "PropertyContractSeasonPeriodID" BIGINT NOT NULL,
    "PropertyRoomTypeID" BIGINT NOT NULL,
    "InventoryTypeID" BIGINT NOT NULL,
    "AllotmentQty" INTEGER NOT NULL DEFAULT 0,
    "ReleaseDays" INTEGER NOT NULL DEFAULT 0,
    "IsStopSell" BOOLEAN NOT NULL DEFAULT false,
    "IsClosed" BOOLEAN NOT NULL DEFAULT false,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "PropertyContractInventory_pkey" PRIMARY KEY ("PropertyContractInventoryID")
);

CREATE UNIQUE INDEX "PropertyContractInventory_Unique_key"
    ON "PropertyContractInventory"("TenantID", "PropertyContractID", "PropertyContractSeasonPeriodID", "PropertyRoomTypeID");

CREATE INDEX "PropertyContractInventory_TenantID_CompanyID_idx"
    ON "PropertyContractInventory"("TenantID", "CompanyID");

CREATE INDEX "PropertyContractInventory_PropertyContractID_idx"
    ON "PropertyContractInventory"("PropertyContractID");

CREATE INDEX "PropertyContractInventory_SeasonPeriodID_idx"
    ON "PropertyContractInventory"("PropertyContractSeasonPeriodID");

CREATE INDEX "PropertyContractInventory_PropertyRoomTypeID_idx"
    ON "PropertyContractInventory"("PropertyRoomTypeID");

CREATE INDEX "PropertyContractInventory_InventoryTypeID_idx"
    ON "PropertyContractInventory"("InventoryTypeID");

ALTER TABLE "PropertyContractInventory"
    ADD CONSTRAINT "PropertyContractInventory_PropertyContractID_fkey"
    FOREIGN KEY ("PropertyContractID") REFERENCES "PropertyContract"("PropertyContractID") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PropertyContractInventory"
    ADD CONSTRAINT "PropertyContractInventory_PropertyContractSeasonPeriodID_fkey"
    FOREIGN KEY ("PropertyContractSeasonPeriodID") REFERENCES "PropertyContractSeasonPeriod"("PropertyContractSeasonPeriodID") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PropertyContractInventory"
    ADD CONSTRAINT "PropertyContractInventory_PropertyRoomTypeID_fkey"
    FOREIGN KEY ("PropertyRoomTypeID") REFERENCES "PropertyRoom"("PropertyRoomID") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PropertyContractInventory"
    ADD CONSTRAINT "PropertyContractInventory_InventoryTypeID_fkey"
    FOREIGN KEY ("InventoryTypeID") REFERENCES "InventoryType"("InventoryTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;
