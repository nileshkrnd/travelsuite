-- CreateTable
CREATE TABLE "AccessRole" (
    "AccessRoleID" SERIAL NOT NULL,
    "AccessRoleName" VARCHAR(50) NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,

    CONSTRAINT "AccessRole_pkey" PRIMARY KEY ("AccessRoleID")
);

-- CreateIndex
CREATE INDEX "AccessRole_TenantID_CompanyID_idx" ON "AccessRole"("TenantID", "CompanyID");

-- CreateIndex
CREATE UNIQUE INDEX "AccessRole_Tenant_Company_Name_key" ON "AccessRole"("TenantID", "CompanyID", "AccessRoleName");
