-- Child policy type master + contract child policy entities (age bands).

CREATE TABLE "ChildPolicyType" (
    "ChildPolicyTypeID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "ChildPolicyTypeCode" VARCHAR(50) NOT NULL,
    "ChildPolicyTypeName" VARCHAR(100) NOT NULL,
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "ChildPolicyType_pkey" PRIMARY KEY ("ChildPolicyTypeID")
);

CREATE UNIQUE INDEX "ChildPolicyType_Tenant_Company_Code_key"
    ON "ChildPolicyType"("TenantID", "CompanyID", "ChildPolicyTypeCode");

CREATE INDEX "ChildPolicyType_TenantID_CompanyID_idx"
    ON "ChildPolicyType"("TenantID", "CompanyID");

CREATE TABLE "PropertyContractChildPolicy" (
    "PropertyContractChildPolicyID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "PropertyContractID" BIGINT NOT NULL,
    "PropertyRoomTypeID" BIGINT,
    "MaxChild" INTEGER NOT NULL,
    "ChildCountsInOccupancy" BOOLEAN NOT NULL DEFAULT false,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "PropertyContractChildPolicy_pkey" PRIMARY KEY ("PropertyContractChildPolicyID")
);

CREATE INDEX "PropertyContractChildPolicy_TenantID_CompanyID_idx"
    ON "PropertyContractChildPolicy"("TenantID", "CompanyID");

CREATE INDEX "PropertyContractChildPolicy_PropertyContractID_idx"
    ON "PropertyContractChildPolicy"("PropertyContractID");

CREATE INDEX "PropertyContractChildPolicy_PropertyRoomTypeID_idx"
    ON "PropertyContractChildPolicy"("PropertyRoomTypeID");

CREATE TABLE "PropertyContractChildPolicyAge" (
    "PropertyContractChildPolicyAgeID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "PropertyContractChildPolicyID" BIGINT NOT NULL,
    "FromAge" DECIMAL(5, 2) NOT NULL,
    "ToAge" DECIMAL(5, 2) NOT NULL,
    "ChildPolicyTypeID" BIGINT NOT NULL,
    "RateValue" DECIMAL(18, 4),
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "PropertyContractChildPolicyAge_pkey" PRIMARY KEY ("PropertyContractChildPolicyAgeID")
);

CREATE INDEX "PropertyContractChildPolicyAge_TenantID_CompanyID_idx"
    ON "PropertyContractChildPolicyAge"("TenantID", "CompanyID");

CREATE INDEX "PropertyContractChildPolicyAge_PolicyID_idx"
    ON "PropertyContractChildPolicyAge"("PropertyContractChildPolicyID");

CREATE INDEX "PropertyContractChildPolicyAge_ChildPolicyTypeID_idx"
    ON "PropertyContractChildPolicyAge"("ChildPolicyTypeID");

ALTER TABLE "PropertyContractChildPolicy"
    ADD CONSTRAINT "PropertyContractChildPolicy_PropertyContractID_fkey"
    FOREIGN KEY ("PropertyContractID") REFERENCES "PropertyContract"("PropertyContractID") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PropertyContractChildPolicy"
    ADD CONSTRAINT "PropertyContractChildPolicy_PropertyRoomTypeID_fkey"
    FOREIGN KEY ("PropertyRoomTypeID") REFERENCES "PropertyRoom"("PropertyRoomID") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PropertyContractChildPolicyAge"
    ADD CONSTRAINT "PropertyContractChildPolicyAge_PolicyID_fkey"
    FOREIGN KEY ("PropertyContractChildPolicyID") REFERENCES "PropertyContractChildPolicy"("PropertyContractChildPolicyID") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PropertyContractChildPolicyAge"
    ADD CONSTRAINT "PropertyContractChildPolicyAge_ChildPolicyTypeID_fkey"
    FOREIGN KEY ("ChildPolicyTypeID") REFERENCES "ChildPolicyType"("ChildPolicyTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;
