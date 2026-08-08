-- CreateTable
CREATE TABLE "PropertySupplier" (
    "PropertySupplierID" BIGSERIAL NOT NULL,
    "PropertyID" INTEGER NOT NULL,
    "SupplierID" BIGINT NOT NULL,
    "IsPrimary" BOOLEAN NOT NULL DEFAULT false,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "ValidFrom" DATE,
    "ValidTo" DATE,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertySupplier_pkey" PRIMARY KEY ("PropertySupplierID")
);

-- CreateTable
CREATE TABLE "SupplierUser" (
    "SupplierUserID" BIGSERIAL NOT NULL,
    "SupplierID" BIGINT NOT NULL,
    "FirstName" VARCHAR(100) NOT NULL,
    "LastName" VARCHAR(100) NOT NULL,
    "Email" VARCHAR(200) NOT NULL,
    "DialCountryCode" VARCHAR(10),
    "MobileNumber" VARCHAR(30),
    "AccessRoleID" INTEGER NOT NULL,
    "UserID" INTEGER NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedDate" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedBy" INTEGER NOT NULL,
    "UpdatedDate" TIMESTAMPTZ(6),
    "UpdatedBy" INTEGER,

    CONSTRAINT "SupplierUser_pkey" PRIMARY KEY ("SupplierUserID")
);

-- CreateTable
CREATE TABLE "SupplierPropertyAccess" (
    "SupplierPropertyAccessID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "PropertySupplierID" BIGINT NOT NULL,
    "UserID" INTEGER NOT NULL,
    "CanView" BOOLEAN NOT NULL DEFAULT true,
    "CanCreateRate" BOOLEAN NOT NULL DEFAULT false,
    "CanEditRate" BOOLEAN NOT NULL DEFAULT false,
    "CanSubmitRate" BOOLEAN NOT NULL DEFAULT false,
    "CanApproveRate" BOOLEAN NOT NULL DEFAULT false,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "ValidFrom" DATE,
    "ValidTo" DATE,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierPropertyAccess_pkey" PRIMARY KEY ("SupplierPropertyAccessID")
);

-- CreateTable
CREATE TABLE "EmployeePropertyAccess" (
    "EmployeePropertyAccessID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "EmployeeID" INTEGER NOT NULL,
    "PropertyID" INTEGER NOT NULL,
    "CanView" BOOLEAN NOT NULL DEFAULT true,
    "CanCreate" BOOLEAN NOT NULL DEFAULT false,
    "CanEdit" BOOLEAN NOT NULL DEFAULT false,
    "CanSubmit" BOOLEAN NOT NULL DEFAULT false,
    "CanApprove" BOOLEAN NOT NULL DEFAULT false,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "ValidFrom" DATE,
    "ValidTo" DATE,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeePropertyAccess_pkey" PRIMARY KEY ("EmployeePropertyAccessID")
);

-- CreateIndex
CREATE UNIQUE INDEX "PropertySupplier_Property_Supplier_key" ON "PropertySupplier"("PropertyID", "SupplierID");

-- CreateIndex
CREATE INDEX "PropertySupplier_SupplierID_idx" ON "PropertySupplier"("SupplierID");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierUser_UserID_key" ON "SupplierUser"("UserID");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierUser_Supplier_Email_key" ON "SupplierUser"("SupplierID", "Email");

-- CreateIndex
CREATE INDEX "SupplierUser_AccessRoleID_idx" ON "SupplierUser"("AccessRoleID");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierPropertyAccess_PropertySupplier_User_key" ON "SupplierPropertyAccess"("PropertySupplierID", "UserID");

-- CreateIndex
CREATE INDEX "SupplierPropertyAccess_UserID_idx" ON "SupplierPropertyAccess"("UserID");

-- CreateIndex
CREATE INDEX "SupplierPropertyAccess_TenantID_CompanyID_idx" ON "SupplierPropertyAccess"("TenantID", "CompanyID");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeePropertyAccess_Employee_Property_key" ON "EmployeePropertyAccess"("EmployeeID", "PropertyID");

-- CreateIndex
CREATE INDEX "EmployeePropertyAccess_PropertyID_idx" ON "EmployeePropertyAccess"("PropertyID");

-- CreateIndex
CREATE INDEX "EmployeePropertyAccess_TenantID_CompanyID_idx" ON "EmployeePropertyAccess"("TenantID", "CompanyID");

-- One primary supplier per property.
CREATE UNIQUE INDEX "PropertySupplier_OnePrimary_key" ON "PropertySupplier"("PropertyID") WHERE "IsPrimary" = true AND "IsActive" = true;

-- AddForeignKey
ALTER TABLE "PropertySupplier" ADD CONSTRAINT "PropertySupplier_PropertyID_fkey" FOREIGN KEY ("PropertyID") REFERENCES "Property"("PropertyID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertySupplier" ADD CONSTRAINT "PropertySupplier_SupplierID_fkey" FOREIGN KEY ("SupplierID") REFERENCES "Supplier"("SupplierID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierUser" ADD CONSTRAINT "SupplierUser_SupplierID_fkey" FOREIGN KEY ("SupplierID") REFERENCES "Supplier"("SupplierID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierUser" ADD CONSTRAINT "SupplierUser_AccessRoleID_fkey" FOREIGN KEY ("AccessRoleID") REFERENCES "AccessRole"("AccessRoleID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierUser" ADD CONSTRAINT "SupplierUser_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "User"("UserID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPropertyAccess" ADD CONSTRAINT "SupplierPropertyAccess_PropertySupplierID_fkey" FOREIGN KEY ("PropertySupplierID") REFERENCES "PropertySupplier"("PropertySupplierID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPropertyAccess" ADD CONSTRAINT "SupplierPropertyAccess_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "User"("UserID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeePropertyAccess" ADD CONSTRAINT "EmployeePropertyAccess_EmployeeID_fkey" FOREIGN KEY ("EmployeeID") REFERENCES "Employee"("EmployeeID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeePropertyAccess" ADD CONSTRAINT "EmployeePropertyAccess_PropertyID_fkey" FOREIGN KEY ("PropertyID") REFERENCES "Property"("PropertyID") ON DELETE CASCADE ON UPDATE CASCADE;
