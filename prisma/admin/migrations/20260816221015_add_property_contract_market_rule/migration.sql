-- CreateTable
CREATE TABLE "MarketType" (
    "MarketTypeID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "MarketTypeCode" VARCHAR(50) NOT NULL,
    "MarketTypeName" VARCHAR(100) NOT NULL,
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "MarketType_pkey" PRIMARY KEY ("MarketTypeID")
);

-- CreateTable
CREATE TABLE "MarketGroup" (
    "MarketGroupID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "MarketGroupCode" VARCHAR(50) NOT NULL,
    "MarketGroupName" VARCHAR(150) NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "MarketGroup_pkey" PRIMARY KEY ("MarketGroupID")
);

-- CreateTable
CREATE TABLE "PropertyContractMarketRule" (
    "PropertyContractMarketRuleID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "PropertyContractID" BIGINT NOT NULL,
    "MarketTypeID" BIGINT NOT NULL,
    "RegionID" INTEGER,
    "CountryID" INTEGER,
    "CityID" INTEGER,
    "MarketGroupID" BIGINT,
    "RuleType" VARCHAR(20) NOT NULL,
    "FromDate" DATE,
    "ToDate" DATE,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "PropertyContractMarketRule_pkey" PRIMARY KEY ("PropertyContractMarketRuleID")
);

-- CreateIndex
CREATE INDEX "MarketType_TenantID_CompanyID_idx" ON "MarketType"("TenantID", "CompanyID");

-- CreateIndex
CREATE UNIQUE INDEX "MarketType_Tenant_Company_Code_key" ON "MarketType"("TenantID", "CompanyID", "MarketTypeCode");

-- CreateIndex
CREATE INDEX "MarketGroup_TenantID_CompanyID_idx" ON "MarketGroup"("TenantID", "CompanyID");

-- CreateIndex
CREATE UNIQUE INDEX "MarketGroup_Tenant_Company_Code_key" ON "MarketGroup"("TenantID", "CompanyID", "MarketGroupCode");

-- CreateIndex
CREATE INDEX "PropertyContractMarketRule_TenantID_CompanyID_idx" ON "PropertyContractMarketRule"("TenantID", "CompanyID");

-- CreateIndex
CREATE INDEX "PropertyContractMarketRule_PropertyContractID_idx" ON "PropertyContractMarketRule"("PropertyContractID");

-- CreateIndex
CREATE INDEX "PropertyContractMarketRule_MarketTypeID_idx" ON "PropertyContractMarketRule"("MarketTypeID");

-- CreateIndex
CREATE INDEX "PropertyContractMarketRule_RegionID_idx" ON "PropertyContractMarketRule"("RegionID");

-- CreateIndex
CREATE INDEX "PropertyContractMarketRule_CountryID_idx" ON "PropertyContractMarketRule"("CountryID");

-- CreateIndex
CREATE INDEX "PropertyContractMarketRule_CityID_idx" ON "PropertyContractMarketRule"("CityID");

-- CreateIndex
CREATE INDEX "PropertyContractMarketRule_MarketGroupID_idx" ON "PropertyContractMarketRule"("MarketGroupID");

-- AddForeignKey
ALTER TABLE "PropertyContractMarketRule" ADD CONSTRAINT "PropertyContractMarketRule_PropertyContractID_fkey" FOREIGN KEY ("PropertyContractID") REFERENCES "PropertyContract"("PropertyContractID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyContractMarketRule" ADD CONSTRAINT "PropertyContractMarketRule_MarketTypeID_fkey" FOREIGN KEY ("MarketTypeID") REFERENCES "MarketType"("MarketTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyContractMarketRule" ADD CONSTRAINT "PropertyContractMarketRule_RegionID_fkey" FOREIGN KEY ("RegionID") REFERENCES "Region"("RegionID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyContractMarketRule" ADD CONSTRAINT "PropertyContractMarketRule_CountryID_fkey" FOREIGN KEY ("CountryID") REFERENCES "Country"("CountryID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyContractMarketRule" ADD CONSTRAINT "PropertyContractMarketRule_CityID_fkey" FOREIGN KEY ("CityID") REFERENCES "City"("CityID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyContractMarketRule" ADD CONSTRAINT "PropertyContractMarketRule_MarketGroupID_fkey" FOREIGN KEY ("MarketGroupID") REFERENCES "MarketGroup"("MarketGroupID") ON DELETE RESTRICT ON UPDATE CASCADE;
