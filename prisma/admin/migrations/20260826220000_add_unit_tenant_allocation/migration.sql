-- Block reason on the unit itself
ALTER TABLE "UnitMaster" ADD COLUMN "BlockReason" VARCHAR(250);

-- Tenant allocation history / current occupant
CREATE TABLE "UnitTenantAllocation" (
    "UnitAllocationID" BIGSERIAL NOT NULL,
    "UnitID" BIGINT NOT NULL,
    "PropertyTenantID" BIGINT NOT NULL,
    "AllocatedFrom" DATE NOT NULL,
    "AllocatedTo" DATE,
    "Notes" VARCHAR(250),
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDate" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy" INTEGER,
    "UpdatedDate" TIMESTAMPTZ(6),

    CONSTRAINT "UnitTenantAllocation_pkey" PRIMARY KEY ("UnitAllocationID")
);

CREATE INDEX "UnitTenantAllocation_UnitID_idx" ON "UnitTenantAllocation"("UnitID");
CREATE INDEX "UnitTenantAllocation_PropertyTenantID_idx" ON "UnitTenantAllocation"("PropertyTenantID");
CREATE UNIQUE INDEX "UnitTenantAllocation_ActiveUnit_key" ON "UnitTenantAllocation"("UnitID") WHERE "IsActive" = true;

ALTER TABLE "UnitTenantAllocation" ADD CONSTRAINT "UnitTenantAllocation_UnitID_fkey"
  FOREIGN KEY ("UnitID") REFERENCES "UnitMaster"("UnitID") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UnitTenantAllocation" ADD CONSTRAINT "UnitTenantAllocation_PropertyTenantID_fkey"
  FOREIGN KEY ("PropertyTenantID") REFERENCES "PropertyTenant"("PropertyTenantID") ON DELETE RESTRICT ON UPDATE CASCADE;
