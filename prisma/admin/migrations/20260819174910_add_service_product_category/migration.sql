-- CreateTable
CREATE TABLE "ServiceProductCategory" (
    "ServiceProductCategoryID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "ServiceTypeID" BIGINT NOT NULL,
    "ServiceProductClassificationID" BIGINT,
    "ParentServiceProductCategoryID" BIGINT,
    "CategoryCode" VARCHAR(50) NOT NULL,
    "CategoryName" VARCHAR(150) NOT NULL,
    "Description" VARCHAR(500),
    "Icon" VARCHAR(200),
    "ImageURL" VARCHAR(500),
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsFeatured" BOOLEAN NOT NULL DEFAULT false,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "ServiceProductCategory_pkey" PRIMARY KEY ("ServiceProductCategoryID")
);

-- CreateIndex
CREATE INDEX "ServiceProductCategory_TenantID_CompanyID_idx" ON "ServiceProductCategory"("TenantID", "CompanyID");

-- CreateIndex
CREATE INDEX "ServiceProductCategory_ServiceTypeID_idx" ON "ServiceProductCategory"("ServiceTypeID");

-- CreateIndex
CREATE INDEX "ServiceProductCategory_ClassificationID_idx" ON "ServiceProductCategory"("ServiceProductClassificationID");

-- CreateIndex
CREATE INDEX "ServiceProductCategory_ParentCategoryID_idx" ON "ServiceProductCategory"("ParentServiceProductCategoryID");

-- CreateIndex
CREATE UNIQUE INDEX "SvcProductCategory_Tenant_Company_Type_Code_key" ON "ServiceProductCategory"("TenantID", "CompanyID", "ServiceTypeID", "CategoryCode");

-- AddForeignKey
ALTER TABLE "ServiceProductCategory" ADD CONSTRAINT "ServiceProductCategory_ServiceTypeID_fkey" FOREIGN KEY ("ServiceTypeID") REFERENCES "ServiceTypeMaster"("ServiceTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductCategory" ADD CONSTRAINT "ServiceProductCategory_ServiceProductClassificationID_fkey" FOREIGN KEY ("ServiceProductClassificationID") REFERENCES "ServiceProductClassificationMaster"("ServiceProductClassificationID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductCategory" ADD CONSTRAINT "ServiceProductCategory_ParentServiceProductCategoryID_fkey" FOREIGN KEY ("ParentServiceProductCategoryID") REFERENCES "ServiceProductCategory"("ServiceProductCategoryID") ON DELETE RESTRICT ON UPDATE RESTRICT;
