-- Rename B2BCustomerContactType → ContactTypeMaster (shared lookup).
-- Point B2BCustomerContact.ContactTypeID at the renamed table.

ALTER TABLE "B2BCustomerContact" DROP CONSTRAINT "B2BCustomerContact_B2BCustomerContactTypeID_fkey";
DROP INDEX "B2BCustomerContact_TypeID_idx";

ALTER TABLE "B2BCustomerContactType" RENAME TO "ContactTypeMaster";
ALTER TABLE "ContactTypeMaster" RENAME COLUMN "B2BCustomerContactTypeID" TO "ContactTypeID";
ALTER TABLE "ContactTypeMaster" RENAME CONSTRAINT "B2BCustomerContactType_pkey" TO "ContactTypeMaster_pkey";
ALTER INDEX "B2BCustomerContactType_Tenant_Company_Code_key" RENAME TO "ContactTypeMaster_Tenant_Company_Code_key";
ALTER INDEX "B2BCustomerContactType_TenantID_CompanyID_idx" RENAME TO "ContactTypeMaster_TenantID_CompanyID_idx";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class WHERE relkind = 'S' AND relname = 'B2BCustomerContactType_B2BCustomerContactTypeID_seq'
  ) THEN
    ALTER SEQUENCE "B2BCustomerContactType_B2BCustomerContactTypeID_seq" RENAME TO "ContactTypeMaster_ContactTypeID_seq";
  END IF;
END $$;

ALTER TABLE "B2BCustomerContact" RENAME COLUMN "B2BCustomerContactTypeID" TO "ContactTypeID";
CREATE INDEX "B2BCustomerContact_TypeID_idx" ON "B2BCustomerContact"("ContactTypeID");
ALTER TABLE "B2BCustomerContact" ADD CONSTRAINT "B2BCustomerContact_ContactTypeID_fkey"
  FOREIGN KEY ("ContactTypeID") REFERENCES "ContactTypeMaster"("ContactTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;
