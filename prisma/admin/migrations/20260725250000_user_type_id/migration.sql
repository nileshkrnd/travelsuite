-- AlterTable
ALTER TABLE "User" ADD COLUMN "UserTypeID" INTEGER NOT NULL DEFAULT 3;

-- Backfill from TenantID / CompanyID
UPDATE "User" SET "UserTypeID" = 1 WHERE "TenantID" = 0 AND "CompanyID" = 0;
UPDATE "User" SET "UserTypeID" = 2 WHERE "TenantID" > 0 AND "CompanyID" = 0;
UPDATE "User" SET "UserTypeID" = 3 WHERE "TenantID" > 0 AND "CompanyID" > 0;

-- CreateIndex
CREATE INDEX "User_UserTypeID_idx" ON "User"("UserTypeID");
