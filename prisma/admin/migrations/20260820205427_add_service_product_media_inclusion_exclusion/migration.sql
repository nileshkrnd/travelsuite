-- CreateTable
CREATE TABLE "ServiceProductMedia" (
    "ServiceProductMediaID" BIGSERIAL NOT NULL,
    "ServiceProductID" BIGINT NOT NULL,
    "MediaTypeID" BIGINT NOT NULL,
    "MediaCategoryID" BIGINT NOT NULL,
    "MediaURL" VARCHAR(1000) NOT NULL,
    "ThumbnailURL" VARCHAR(1000),
    "MediaTitle" VARCHAR(250),
    "MediaDescription" VARCHAR(1000),
    "AltText" VARCHAR(500),
    "FileName" VARCHAR(250),
    "FileExtension" VARCHAR(20),
    "MimeType" VARCHAR(100),
    "FileSize" BIGINT,
    "Width" INTEGER,
    "Height" INTEGER,
    "DurationSeconds" INTEGER,
    "IsPrimary" BOOLEAN NOT NULL DEFAULT false,
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "CommonStatusID" BIGINT NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "ServiceProductMedia_pkey" PRIMARY KEY ("ServiceProductMediaID")
);

-- CreateTable
CREATE TABLE "InclusionExclusionType" (
    "InclusionExclusionTypeID" BIGSERIAL NOT NULL,
    "TypeCode" VARCHAR(50) NOT NULL,
    "TypeName" VARCHAR(100) NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "InclusionExclusionType_pkey" PRIMARY KEY ("InclusionExclusionTypeID")
);

-- CreateTable
CREATE TABLE "ServiceProductItemType" (
    "ServiceProductItemTypeID" BIGSERIAL NOT NULL,
    "ItemTypeCode" VARCHAR(50) NOT NULL,
    "ItemTypeName" VARCHAR(100) NOT NULL,
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "ServiceProductItemType_pkey" PRIMARY KEY ("ServiceProductItemTypeID")
);

-- CreateTable
CREATE TABLE "ServiceProductInclusionExclusion" (
    "ServiceProductInclusionExclusionID" BIGSERIAL NOT NULL,
    "ServiceProductID" BIGINT NOT NULL,
    "InclusionExclusionTypeID" BIGINT NOT NULL,
    "ItemTypeID" BIGINT,
    "ItemName" VARCHAR(250) NOT NULL,
    "Description" VARCHAR(1000),
    "Quantity" DECIMAL(10,2),
    "UnitID" BIGINT,
    "IsMandatory" BOOLEAN NOT NULL DEFAULT false,
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "CommonStatusID" BIGINT NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "ServiceProductInclusionExclusion_pkey" PRIMARY KEY ("ServiceProductInclusionExclusionID")
);

-- CreateIndex
CREATE INDEX "SvcProductMedia_ProductID_idx" ON "ServiceProductMedia"("ServiceProductID");

-- CreateIndex
CREATE INDEX "SvcProductMedia_MediaTypeID_idx" ON "ServiceProductMedia"("MediaTypeID");

-- CreateIndex
CREATE INDEX "SvcProductMedia_MediaCategoryID_idx" ON "ServiceProductMedia"("MediaCategoryID");

-- CreateIndex
CREATE INDEX "SvcProductMedia_CommonStatusID_idx" ON "ServiceProductMedia"("CommonStatusID");

-- CreateIndex
CREATE UNIQUE INDEX "InclusionExclusionType_TypeCode_key" ON "InclusionExclusionType"("TypeCode");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceProductItemType_ItemTypeCode_key" ON "ServiceProductItemType"("ItemTypeCode");

-- CreateIndex
CREATE INDEX "SvcProductInclExcl_ProductID_idx" ON "ServiceProductInclusionExclusion"("ServiceProductID");

-- CreateIndex
CREATE INDEX "SvcProductInclExcl_TypeID_idx" ON "ServiceProductInclusionExclusion"("InclusionExclusionTypeID");

-- CreateIndex
CREATE INDEX "SvcProductInclExcl_ItemTypeID_idx" ON "ServiceProductInclusionExclusion"("ItemTypeID");

-- CreateIndex
CREATE INDEX "SvcProductInclExcl_UnitID_idx" ON "ServiceProductInclusionExclusion"("UnitID");

-- CreateIndex
CREATE INDEX "SvcProductInclExcl_CommonStatusID_idx" ON "ServiceProductInclusionExclusion"("CommonStatusID");

-- AddForeignKey
ALTER TABLE "ServiceProductMedia" ADD CONSTRAINT "ServiceProductMedia_ServiceProductID_fkey" FOREIGN KEY ("ServiceProductID") REFERENCES "ServiceProduct"("ServiceProductID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductMedia" ADD CONSTRAINT "ServiceProductMedia_MediaTypeID_fkey" FOREIGN KEY ("MediaTypeID") REFERENCES "MediaType"("MediaTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductMedia" ADD CONSTRAINT "ServiceProductMedia_MediaCategoryID_fkey" FOREIGN KEY ("MediaCategoryID") REFERENCES "MediaCategory"("MediaCategoryID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductMedia" ADD CONSTRAINT "ServiceProductMedia_CommonStatusID_fkey" FOREIGN KEY ("CommonStatusID") REFERENCES "CommonStatus"("CommonStatusID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductInclusionExclusion" ADD CONSTRAINT "ServiceProductInclusionExclusion_ServiceProductID_fkey" FOREIGN KEY ("ServiceProductID") REFERENCES "ServiceProduct"("ServiceProductID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductInclusionExclusion" ADD CONSTRAINT "ServiceProductInclusionExclusion_InclusionExclusionTypeID_fkey" FOREIGN KEY ("InclusionExclusionTypeID") REFERENCES "InclusionExclusionType"("InclusionExclusionTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductInclusionExclusion" ADD CONSTRAINT "ServiceProductInclusionExclusion_ItemTypeID_fkey" FOREIGN KEY ("ItemTypeID") REFERENCES "ServiceProductItemType"("ServiceProductItemTypeID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductInclusionExclusion" ADD CONSTRAINT "ServiceProductInclusionExclusion_UnitID_fkey" FOREIGN KEY ("UnitID") REFERENCES "ServiceProductItemType"("ServiceProductItemTypeID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductInclusionExclusion" ADD CONSTRAINT "ServiceProductInclusionExclusion_CommonStatusID_fkey" FOREIGN KEY ("CommonStatusID") REFERENCES "CommonStatus"("CommonStatusID") ON DELETE RESTRICT ON UPDATE CASCADE;
