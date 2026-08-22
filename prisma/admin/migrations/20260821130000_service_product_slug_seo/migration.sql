-- AlterTable
ALTER TABLE "ServiceProduct" ADD COLUMN "Slug" VARCHAR(250);

-- CreateTable
CREATE TABLE "ServiceProductSeo" (
    "ServiceProductSeoID" BIGSERIAL NOT NULL,
    "ServiceProductID" BIGINT NOT NULL,
    "MetaTitle" VARCHAR(70),
    "MetaDescription" VARCHAR(320),
    "MetaKeywords" VARCHAR(500),
    "FocusKeyword" VARCHAR(150),
    "CanonicalUrl" VARCHAR(500),
    "OgTitle" VARCHAR(70),
    "OgDescription" VARCHAR(320),
    "OgImageUrl" VARCHAR(500),
    "IsIndexable" BOOLEAN NOT NULL DEFAULT true,
    "IsFollowable" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "ServiceProductSeo_pkey" PRIMARY KEY ("ServiceProductSeoID")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceProductSeo_ServiceProductID_key" ON "ServiceProductSeo"("ServiceProductID");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceProduct_Tenant_Company_Slug_key" ON "ServiceProduct"("TenantID", "CompanyID", "Slug");

-- AddForeignKey
ALTER TABLE "ServiceProductSeo" ADD CONSTRAINT "ServiceProductSeo_ServiceProductID_fkey" FOREIGN KEY ("ServiceProductID") REFERENCES "ServiceProduct"("ServiceProductID") ON DELETE CASCADE ON UPDATE CASCADE;
