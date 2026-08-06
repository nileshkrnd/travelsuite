-- Convert PropertyType, PropertyCategory, PropertyUsage, OwnershipType, PropertyBrand
-- from Tenant+Company-scoped (Int PK) to global (BigInt PK) masters.

-- 1. Dedupe: these tables were seeded once per company, so each name currently has one
--    row per company. Keep only the lowest-id row per name (the referenced rows —
--    verified no FK points at the higher-id duplicates in this dataset).
DELETE FROM "PropertyType" a USING "PropertyType" b
  WHERE a."PropertyTypeID" > b."PropertyTypeID" AND a."PropertyTypeName" = b."PropertyTypeName";
DELETE FROM "PropertyCategory" a USING "PropertyCategory" b
  WHERE a."PropertyCategoryID" > b."PropertyCategoryID" AND a."PropertyCategoryName" = b."PropertyCategoryName";
DELETE FROM "PropertyUsage" a USING "PropertyUsage" b
  WHERE a."PropertyUsageID" > b."PropertyUsageID" AND a."PropertyUsageName" = b."PropertyUsageName";
DELETE FROM "OwnershipType" a USING "OwnershipType" b
  WHERE a."OwnershipTypeID" > b."OwnershipTypeID" AND a."OwnershipTypeName" = b."OwnershipTypeName";
DELETE FROM "PropertyBrand" a USING "PropertyBrand" b
  WHERE a."PropertyBrandID" > b."PropertyBrandID" AND a."PropertyBrandName" = b."PropertyBrandName";

-- 2. Drop FK constraints referencing these 5 tables (required before widening PK types).
ALTER TABLE "Property" DROP CONSTRAINT IF EXISTS "Property_PropertyUsageID_fkey";
ALTER TABLE "Property" DROP CONSTRAINT IF EXISTS "Property_OwnershipTypeID_fkey";
ALTER TABLE "Property" DROP CONSTRAINT IF EXISTS "Property_PropertyBrandID_fkey";
ALTER TABLE "PropertyTypeLink" DROP CONSTRAINT IF EXISTS "PropertyTypeLink_PropertyTypeID_fkey";
ALTER TABLE "PropertyCategoryLink" DROP CONSTRAINT IF EXISTS "PropertyCategoryLink_PropertyCategoryID_fkey";

-- 3. Drop the old Tenant+Company-scoped unique constraints and indexes.
ALTER TABLE "PropertyType" DROP CONSTRAINT IF EXISTS "PropertyType_Tenant_Company_Name_key";
DROP INDEX IF EXISTS "PropertyType_TenantID_CompanyID_idx";
ALTER TABLE "PropertyCategory" DROP CONSTRAINT IF EXISTS "PropertyCategory_Tenant_Company_Name_key";
DROP INDEX IF EXISTS "PropertyCategory_TenantID_CompanyID_idx";
ALTER TABLE "PropertyUsage" DROP CONSTRAINT IF EXISTS "PropertyUsage_Tenant_Company_Name_key";
DROP INDEX IF EXISTS "PropertyUsage_TenantID_CompanyID_idx";
ALTER TABLE "OwnershipType" DROP CONSTRAINT IF EXISTS "OwnershipType_Tenant_Company_Name_key";
DROP INDEX IF EXISTS "OwnershipType_TenantID_CompanyID_idx";
ALTER TABLE "PropertyBrand" DROP CONSTRAINT IF EXISTS "PropertyBrand_Tenant_Company_Name_key";
DROP INDEX IF EXISTS "PropertyBrand_TenantID_CompanyID_idx";

-- 4. Drop TenantID/CompanyID columns.
ALTER TABLE "PropertyType" DROP COLUMN IF EXISTS "TenantID", DROP COLUMN IF EXISTS "CompanyID";
ALTER TABLE "PropertyCategory" DROP COLUMN IF EXISTS "TenantID", DROP COLUMN IF EXISTS "CompanyID";
ALTER TABLE "PropertyUsage" DROP COLUMN IF EXISTS "TenantID", DROP COLUMN IF EXISTS "CompanyID";
ALTER TABLE "OwnershipType" DROP COLUMN IF EXISTS "TenantID", DROP COLUMN IF EXISTS "CompanyID";
ALTER TABLE "PropertyBrand" DROP COLUMN IF EXISTS "TenantID", DROP COLUMN IF EXISTS "CompanyID";

-- 5. Widen PK columns to BIGINT and switch their backing sequences to BIGSERIAL semantics.
ALTER TABLE "PropertyType" ALTER COLUMN "PropertyTypeID" TYPE BIGINT;
ALTER TABLE "PropertyCategory" ALTER COLUMN "PropertyCategoryID" TYPE BIGINT;
ALTER TABLE "PropertyUsage" ALTER COLUMN "PropertyUsageID" TYPE BIGINT;
ALTER TABLE "OwnershipType" ALTER COLUMN "OwnershipTypeID" TYPE BIGINT;
ALTER TABLE "PropertyBrand" ALTER COLUMN "PropertyBrandID" TYPE BIGINT;

DO $$
DECLARE seq text;
BEGIN
  seq := pg_get_serial_sequence('"PropertyType"', 'PropertyTypeID');
  IF seq IS NOT NULL THEN EXECUTE format('ALTER SEQUENCE %s AS bigint', seq); END IF;
  seq := pg_get_serial_sequence('"PropertyCategory"', 'PropertyCategoryID');
  IF seq IS NOT NULL THEN EXECUTE format('ALTER SEQUENCE %s AS bigint', seq); END IF;
  seq := pg_get_serial_sequence('"PropertyUsage"', 'PropertyUsageID');
  IF seq IS NOT NULL THEN EXECUTE format('ALTER SEQUENCE %s AS bigint', seq); END IF;
  seq := pg_get_serial_sequence('"OwnershipType"', 'OwnershipTypeID');
  IF seq IS NOT NULL THEN EXECUTE format('ALTER SEQUENCE %s AS bigint', seq); END IF;
  seq := pg_get_serial_sequence('"PropertyBrand"', 'PropertyBrandID');
  IF seq IS NOT NULL THEN EXECUTE format('ALTER SEQUENCE %s AS bigint', seq); END IF;
END $$;

-- 6. Widen the FK columns that point at these 5 tables to match.
ALTER TABLE "Property" ALTER COLUMN "PropertyUsageID" TYPE BIGINT;
ALTER TABLE "Property" ALTER COLUMN "OwnershipTypeID" TYPE BIGINT;
ALTER TABLE "Property" ALTER COLUMN "PropertyBrandID" TYPE BIGINT;
ALTER TABLE "PropertyTypeLink" ALTER COLUMN "PropertyTypeID" TYPE BIGINT;
ALTER TABLE "PropertyCategoryLink" ALTER COLUMN "PropertyCategoryID" TYPE BIGINT;

-- 7. Add new global unique constraints (name alone, no tenant/company scope).
ALTER TABLE "PropertyType" ADD CONSTRAINT "PropertyType_Name_key" UNIQUE ("PropertyTypeName");
ALTER TABLE "PropertyCategory" ADD CONSTRAINT "PropertyCategory_Name_key" UNIQUE ("PropertyCategoryName");
ALTER TABLE "PropertyUsage" ADD CONSTRAINT "PropertyUsage_Name_key" UNIQUE ("PropertyUsageName");
ALTER TABLE "OwnershipType" ADD CONSTRAINT "OwnershipType_Name_key" UNIQUE ("OwnershipTypeName");
ALTER TABLE "PropertyBrand" ADD CONSTRAINT "PropertyBrand_Name_key" UNIQUE ("PropertyBrandName");

-- 8. Re-add the FK constraints.
ALTER TABLE "Property" ADD CONSTRAINT "Property_PropertyUsageID_fkey"
  FOREIGN KEY ("PropertyUsageID") REFERENCES "PropertyUsage"("PropertyUsageID") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Property" ADD CONSTRAINT "Property_OwnershipTypeID_fkey"
  FOREIGN KEY ("OwnershipTypeID") REFERENCES "OwnershipType"("OwnershipTypeID") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Property" ADD CONSTRAINT "Property_PropertyBrandID_fkey"
  FOREIGN KEY ("PropertyBrandID") REFERENCES "PropertyBrand"("PropertyBrandID") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PropertyTypeLink" ADD CONSTRAINT "PropertyTypeLink_PropertyTypeID_fkey"
  FOREIGN KEY ("PropertyTypeID") REFERENCES "PropertyType"("PropertyTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PropertyCategoryLink" ADD CONSTRAINT "PropertyCategoryLink_PropertyCategoryID_fkey"
  FOREIGN KEY ("PropertyCategoryID") REFERENCES "PropertyCategory"("PropertyCategoryID") ON DELETE RESTRICT ON UPDATE CASCADE;
