-- CreateTable
CREATE TABLE "PropertyRoomTypeBed" (
    "PropertyRoomTypeBedID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "PropertyRoomTypeID" BIGINT NOT NULL,
    "BedTypeID" BIGINT NOT NULL,
    "BedCount" INTEGER NOT NULL DEFAULT 1,
    "IsExtraBed" BOOLEAN NOT NULL DEFAULT false,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "PropertyRoomTypeBed_pkey" PRIMARY KEY ("PropertyRoomTypeBedID")
);

-- CreateTable
CREATE TABLE "PropertyRoomTypeView" (
    "PropertyRoomTypeViewID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "PropertyRoomTypeID" BIGINT NOT NULL,
    "ViewTypeID" BIGINT NOT NULL,
    "IsPrimary" BOOLEAN NOT NULL DEFAULT false,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "PropertyRoomTypeView_pkey" PRIMARY KEY ("PropertyRoomTypeViewID")
);

-- CreateTable
CREATE TABLE "PropertyRoomTypeExtraBed" (
    "PropertyRoomTypeExtraBedID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "PropertyRoomTypeID" BIGINT NOT NULL,
    "ExtraBedTypeID" BIGINT NOT NULL,
    "MaxQuantity" INTEGER NOT NULL DEFAULT 1,
    "AdultAllowed" BOOLEAN NOT NULL DEFAULT true,
    "ChildAllowed" BOOLEAN NOT NULL DEFAULT true,
    "IsComplimentary" BOOLEAN NOT NULL DEFAULT false,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "PropertyRoomTypeExtraBed_pkey" PRIMARY KEY ("PropertyRoomTypeExtraBedID")
);

-- CreateIndex
CREATE INDEX "PropertyRoomTypeBed_TenantID_CompanyID_idx" ON "PropertyRoomTypeBed"("TenantID", "CompanyID");

-- CreateIndex
CREATE INDEX "PropertyRoomTypeBed_PropertyRoomTypeID_idx" ON "PropertyRoomTypeBed"("PropertyRoomTypeID");

-- CreateIndex
CREATE INDEX "PropertyRoomTypeBed_BedTypeID_idx" ON "PropertyRoomTypeBed"("BedTypeID");

-- CreateIndex
CREATE INDEX "PropertyRoomTypeView_TenantID_CompanyID_idx" ON "PropertyRoomTypeView"("TenantID", "CompanyID");

-- CreateIndex
CREATE INDEX "PropertyRoomTypeView_PropertyRoomTypeID_idx" ON "PropertyRoomTypeView"("PropertyRoomTypeID");

-- CreateIndex
CREATE INDEX "PropertyRoomTypeView_ViewTypeID_idx" ON "PropertyRoomTypeView"("ViewTypeID");

-- CreateIndex
CREATE INDEX "PropertyRoomTypeExtraBed_TenantID_CompanyID_idx" ON "PropertyRoomTypeExtraBed"("TenantID", "CompanyID");

-- CreateIndex
CREATE INDEX "PropertyRoomTypeExtraBed_PropertyRoomTypeID_idx" ON "PropertyRoomTypeExtraBed"("PropertyRoomTypeID");

-- CreateIndex
CREATE INDEX "PropertyRoomTypeExtraBed_ExtraBedTypeID_idx" ON "PropertyRoomTypeExtraBed"("ExtraBedTypeID");

-- AddForeignKey
ALTER TABLE "PropertyRoomTypeBed" ADD CONSTRAINT "PropertyRoomTypeBed_PropertyRoomTypeID_fkey" FOREIGN KEY ("PropertyRoomTypeID") REFERENCES "PropertyRoom"("PropertyRoomID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyRoomTypeBed" ADD CONSTRAINT "PropertyRoomTypeBed_BedTypeID_fkey" FOREIGN KEY ("BedTypeID") REFERENCES "BedTypeMaster"("BedTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyRoomTypeView" ADD CONSTRAINT "PropertyRoomTypeView_PropertyRoomTypeID_fkey" FOREIGN KEY ("PropertyRoomTypeID") REFERENCES "PropertyRoom"("PropertyRoomID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyRoomTypeView" ADD CONSTRAINT "PropertyRoomTypeView_ViewTypeID_fkey" FOREIGN KEY ("ViewTypeID") REFERENCES "ViewTypeMaster"("ViewTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyRoomTypeExtraBed" ADD CONSTRAINT "PropertyRoomTypeExtraBed_PropertyRoomTypeID_fkey" FOREIGN KEY ("PropertyRoomTypeID") REFERENCES "PropertyRoom"("PropertyRoomID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyRoomTypeExtraBed" ADD CONSTRAINT "PropertyRoomTypeExtraBed_ExtraBedTypeID_fkey" FOREIGN KEY ("ExtraBedTypeID") REFERENCES "BedTypeMaster"("BedTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;
