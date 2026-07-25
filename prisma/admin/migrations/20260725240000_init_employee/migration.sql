-- CreateTable
CREATE TABLE "Employee" (
    "EmployeeID" SERIAL NOT NULL,
    "Title" VARCHAR(10) NOT NULL,
    "FirstName" VARCHAR(50) NOT NULL,
    "LastName" VARCHAR(50) NOT NULL,
    "Gender" VARCHAR(10) NOT NULL,
    "CountryDialCode" VARCHAR(5) NOT NULL,
    "PhoneNumber" VARCHAR(20) NOT NULL,
    "FaxNumber" VARCHAR(50),
    "Email" VARCHAR(50) NOT NULL,
    "Address" VARCHAR(50) NOT NULL,
    "CountryID" INTEGER NOT NULL,
    "CityID" INTEGER NOT NULL,
    "EmployeeNumber" VARCHAR(50) NOT NULL,
    "DesignationId" INTEGER NOT NULL,
    "JoiningDate" TIMESTAMPTZ(6) NOT NULL,
    "AccessRoleID" INTEGER NOT NULL,
    "DepartmentID" INTEGER,
    "ReportingEmployeeID" INTEGER,
    "CompanyID" INTEGER NOT NULL,
    "BranchID" INTEGER NOT NULL,
    "UserID" INTEGER NOT NULL,
    "EmployeeImage" VARCHAR(100),
    "TenantID" INTEGER NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("EmployeeID")
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_UserID_key" ON "Employee"("UserID");

-- CreateIndex
CREATE INDEX "Employee_TenantID_CompanyID_idx" ON "Employee"("TenantID", "CompanyID");

-- CreateIndex
CREATE INDEX "Employee_BranchID_idx" ON "Employee"("BranchID");

-- CreateIndex
CREATE INDEX "Employee_DepartmentID_idx" ON "Employee"("DepartmentID");

-- CreateIndex
CREATE INDEX "Employee_DesignationId_idx" ON "Employee"("DesignationId");

-- CreateIndex
CREATE INDEX "Employee_AccessRoleID_idx" ON "Employee"("AccessRoleID");

-- CreateIndex
CREATE INDEX "Employee_CountryID_idx" ON "Employee"("CountryID");

-- CreateIndex
CREATE INDEX "Employee_CityID_idx" ON "Employee"("CityID");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_Tenant_Company_Number_key" ON "Employee"("TenantID", "CompanyID", "EmployeeNumber");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_CountryID_fkey" FOREIGN KEY ("CountryID") REFERENCES "Country"("CountryID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_CityID_fkey" FOREIGN KEY ("CityID") REFERENCES "City"("CityID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_DesignationId_fkey" FOREIGN KEY ("DesignationId") REFERENCES "Designation"("DesignationID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_AccessRoleID_fkey" FOREIGN KEY ("AccessRoleID") REFERENCES "AccessRole"("AccessRoleID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_DepartmentID_fkey" FOREIGN KEY ("DepartmentID") REFERENCES "Department"("DepartmentID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_ReportingEmployeeID_fkey" FOREIGN KEY ("ReportingEmployeeID") REFERENCES "Employee"("EmployeeID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_CompanyID_fkey" FOREIGN KEY ("CompanyID") REFERENCES "Company"("CompanyID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_BranchID_fkey" FOREIGN KEY ("BranchID") REFERENCES "Branch"("BranchID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "User"("UserID") ON DELETE RESTRICT ON UPDATE CASCADE;
