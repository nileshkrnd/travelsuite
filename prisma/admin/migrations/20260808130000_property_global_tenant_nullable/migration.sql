-- Property becomes a global master: TenantID/CompanyID = NULL means a Super-Admin-managed
-- global property (major hotel chains, apartments, ...). A real TenantID/CompanyID means a
-- property a tenant registered for itself. Existing rows keep their current TenantID/CompanyID
-- (tenant-owned), so this migration is purely additive/relaxing — no data changes.

ALTER TABLE "Property" ALTER COLUMN "TenantID" DROP NOT NULL;
ALTER TABLE "Property" ALTER COLUMN "CompanyID" DROP NOT NULL;

-- The existing composite unique index (TenantID, CompanyID, PropertyCode) does not protect
-- global rows, since Postgres treats NULL as distinct in unique indexes. Add a partial unique
-- index so PropertyCode stays unique among global (TenantID IS NULL) properties too.
CREATE UNIQUE INDEX "Property_Global_PropertyCode_key" ON "Property"("PropertyCode") WHERE "TenantID" IS NULL;
