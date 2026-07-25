-- CreateTable
CREATE TABLE "Designation" (
    "DesignationID" SERIAL NOT NULL,
    "DesignationCode" VARCHAR(20) NOT NULL,
    "DesignationName" VARCHAR(100) NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,

    CONSTRAINT "Designation_pkey" PRIMARY KEY ("DesignationID")
);

-- CreateIndex
CREATE INDEX "Designation_TenantID_CompanyID_idx" ON "Designation"("TenantID", "CompanyID");

-- CreateIndex
CREATE UNIQUE INDEX "Designation_Tenant_Company_Code_key" ON "Designation"("TenantID", "CompanyID", "DesignationCode");
