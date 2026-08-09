-- Allow PropertyID = NULL to mean "access to all properties".
ALTER TABLE "EmployeePropertyAccess" DROP CONSTRAINT "EmployeePropertyAccess_PropertyID_fkey";
ALTER TABLE "EmployeePropertyAccess" ALTER COLUMN "PropertyID" DROP NOT NULL;
ALTER TABLE "EmployeePropertyAccess" ADD CONSTRAINT "EmployeePropertyAccess_PropertyID_fkey" FOREIGN KEY ("PropertyID") REFERENCES "Property"("PropertyID") ON DELETE CASCADE ON UPDATE CASCADE;

-- At most one "all properties" (PropertyID IS NULL) row per employee.
CREATE UNIQUE INDEX "EmployeePropertyAccess_Employee_AllProperties_key" ON "EmployeePropertyAccess"("EmployeeID") WHERE "PropertyID" IS NULL;
