-- CreateTable
CREATE TABLE "Tenant" (
    "TenantID" SERIAL NOT NULL,
    "TenantUid" VARCHAR(100) NOT NULL,
    "TenantCode" VARCHAR(100) NOT NULL,
    "TenantName" VARCHAR(200) NOT NULL,
    "GroupName" VARCHAR(200) NOT NULL,
    "DefaultCurrency" VARCHAR(10) NOT NULL,
    "SupportedCurrencies" VARCHAR(200) NOT NULL,
    "DefaultLocale" VARCHAR(10) NOT NULL DEFAULT 'en',
    "SupportedLocales" VARCHAR(100) NOT NULL DEFAULT 'en',
    "PrimaryColor" VARCHAR(20) NOT NULL,
    "LogoUrl" VARCHAR(500) NOT NULL DEFAULT '',
    "AddressLine1" VARCHAR(200) NOT NULL,
    "AddressLine2" VARCHAR(200),
    "Country" VARCHAR(10) NOT NULL,
    "City" VARCHAR(100) NOT NULL,
    "Zip" VARCHAR(30) NOT NULL,
    "Timezone" VARCHAR(100) NOT NULL,
    "Email" VARCHAR(200) NOT NULL,
    "DialCode" VARCHAR(20) NOT NULL,
    "Phone" VARCHAR(50) NOT NULL,
    "Status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("TenantID")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_TenantUid_key" ON "Tenant"("TenantUid");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_TenantCode_key" ON "Tenant"("TenantCode");
