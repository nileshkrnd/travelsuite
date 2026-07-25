-- CreateTable
CREATE TABLE "Department" (
    "DepartmentID" SERIAL NOT NULL,
    "DepartmentCode" VARCHAR(20) NOT NULL,
    "DepartmentName" VARCHAR(50) NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("DepartmentID")
);

-- CreateIndex
CREATE INDEX "Department_TenantID_CompanyID_idx" ON "Department"("TenantID", "CompanyID");

-- CreateIndex
CREATE UNIQUE INDEX "Department_Tenant_Company_Code_key" ON "Department"("TenantID", "CompanyID", "DepartmentCode");
