-- Rename B2BCustomerDocumentType → DocumentTypeMaster (shared lookup).
-- B2BCustomerDocument.DocumentTypeID already exists; the FK follows the renamed table.

ALTER TABLE "B2BCustomerDocumentType" RENAME TO "DocumentTypeMaster";
ALTER TABLE "DocumentTypeMaster" RENAME CONSTRAINT "B2BCustomerDocumentType_pkey" TO "DocumentTypeMaster_pkey";
ALTER INDEX "B2BCustomerDocumentType_Tenant_Company_Code_key" RENAME TO "DocumentTypeMaster_Tenant_Company_Code_key";
ALTER INDEX "B2BCustomerDocumentType_TenantID_CompanyID_idx" RENAME TO "DocumentTypeMaster_TenantID_CompanyID_idx";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class WHERE relkind = 'S' AND relname = 'B2BCustomerDocumentType_DocumentTypeID_seq'
  ) THEN
    ALTER SEQUENCE "B2BCustomerDocumentType_DocumentTypeID_seq" RENAME TO "DocumentTypeMaster_DocumentTypeID_seq";
  END IF;
END $$;
