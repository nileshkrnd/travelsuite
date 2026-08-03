-- CreateTable
CREATE TABLE "Property" (
    "PropertyID" SERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "PropertyCode" VARCHAR(50) NOT NULL,
    "PropertyTypeID" INTEGER NOT NULL,
    "PropertyCategoryID" INTEGER,
    "PropertyUsageID" INTEGER,
    "OwnershipTypeID" INTEGER,
    "PropertyBrandID" INTEGER,
    "SupplierID" INTEGER,
    "OpeningDate" DATE,
    "ClosingDate" DATE,
    "Rating" DECIMAL(3,2),
    "StarRating" SMALLINT,
    "IsFeatured" BOOLEAN NOT NULL DEFAULT false,
    "IsPublished" BOOLEAN NOT NULL DEFAULT false,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "Property_pkey" PRIMARY KEY ("PropertyID")
);

CREATE INDEX "Property_TenantID_CompanyID_idx" ON "Property"("TenantID", "CompanyID");
CREATE INDEX "Property_PropertyTypeID_idx" ON "Property"("PropertyTypeID");
CREATE INDEX "Property_PropertyCategoryID_idx" ON "Property"("PropertyCategoryID");
CREATE INDEX "Property_PropertyUsageID_idx" ON "Property"("PropertyUsageID");
CREATE INDEX "Property_OwnershipTypeID_idx" ON "Property"("OwnershipTypeID");
CREATE INDEX "Property_PropertyBrandID_idx" ON "Property"("PropertyBrandID");
CREATE UNIQUE INDEX "Property_Tenant_Company_Code_key" ON "Property"("TenantID", "CompanyID", "PropertyCode");

ALTER TABLE "Property" ADD CONSTRAINT "Property_PropertyTypeID_fkey" FOREIGN KEY ("PropertyTypeID") REFERENCES "PropertyType"("PropertyTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Property" ADD CONSTRAINT "Property_PropertyCategoryID_fkey" FOREIGN KEY ("PropertyCategoryID") REFERENCES "PropertyCategory"("PropertyCategoryID") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Property" ADD CONSTRAINT "Property_PropertyUsageID_fkey" FOREIGN KEY ("PropertyUsageID") REFERENCES "PropertyUsage"("PropertyUsageID") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Property" ADD CONSTRAINT "Property_OwnershipTypeID_fkey" FOREIGN KEY ("OwnershipTypeID") REFERENCES "OwnershipType"("OwnershipTypeID") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Property" ADD CONSTRAINT "Property_PropertyBrandID_fkey" FOREIGN KEY ("PropertyBrandID") REFERENCES "PropertyBrand"("PropertyBrandID") ON DELETE SET NULL ON UPDATE CASCADE;
