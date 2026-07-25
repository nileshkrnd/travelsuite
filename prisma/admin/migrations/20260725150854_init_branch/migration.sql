-- CreateTable
CREATE TABLE "BranchType" (
    "BranchTypeID" SERIAL NOT NULL,
    "BranchTypeName" VARCHAR(100) NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "BranchType_pkey" PRIMARY KEY ("BranchTypeID")
);

-- CreateTable
CREATE TABLE "Branch" (
    "BranchID" SERIAL NOT NULL,
    "BranchUid" VARCHAR(100) NOT NULL,
    "BranchTypeID" INTEGER NOT NULL,
    "BranchName" VARCHAR(100) NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "Address1" VARCHAR(200) NOT NULL,
    "Address2" VARCHAR(200),
    "CountryID" INTEGER NOT NULL,
    "CityID" INTEGER NOT NULL,
    "ZipCode" VARCHAR(10) NOT NULL,
    "ContactPerson" VARCHAR(200) NOT NULL,
    "EmailAddress" VARCHAR(100) NOT NULL,
    "CountryDialCode" VARCHAR(5) NOT NULL,
    "PhoneNumber" VARCHAR(20) NOT NULL,
    "FaxNumber" VARCHAR(20),
    "IsActive" BOOLEAN DEFAULT true,
    "CreatedBy" INTEGER,
    "CreatedDtTm" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("BranchID")
);

-- CreateIndex
CREATE UNIQUE INDEX "BranchType_BranchTypeName_key" ON "BranchType"("BranchTypeName");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_BranchUid_key" ON "Branch"("BranchUid");

-- CreateIndex
CREATE INDEX "Branch_CompanyID_idx" ON "Branch"("CompanyID");

-- CreateIndex
CREATE INDEX "Branch_BranchTypeID_idx" ON "Branch"("BranchTypeID");

-- CreateIndex
CREATE INDEX "Branch_CountryID_idx" ON "Branch"("CountryID");

-- CreateIndex
CREATE INDEX "Branch_CityID_idx" ON "Branch"("CityID");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_Company_Name_key" ON "Branch"("CompanyID", "BranchName");

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_BranchTypeID_fkey" FOREIGN KEY ("BranchTypeID") REFERENCES "BranchType"("BranchTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_CompanyID_fkey" FOREIGN KEY ("CompanyID") REFERENCES "Company"("CompanyID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_CountryID_fkey" FOREIGN KEY ("CountryID") REFERENCES "Country"("CountryID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_CityID_fkey" FOREIGN KEY ("CityID") REFERENCES "City"("CityID") ON DELETE RESTRICT ON UPDATE CASCADE;
