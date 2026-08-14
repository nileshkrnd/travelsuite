-- CreateTable
CREATE TABLE "PropertySeason" (
    "PropertySeasonID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "PropertyID" INTEGER NOT NULL,
    "SeasonCode" VARCHAR(50) NOT NULL,
    "SeasonName" VARCHAR(100) NOT NULL,
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "PropertySeason_pkey" PRIMARY KEY ("PropertySeasonID")
);

-- CreateTable
CREATE TABLE "PropertyContractSeasonPeriod" (
    "PropertyContractSeasonPeriodID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "PropertyContractID" BIGINT NOT NULL,
    "PropertySeasonID" BIGINT NOT NULL,
    "FromDate" DATE NOT NULL,
    "ToDate" DATE NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "PropertyContractSeasonPeriod_pkey" PRIMARY KEY ("PropertyContractSeasonPeriodID")
);

-- CreateIndex
CREATE INDEX "PropertySeason_TenantID_CompanyID_idx" ON "PropertySeason"("TenantID", "CompanyID");

-- CreateIndex
CREATE INDEX "PropertySeason_PropertyID_idx" ON "PropertySeason"("PropertyID");

-- CreateIndex
CREATE UNIQUE INDEX "PropertySeason_Tenant_Property_Code_key" ON "PropertySeason"("TenantID", "PropertyID", "SeasonCode");

-- CreateIndex
CREATE INDEX "PropertyContractSeasonPeriod_TenantID_CompanyID_idx" ON "PropertyContractSeasonPeriod"("TenantID", "CompanyID");

-- CreateIndex
CREATE INDEX "PropertyContractSeasonPeriod_PropertyContractID_idx" ON "PropertyContractSeasonPeriod"("PropertyContractID");

-- CreateIndex
CREATE INDEX "PropertyContractSeasonPeriod_PropertySeasonID_idx" ON "PropertyContractSeasonPeriod"("PropertySeasonID");

-- AddForeignKey
ALTER TABLE "PropertySeason" ADD CONSTRAINT "PropertySeason_PropertyID_fkey" FOREIGN KEY ("PropertyID") REFERENCES "Property"("PropertyID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyContractSeasonPeriod" ADD CONSTRAINT "PropertyContractSeasonPeriod_PropertyContractID_fkey" FOREIGN KEY ("PropertyContractID") REFERENCES "PropertyContract"("PropertyContractID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyContractSeasonPeriod" ADD CONSTRAINT "PropertyContractSeasonPeriod_PropertySeasonID_fkey" FOREIGN KEY ("PropertySeasonID") REFERENCES "PropertySeason"("PropertySeasonID") ON DELETE RESTRICT ON UPDATE CASCADE;
