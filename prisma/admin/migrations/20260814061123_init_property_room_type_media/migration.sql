-- CreateTable
CREATE TABLE "MediaType" (
    "MediaTypeID" BIGSERIAL NOT NULL,
    "MediaTypeName" VARCHAR(100) NOT NULL,
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "MediaType_pkey" PRIMARY KEY ("MediaTypeID")
);

-- CreateTable
CREATE TABLE "MediaCategory" (
    "MediaCategoryID" BIGSERIAL NOT NULL,
    "MediaCategoryName" VARCHAR(100) NOT NULL,
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "MediaCategory_pkey" PRIMARY KEY ("MediaCategoryID")
);

-- CreateTable
CREATE TABLE "PropertyRoomTypeMedia" (
    "PropertyRoomTypeMediaID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "PropertyID" INTEGER NOT NULL,
    "PropertyRoomTypeID" BIGINT NOT NULL,
    "MediaTypeID" BIGINT NOT NULL,
    "MediaCategoryID" BIGINT NOT NULL,
    "MediaURL" VARCHAR(1000) NOT NULL,
    "ThumbnailURL" VARCHAR(1000),
    "FileName" VARCHAR(255),
    "FileType" VARCHAR(50),
    "AltText" VARCHAR(500),
    "Caption" VARCHAR(500),
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsPrimary" BOOLEAN NOT NULL DEFAULT false,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "PropertyRoomTypeMedia_pkey" PRIMARY KEY ("PropertyRoomTypeMediaID")
);

-- CreateIndex
CREATE UNIQUE INDEX "MediaType_MediaTypeName_key" ON "MediaType"("MediaTypeName");

-- CreateIndex
CREATE UNIQUE INDEX "MediaCategory_MediaCategoryName_key" ON "MediaCategory"("MediaCategoryName");

-- CreateIndex
CREATE INDEX "PropertyRoomTypeMedia_TenantID_CompanyID_idx" ON "PropertyRoomTypeMedia"("TenantID", "CompanyID");

-- CreateIndex
CREATE INDEX "PropertyRoomTypeMedia_PropertyID_idx" ON "PropertyRoomTypeMedia"("PropertyID");

-- CreateIndex
CREATE INDEX "PropertyRoomTypeMedia_PropertyRoomTypeID_idx" ON "PropertyRoomTypeMedia"("PropertyRoomTypeID");

-- CreateIndex
CREATE INDEX "PropertyRoomTypeMedia_MediaTypeID_idx" ON "PropertyRoomTypeMedia"("MediaTypeID");

-- CreateIndex
CREATE INDEX "PropertyRoomTypeMedia_MediaCategoryID_idx" ON "PropertyRoomTypeMedia"("MediaCategoryID");

-- AddForeignKey
ALTER TABLE "PropertyRoomTypeMedia" ADD CONSTRAINT "PropertyRoomTypeMedia_PropertyID_fkey" FOREIGN KEY ("PropertyID") REFERENCES "Property"("PropertyID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyRoomTypeMedia" ADD CONSTRAINT "PropertyRoomTypeMedia_PropertyRoomTypeID_fkey" FOREIGN KEY ("PropertyRoomTypeID") REFERENCES "PropertyRoom"("PropertyRoomID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyRoomTypeMedia" ADD CONSTRAINT "PropertyRoomTypeMedia_MediaTypeID_fkey" FOREIGN KEY ("MediaTypeID") REFERENCES "MediaType"("MediaTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyRoomTypeMedia" ADD CONSTRAINT "PropertyRoomTypeMedia_MediaCategoryID_fkey" FOREIGN KEY ("MediaCategoryID") REFERENCES "MediaCategory"("MediaCategoryID") ON DELETE RESTRICT ON UPDATE CASCADE;
