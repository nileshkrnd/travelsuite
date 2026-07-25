-- Make Region a global master (drop TenantID / CompanyID)

DROP INDEX IF EXISTS "Region_Tenant_Company_Code_key";
DROP INDEX IF EXISTS "Region_TenantID_CompanyID_idx";

-- Rebuild table to drop scope columns and enforce unique RegionCode globally.
CREATE TABLE "Region_new" (
    "RegionID" SERIAL NOT NULL,
    "RegionCode" VARCHAR(100) NOT NULL,
    "RegionName" VARCHAR(200) NOT NULL,
    "Status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "Region_new_pkey" PRIMARY KEY ("RegionID")
);

CREATE UNIQUE INDEX "Region_RegionCode_key" ON "Region_new"("RegionCode");

-- Keep one row per RegionCode from legacy scoped data.
INSERT INTO "Region_new" ("RegionCode", "RegionName", "Status", "CreatedBy", "CreatedDtTm", "ModifiedBy", "ModifiedDtTm")
SELECT DISTINCT ON ("RegionCode")
  "RegionCode",
  "RegionName",
  'active',
  "CreatedBy",
  "CreatedDtTm",
  "ModifiedBy",
  "ModifiedDtTm"
FROM "Region"
ORDER BY "RegionCode", "RegionID";

DROP TABLE "Region";
ALTER TABLE "Region_new" RENAME TO "Region";
ALTER INDEX "Region_new_pkey" RENAME TO "Region_pkey";
