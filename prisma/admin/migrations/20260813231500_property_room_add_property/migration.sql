-- Add PropertyID to PropertyRoom (greenfield-safe: table is empty or rows must be cleaned first).

DROP INDEX IF EXISTS "PropertyRoom_Tenant_Code_key";

ALTER TABLE "PropertyRoom" ADD COLUMN IF NOT EXISTS "PropertyID" INTEGER;

-- Remove any placeholder rows that cannot satisfy the FK (dev/empty tables only).
DELETE FROM "PropertyRoom" WHERE "PropertyID" IS NULL;

ALTER TABLE "PropertyRoom" ALTER COLUMN "PropertyID" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "PropertyRoom_PropertyID_idx" ON "PropertyRoom"("PropertyID");

CREATE UNIQUE INDEX IF NOT EXISTS "PropertyRoom_Tenant_Property_Code_key"
  ON "PropertyRoom"("TenantID", "PropertyID", "RoomCode");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PropertyRoom_PropertyID_fkey'
  ) THEN
    ALTER TABLE "PropertyRoom"
      ADD CONSTRAINT "PropertyRoom_PropertyID_fkey"
      FOREIGN KEY ("PropertyID") REFERENCES "Property"("PropertyID")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
