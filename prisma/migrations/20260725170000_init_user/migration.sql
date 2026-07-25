-- User master (scoped by TenantID / CompanyID; 0/0 = Super Admin)

CREATE TABLE "User" (
    "UserID" SERIAL NOT NULL,
    "Username" VARCHAR(200) NOT NULL,
    "PasswordHash" VARCHAR(500) NOT NULL,
    "UserDisplayName" VARCHAR(200) NOT NULL,
    "TenantID" INTEGER NOT NULL DEFAULT 0,
    "CompanyID" INTEGER NOT NULL DEFAULT 0,
    "LastLoggedInDtTm" TIMESTAMPTZ(6),
    "LastPasswordChangeDtTm" TIMESTAMPTZ(6),
    "CreatedBy" INTEGER NOT NULL,
    "CreateDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),
    "IsActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "User_pkey" PRIMARY KEY ("UserID")
);

CREATE UNIQUE INDEX "User_Username_key" ON "User"("Username");
CREATE INDEX "User_TenantID_CompanyID_idx" ON "User"("TenantID", "CompanyID");
