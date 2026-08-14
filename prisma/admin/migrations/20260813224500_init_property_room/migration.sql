-- CreateTable
CREATE TABLE "PropertyRoom" (
    "PropertyRoomID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "RoomTypeID" BIGINT NOT NULL,
    "RoomCode" VARCHAR(50) NOT NULL,
    "RoomName" VARCHAR(200) NOT NULL,
    "MaxAdult" INTEGER NOT NULL DEFAULT 0,
    "MaxChild" INTEGER NOT NULL DEFAULT 0,
    "MaxOccupancy" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "PropertyRoom_pkey" PRIMARY KEY ("PropertyRoomID")
);

-- CreateIndex
CREATE INDEX "PropertyRoom_TenantID_CompanyID_idx" ON "PropertyRoom"("TenantID", "CompanyID");

-- CreateIndex
CREATE INDEX "PropertyRoom_RoomTypeID_idx" ON "PropertyRoom"("RoomTypeID");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyRoom_Tenant_Code_key" ON "PropertyRoom"("TenantID", "RoomCode");

-- AddForeignKey
ALTER TABLE "PropertyRoom" ADD CONSTRAINT "PropertyRoom_RoomTypeID_fkey" FOREIGN KEY ("RoomTypeID") REFERENCES "RoomTypeMaster"("RoomTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;
