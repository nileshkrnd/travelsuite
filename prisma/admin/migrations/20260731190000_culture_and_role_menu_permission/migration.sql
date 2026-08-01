-- Culture master + tenant assignment
CREATE TABLE "Culture" (
    "CultureID" SERIAL NOT NULL,
    "CultureCode" VARCHAR(10) NOT NULL,
    "CultureName" VARCHAR(200) NOT NULL,
    "Direction" VARCHAR(10) NOT NULL DEFAULT 'ltr',
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "Culture_pkey" PRIMARY KEY ("CultureID")
);

CREATE UNIQUE INDEX "Culture_CultureCode_key" ON "Culture"("CultureCode");

CREATE TABLE "TenantCulture" (
    "TenantCultureID" SERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CultureID" INTEGER NOT NULL,
    "IsDefault" BOOLEAN NOT NULL DEFAULT false,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "TenantCulture_pkey" PRIMARY KEY ("TenantCultureID")
);

CREATE UNIQUE INDEX "TenantCulture_Tenant_Culture_key" ON "TenantCulture"("TenantID", "CultureID");
CREATE INDEX "TenantCulture_TenantID_idx" ON "TenantCulture"("TenantID");
CREATE INDEX "TenantCulture_CultureID_idx" ON "TenantCulture"("CultureID");

ALTER TABLE "TenantCulture" ADD CONSTRAINT "TenantCulture_TenantID_fkey"
  FOREIGN KEY ("TenantID") REFERENCES "Tenant"("TenantID") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TenantCulture" ADD CONSTRAINT "TenantCulture_CultureID_fkey"
  FOREIGN KEY ("CultureID") REFERENCES "Culture"("CultureID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Access Role ↔ Module Menu permissions
CREATE TABLE "TenantAccessRoleMenuPermission" (
    "TenantAccessRoleMenuPermissionID" SERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "AccessRoleID" INTEGER NOT NULL,
    "SubscriptionModuleMenuID" INTEGER NOT NULL,
    "CanView" BOOLEAN NOT NULL DEFAULT false,
    "CanCreate" BOOLEAN NOT NULL DEFAULT false,
    "CanEdit" BOOLEAN NOT NULL DEFAULT false,
    "CanDelete" BOOLEAN NOT NULL DEFAULT false,
    "CanApprove" BOOLEAN NOT NULL DEFAULT false,
    "CanExport" BOOLEAN NOT NULL DEFAULT false,
    "CanPrint" BOOLEAN NOT NULL DEFAULT false,
    "CanReadOnly" BOOLEAN NOT NULL DEFAULT false,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "TenantAccessRoleMenuPermission_pkey" PRIMARY KEY ("TenantAccessRoleMenuPermissionID")
);

CREATE UNIQUE INDEX "TARMP_Tenant_Company_Role_Menu_key"
  ON "TenantAccessRoleMenuPermission"("TenantID", "CompanyID", "AccessRoleID", "SubscriptionModuleMenuID");
CREATE INDEX "TARMP_Tenant_Company_Role_idx"
  ON "TenantAccessRoleMenuPermission"("TenantID", "CompanyID", "AccessRoleID");
CREATE INDEX "TARMP_MenuID_idx"
  ON "TenantAccessRoleMenuPermission"("SubscriptionModuleMenuID");

ALTER TABLE "TenantAccessRoleMenuPermission" ADD CONSTRAINT "TenantAccessRoleMenuPermission_AccessRoleID_fkey"
  FOREIGN KEY ("AccessRoleID") REFERENCES "AccessRole"("AccessRoleID") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TenantAccessRoleMenuPermission" ADD CONSTRAINT "TenantAccessRoleMenuPermission_SubscriptionModuleMenuID_fkey"
  FOREIGN KEY ("SubscriptionModuleMenuID") REFERENCES "SubscriptionModuleMenu"("SubscriptionModuleMenuID") ON DELETE CASCADE ON UPDATE CASCADE;
