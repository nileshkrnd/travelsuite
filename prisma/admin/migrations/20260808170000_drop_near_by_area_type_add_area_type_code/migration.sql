-- Revert the standalone Near By Area Type master — these categories belong in the existing,
-- shared Area Type master instead (used platform-wide, not just by Property).
DROP TABLE IF EXISTS "NearByAreaTypeMaster" CASCADE;

-- Add a Code column to the existing Area Type master.
ALTER TABLE "AreaType" ADD COLUMN "AreaTypeCode" VARCHAR(50);

-- Backfill existing rows with a generated code (e.g. "Mixed Use" -> "MIXED_USE").
UPDATE "AreaType" SET "AreaTypeCode" = UPPER(REPLACE("AreaTypeName", ' ', '_')) WHERE "AreaTypeCode" IS NULL;

ALTER TABLE "AreaType" ALTER COLUMN "AreaTypeCode" SET NOT NULL;
CREATE UNIQUE INDEX "AreaType_AreaTypeCode_key" ON "AreaType"("AreaTypeCode");
