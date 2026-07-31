-- Subscription catalog (Product → Module → Access / Menu)
-- These tables were previously created via db push locally; this migration
-- makes fresh environments (e.g. Supabase) receivable via migrate deploy.

CREATE TABLE IF NOT EXISTS "SubscriptionProduct" (
    "SubscriptionProductID" SERIAL NOT NULL,
    "SubscriptionProductName" VARCHAR(50) NOT NULL,
    "Description" VARCHAR(200) NOT NULL DEFAULT '',
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "SubscriptionProduct_pkey" PRIMARY KEY ("SubscriptionProductID")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SubscriptionProduct_SubscriptionProductName_key"
  ON "SubscriptionProduct"("SubscriptionProductName");

CREATE TABLE IF NOT EXISTS "SubscriptionModule" (
    "SubscriptionModuleID" SERIAL NOT NULL,
    "SubscriptionProductID" INTEGER NOT NULL,
    "SubscriptionModuleName" VARCHAR(50) NOT NULL,
    "Description" VARCHAR(200) NOT NULL DEFAULT '',
    "SortOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "SubscriptionModule_pkey" PRIMARY KEY ("SubscriptionModuleID")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SubscriptionModule_Product_Name_key"
  ON "SubscriptionModule"("SubscriptionProductID", "SubscriptionModuleName");

CREATE INDEX IF NOT EXISTS "SubscriptionModule_ProductID_idx"
  ON "SubscriptionModule"("SubscriptionProductID");

DO $$ BEGIN
  ALTER TABLE "SubscriptionModule"
    ADD CONSTRAINT "SubscriptionModule_SubscriptionProductID_fkey"
    FOREIGN KEY ("SubscriptionProductID") REFERENCES "SubscriptionProduct"("SubscriptionProductID")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "SubscriptionModuleAccess" (
    "SubscriptionModuleAccessID" SERIAL NOT NULL,
    "SubscriptionModuleID" INTEGER NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "SubscriptionModuleAccess_pkey" PRIMARY KEY ("SubscriptionModuleAccessID")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SubscriptionModuleAccess_Module_Tenant_key"
  ON "SubscriptionModuleAccess"("SubscriptionModuleID", "TenantID");

CREATE INDEX IF NOT EXISTS "SubscriptionModuleAccess_ModuleID_idx"
  ON "SubscriptionModuleAccess"("SubscriptionModuleID");

CREATE INDEX IF NOT EXISTS "SubscriptionModuleAccess_TenantID_idx"
  ON "SubscriptionModuleAccess"("TenantID");

DO $$ BEGIN
  ALTER TABLE "SubscriptionModuleAccess"
    ADD CONSTRAINT "SubscriptionModuleAccess_SubscriptionModuleID_fkey"
    FOREIGN KEY ("SubscriptionModuleID") REFERENCES "SubscriptionModule"("SubscriptionModuleID")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "SubscriptionModuleAccess"
    ADD CONSTRAINT "SubscriptionModuleAccess_TenantID_fkey"
    FOREIGN KEY ("TenantID") REFERENCES "Tenant"("TenantID")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "SubscriptionModuleMenu" (
    "SubscriptionModuleMenuID" SERIAL NOT NULL,
    "SubscriptionModuleID" INTEGER NOT NULL,
    "ParentMenuID" INTEGER,
    "MenuName" VARCHAR(100) NOT NULL,
    "MenuURL" VARCHAR(200) NOT NULL,
    "MenuIcon" VARCHAR(50) NOT NULL DEFAULT 'Layers',
    "SortOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "SubscriptionModuleMenu_pkey" PRIMARY KEY ("SubscriptionModuleMenuID")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SubscriptionModuleMenu_Module_URL_key"
  ON "SubscriptionModuleMenu"("SubscriptionModuleID", "MenuURL");

CREATE INDEX IF NOT EXISTS "SubscriptionModuleMenu_ModuleID_idx"
  ON "SubscriptionModuleMenu"("SubscriptionModuleID");

CREATE INDEX IF NOT EXISTS "SubscriptionModuleMenu_ParentMenuID_idx"
  ON "SubscriptionModuleMenu"("ParentMenuID");

DO $$ BEGIN
  ALTER TABLE "SubscriptionModuleMenu"
    ADD CONSTRAINT "SubscriptionModuleMenu_SubscriptionModuleID_fkey"
    FOREIGN KEY ("SubscriptionModuleID") REFERENCES "SubscriptionModule"("SubscriptionModuleID")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "SubscriptionModuleMenu"
    ADD CONSTRAINT "SubscriptionModuleMenu_ParentMenuID_fkey"
    FOREIGN KEY ("ParentMenuID") REFERENCES "SubscriptionModuleMenu"("SubscriptionModuleMenuID")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
