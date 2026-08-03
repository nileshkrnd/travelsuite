-- Property identity & description fields
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "PropertyName" VARCHAR(250);
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "PropertyDisplayName" VARCHAR(250);
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "ShortDescription" TEXT;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "Description" TEXT;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "InternalRemarks" TEXT;

-- Many-to-many Property ↔ PropertyType
CREATE TABLE IF NOT EXISTS "PropertyTypeLink" (
    "PropertyID" INTEGER NOT NULL,
    "PropertyTypeID" INTEGER NOT NULL,
    CONSTRAINT "PropertyTypeLink_pkey" PRIMARY KEY ("PropertyID", "PropertyTypeID")
);
CREATE INDEX IF NOT EXISTS "PropertyTypeLink_PropertyTypeID_idx" ON "PropertyTypeLink"("PropertyTypeID");

-- Many-to-many Property ↔ PropertyCategory
CREATE TABLE IF NOT EXISTS "PropertyCategoryLink" (
    "PropertyID" INTEGER NOT NULL,
    "PropertyCategoryID" INTEGER NOT NULL,
    CONSTRAINT "PropertyCategoryLink_pkey" PRIMARY KEY ("PropertyID", "PropertyCategoryID")
);
CREATE INDEX IF NOT EXISTS "PropertyCategoryLink_PropertyCategoryID_idx" ON "PropertyCategoryLink"("PropertyCategoryID");

-- Migrate existing single FK values into junction tables
INSERT INTO "PropertyTypeLink" ("PropertyID", "PropertyTypeID")
SELECT "PropertyID", "PropertyTypeID" FROM "Property"
WHERE "PropertyTypeID" IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO "PropertyCategoryLink" ("PropertyID", "PropertyCategoryID")
SELECT "PropertyID", "PropertyCategoryID" FROM "Property"
WHERE "PropertyCategoryID" IS NOT NULL
ON CONFLICT DO NOTHING;

-- Drop old single-FK constraints & columns
ALTER TABLE "Property" DROP CONSTRAINT IF EXISTS "Property_PropertyTypeID_fkey";
ALTER TABLE "Property" DROP CONSTRAINT IF EXISTS "Property_PropertyCategoryID_fkey";
DROP INDEX IF EXISTS "Property_PropertyTypeID_idx";
DROP INDEX IF EXISTS "Property_PropertyCategoryID_idx";
ALTER TABLE "Property" DROP COLUMN IF EXISTS "PropertyTypeID";
ALTER TABLE "Property" DROP COLUMN IF EXISTS "PropertyCategoryID";

-- Junction FKs
ALTER TABLE "PropertyTypeLink" DROP CONSTRAINT IF EXISTS "PropertyTypeLink_PropertyID_fkey";
ALTER TABLE "PropertyTypeLink" DROP CONSTRAINT IF EXISTS "PropertyTypeLink_PropertyTypeID_fkey";
ALTER TABLE "PropertyTypeLink"
  ADD CONSTRAINT "PropertyTypeLink_PropertyID_fkey"
  FOREIGN KEY ("PropertyID") REFERENCES "Property"("PropertyID") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PropertyTypeLink"
  ADD CONSTRAINT "PropertyTypeLink_PropertyTypeID_fkey"
  FOREIGN KEY ("PropertyTypeID") REFERENCES "PropertyType"("PropertyTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PropertyCategoryLink" DROP CONSTRAINT IF EXISTS "PropertyCategoryLink_PropertyID_fkey";
ALTER TABLE "PropertyCategoryLink" DROP CONSTRAINT IF EXISTS "PropertyCategoryLink_PropertyCategoryID_fkey";
ALTER TABLE "PropertyCategoryLink"
  ADD CONSTRAINT "PropertyCategoryLink_PropertyID_fkey"
  FOREIGN KEY ("PropertyID") REFERENCES "Property"("PropertyID") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PropertyCategoryLink"
  ADD CONSTRAINT "PropertyCategoryLink_PropertyCategoryID_fkey"
  FOREIGN KEY ("PropertyCategoryID") REFERENCES "PropertyCategory"("PropertyCategoryID") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Property_CreatedDtTm_idx" ON "Property"("CreatedDtTm");
