-- CreateTable
CREATE TABLE "AccountsSchemaInfo" (
    "Id" INTEGER NOT NULL DEFAULT 1,
    "Name" VARCHAR(50) NOT NULL DEFAULT 'KlyraAccounts',
    "CreatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountsSchemaInfo_pkey" PRIMARY KEY ("Id")
);
