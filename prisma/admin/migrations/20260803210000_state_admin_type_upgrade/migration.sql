-- Upgrade StateAdministrativeType to a full master (rename columns, widen, add soft-delete)

ALTER TABLE "StateAdministrativeType" RENAME COLUMN "TypeName" TO "AdministrativeType";
ALTER TABLE "StateAdministrativeType" ALTER COLUMN "AdministrativeType" TYPE VARCHAR(150);

ALTER TABLE "StateAdministrativeType" RENAME COLUMN "CreatedDtTm" TO "CreatedDateTime";
ALTER TABLE "StateAdministrativeType" RENAME COLUMN "ModifiedDtTm" TO "ModifiedDateTime";

ALTER TABLE "StateAdministrativeType" ADD COLUMN "IsDeleted" BOOLEAN NOT NULL DEFAULT false;

ALTER INDEX "StateAdministrativeType_TypeName_key" RENAME TO "StateAdministrativeType_AdministrativeType_key";
