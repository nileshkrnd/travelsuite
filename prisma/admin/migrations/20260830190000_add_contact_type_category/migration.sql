-- Who a contact type applies to: Customer, Supplier, or Both.
ALTER TABLE "ContactTypeMaster"
  ADD COLUMN "ContactTypeCategory" VARCHAR(20) NOT NULL DEFAULT 'BOTH';

ALTER TABLE "ContactTypeMaster"
  ADD CONSTRAINT "ContactTypeMaster_Category_check"
  CHECK ("ContactTypeCategory" IN ('CUSTOMER', 'SUPPLIER', 'BOTH'));
