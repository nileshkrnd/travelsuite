-- Cancellation policy type master + contract cancellation policy entities (rules).

CREATE TABLE "CancellationPolicyType" (
    "CancellationPolicyTypeID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "CancellationPolicyTypeCode" VARCHAR(50) NOT NULL,
    "CancellationPolicyTypeName" VARCHAR(100) NOT NULL,
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "CancellationPolicyType_pkey" PRIMARY KEY ("CancellationPolicyTypeID")
);

CREATE UNIQUE INDEX "CancellationPolicyType_Tenant_Company_Code_key"
    ON "CancellationPolicyType"("TenantID", "CompanyID", "CancellationPolicyTypeCode");

CREATE INDEX "CancellationPolicyType_TenantID_CompanyID_idx"
    ON "CancellationPolicyType"("TenantID", "CompanyID");

CREATE TABLE "PropertyContractCancellationPolicy" (
    "PropertyContractCancellationPolicyID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "PropertyContractID" BIGINT NOT NULL,
    "PolicyCode" VARCHAR(50) NOT NULL,
    "PolicyName" VARCHAR(150) NOT NULL,
    "PropertyRoomTypeID" BIGINT,
    "PropertyContractRatePlanID" BIGINT,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "PropertyContractCancellationPolicy_pkey" PRIMARY KEY ("PropertyContractCancellationPolicyID")
);

CREATE UNIQUE INDEX "PropertyContractCancellationPolicy_Contract_Code_key"
    ON "PropertyContractCancellationPolicy"("TenantID", "PropertyContractID", "PolicyCode");

CREATE INDEX "PropertyContractCancellationPolicy_TenantID_CompanyID_idx"
    ON "PropertyContractCancellationPolicy"("TenantID", "CompanyID");

CREATE INDEX "PropertyContractCancellationPolicy_PropertyContractID_idx"
    ON "PropertyContractCancellationPolicy"("PropertyContractID");

CREATE INDEX "PropertyContractCancellationPolicy_PropertyRoomTypeID_idx"
    ON "PropertyContractCancellationPolicy"("PropertyRoomTypeID");

CREATE INDEX "PropertyContractCancellationPolicy_RatePlanID_idx"
    ON "PropertyContractCancellationPolicy"("PropertyContractRatePlanID");

CREATE TABLE "PropertyContractCancellationPolicyRule" (
    "PropertyContractCancellationPolicyRuleID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "PropertyContractCancellationPolicyID" BIGINT NOT NULL,
    "FromDaysBefore" INTEGER NOT NULL,
    "ToDaysBefore" INTEGER,
    "CancellationPolicyTypeID" BIGINT NOT NULL,
    "PenaltyValue" DECIMAL(18, 4) NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "PropertyContractCancellationPolicyRule_pkey" PRIMARY KEY ("PropertyContractCancellationPolicyRuleID")
);

CREATE INDEX "PropertyContractCancellationPolicyRule_TenantID_CompanyID_idx"
    ON "PropertyContractCancellationPolicyRule"("TenantID", "CompanyID");

CREATE INDEX "PropertyContractCancellationPolicyRule_PolicyID_idx"
    ON "PropertyContractCancellationPolicyRule"("PropertyContractCancellationPolicyID");

CREATE INDEX "PropertyContractCancellationPolicyRule_TypeID_idx"
    ON "PropertyContractCancellationPolicyRule"("CancellationPolicyTypeID");

ALTER TABLE "PropertyContractCancellationPolicy"
    ADD CONSTRAINT "PropertyContractCancellationPolicy_PropertyContractID_fkey"
    FOREIGN KEY ("PropertyContractID") REFERENCES "PropertyContract"("PropertyContractID") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PropertyContractCancellationPolicy"
    ADD CONSTRAINT "PropertyContractCancellationPolicy_PropertyRoomTypeID_fkey"
    FOREIGN KEY ("PropertyRoomTypeID") REFERENCES "PropertyRoom"("PropertyRoomID") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PropertyContractCancellationPolicy"
    ADD CONSTRAINT "PropertyContractCancellationPolicy_RatePlanID_fkey"
    FOREIGN KEY ("PropertyContractRatePlanID") REFERENCES "PropertyContractRatePlan"("PropertyContractRatePlanID") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PropertyContractCancellationPolicyRule"
    ADD CONSTRAINT "PropertyContractCancellationPolicyRule_PolicyID_fkey"
    FOREIGN KEY ("PropertyContractCancellationPolicyID") REFERENCES "PropertyContractCancellationPolicy"("PropertyContractCancellationPolicyID") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PropertyContractCancellationPolicyRule"
    ADD CONSTRAINT "PropertyContractCancellationPolicyRule_TypeID_fkey"
    FOREIGN KEY ("CancellationPolicyTypeID") REFERENCES "CancellationPolicyType"("CancellationPolicyTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;
