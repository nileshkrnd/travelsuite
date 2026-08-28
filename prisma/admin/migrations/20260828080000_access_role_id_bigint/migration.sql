-- Widen AccessRole.AccessRoleID from INTEGER to BIGINT, plus FK columns that reference it.

ALTER TABLE "Employee" DROP CONSTRAINT IF EXISTS "Employee_AccessRoleID_fkey";
ALTER TABLE "SupplierUser" DROP CONSTRAINT IF EXISTS "SupplierUser_AccessRoleID_fkey";
ALTER TABLE "TenantAccessRoleMenuPermission" DROP CONSTRAINT IF EXISTS "TenantAccessRoleMenuPermission_AccessRoleID_fkey";

ALTER TABLE "AccessRole" ALTER COLUMN "AccessRoleID" TYPE BIGINT;

DO $$
DECLARE seq text;
BEGIN
  seq := pg_get_serial_sequence('"AccessRole"', 'AccessRoleID');
  IF seq IS NOT NULL THEN EXECUTE format('ALTER SEQUENCE %s AS bigint', seq); END IF;
END $$;

ALTER TABLE "Employee" ALTER COLUMN "AccessRoleID" TYPE BIGINT;
ALTER TABLE "SupplierUser" ALTER COLUMN "AccessRoleID" TYPE BIGINT;
ALTER TABLE "TenantAccessRoleMenuPermission" ALTER COLUMN "AccessRoleID" TYPE BIGINT;

ALTER TABLE "Employee" ADD CONSTRAINT "Employee_AccessRoleID_fkey"
  FOREIGN KEY ("AccessRoleID") REFERENCES "AccessRole"("AccessRoleID") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupplierUser" ADD CONSTRAINT "SupplierUser_AccessRoleID_fkey"
  FOREIGN KEY ("AccessRoleID") REFERENCES "AccessRole"("AccessRoleID") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TenantAccessRoleMenuPermission" ADD CONSTRAINT "TenantAccessRoleMenuPermission_AccessRoleID_fkey"
  FOREIGN KEY ("AccessRoleID") REFERENCES "AccessRole"("AccessRoleID") ON DELETE CASCADE ON UPDATE CASCADE;
