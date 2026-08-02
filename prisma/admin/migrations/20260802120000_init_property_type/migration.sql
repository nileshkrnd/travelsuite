-- CreateTable
CREATE TABLE "PropertyType" (
    "PropertyTypeID" SERIAL NOT NULL,
    "PropertyTypeName" VARCHAR(100) NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,

    CONSTRAINT "PropertyType_pkey" PRIMARY KEY ("PropertyTypeID")
);

-- CreateIndex
CREATE INDEX "PropertyType_TenantID_CompanyID_idx" ON "PropertyType"("TenantID", "CompanyID");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyType_Tenant_Company_Name_key" ON "PropertyType"("TenantID", "CompanyID", "PropertyTypeName");
