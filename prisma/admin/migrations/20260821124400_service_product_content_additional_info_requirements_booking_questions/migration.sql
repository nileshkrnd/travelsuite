-- CreateTable
CREATE TABLE "ContentSectionTypeMaster" (
    "ContentSectionTypeID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER,
    "CompanyID" INTEGER,
    "SectionTypeCode" VARCHAR(50) NOT NULL,
    "SectionTypeName" VARCHAR(150) NOT NULL,
    "Description" VARCHAR(500),
    "IsStepBased" BOOLEAN NOT NULL DEFAULT false,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "ContentSectionTypeMaster_pkey" PRIMARY KEY ("ContentSectionTypeID")
);

-- CreateTable
CREATE TABLE "ServiceProductContentSection" (
    "ServiceProductContentSectionID" BIGSERIAL NOT NULL,
    "ServiceProductID" BIGINT NOT NULL,
    "ContentSectionTypeID" BIGINT NOT NULL,
    "SectionTitle" VARCHAR(250) NOT NULL,
    "SectionDescription" TEXT,
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "ServiceProductContentSection_pkey" PRIMARY KEY ("ServiceProductContentSectionID")
);

-- CreateTable
CREATE TABLE "ServiceProductContentSectionItem" (
    "ServiceProductContentSectionItemID" BIGSERIAL NOT NULL,
    "ServiceProductContentSectionID" BIGINT NOT NULL,
    "ItemTitle" VARCHAR(250) NOT NULL,
    "ItemDescription" TEXT,
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "ServiceProductContentSectionItem_pkey" PRIMARY KEY ("ServiceProductContentSectionItemID")
);

-- CreateTable
CREATE TABLE "ServiceProductContentSectionItemPoint" (
    "ServiceProductContentSectionItemPointID" BIGSERIAL NOT NULL,
    "ServiceProductContentSectionItemID" BIGINT NOT NULL,
    "PointText" VARCHAR(2000) NOT NULL,
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "ServiceProductContentSectionItemPoint_pkey" PRIMARY KEY ("ServiceProductContentSectionItemPointID")
);

-- CreateTable
CREATE TABLE "AdditionalInfoTypeMaster" (
    "AdditionalInfoTypeID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER,
    "CompanyID" INTEGER,
    "InfoTypeCode" VARCHAR(50) NOT NULL,
    "InfoTypeName" VARCHAR(200) NOT NULL,
    "Description" VARCHAR(500),
    "ValueTypeCode" VARCHAR(30) NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "AdditionalInfoTypeMaster_pkey" PRIMARY KEY ("AdditionalInfoTypeID")
);

-- CreateTable
CREATE TABLE "ServiceProductAdditionalInfo" (
    "ServiceProductAdditionalInfoID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "ServiceProductID" BIGINT NOT NULL,
    "ServiceProductOptionID" BIGINT,
    "ServiceProductVariantID" BIGINT,
    "AdditionalInfoTypeID" BIGINT NOT NULL,
    "ValueBoolean" BOOLEAN,
    "ValueText" VARCHAR(2000),
    "ValueNumber" DECIMAL(18,4),
    "ValueDate" DATE,
    "ValueTime" TIME,
    "ValueDateTime" TIMESTAMPTZ(6),
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "ServiceProductAdditionalInfo_pkey" PRIMARY KEY ("ServiceProductAdditionalInfoID")
);

-- CreateTable
CREATE TABLE "RequirementTypeMaster" (
    "RequirementTypeID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER,
    "CompanyID" INTEGER,
    "RequirementTypeCode" VARCHAR(50) NOT NULL,
    "RequirementTypeName" VARCHAR(150) NOT NULL,
    "Description" VARCHAR(500),
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "RequirementTypeMaster_pkey" PRIMARY KEY ("RequirementTypeID")
);

-- CreateTable
CREATE TABLE "ServiceProductRequirement" (
    "ServiceProductRequirementID" BIGSERIAL NOT NULL,
    "ServiceProductID" BIGINT NOT NULL,
    "ServiceProductOptionID" BIGINT,
    "ServiceProductVariantID" BIGINT,
    "RequirementTypeID" BIGINT NOT NULL,
    "RequirementName" VARCHAR(250) NOT NULL,
    "Description" VARCHAR(2000),
    "IsMandatory" BOOLEAN NOT NULL DEFAULT false,
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "ServiceProductRequirement_pkey" PRIMARY KEY ("ServiceProductRequirementID")
);

-- CreateTable
CREATE TABLE "BookingQuestionTypeMaster" (
    "BookingQuestionTypeID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER,
    "CompanyID" INTEGER,
    "QuestionTypeCode" VARCHAR(50) NOT NULL,
    "QuestionTypeName" VARCHAR(150) NOT NULL,
    "Description" VARCHAR(500),
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "BookingQuestionTypeMaster_pkey" PRIMARY KEY ("BookingQuestionTypeID")
);

-- CreateTable
CREATE TABLE "BookingQuestionRequirementMaster" (
    "BookingQuestionRequirementID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER,
    "CompanyID" INTEGER,
    "RequirementCode" VARCHAR(30) NOT NULL,
    "RequirementName" VARCHAR(100) NOT NULL,
    "Description" VARCHAR(500),
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "BookingQuestionRequirementMaster_pkey" PRIMARY KEY ("BookingQuestionRequirementID")
);

-- CreateTable
CREATE TABLE "BookingQuestionOperatorMaster" (
    "BookingQuestionOperatorID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER,
    "CompanyID" INTEGER,
    "OperatorCode" VARCHAR(30) NOT NULL,
    "OperatorName" VARCHAR(100) NOT NULL,
    "Description" VARCHAR(500),
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "BookingQuestionOperatorMaster_pkey" PRIMARY KEY ("BookingQuestionOperatorID")
);

-- CreateTable
CREATE TABLE "ServiceProductBookingQuestion" (
    "ServiceProductBookingQuestionID" BIGSERIAL NOT NULL,
    "ServiceProductID" BIGINT NOT NULL,
    "ServiceProductOptionID" BIGINT,
    "ServiceProductVariantID" BIGINT,
    "QuestionCode" VARCHAR(50) NOT NULL,
    "QuestionText" VARCHAR(1000) NOT NULL,
    "BookingQuestionTypeID" BIGINT NOT NULL,
    "BookingQuestionRequirementID" BIGINT NOT NULL,
    "MaxLength" INTEGER,
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "ServiceProductBookingQuestion_pkey" PRIMARY KEY ("ServiceProductBookingQuestionID")
);

-- CreateTable
CREATE TABLE "ServiceProductBookingQuestionOption" (
    "ServiceProductBookingQuestionOptionID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "ServiceProductBookingQuestionID" BIGINT NOT NULL,
    "OptionCode" VARCHAR(50) NOT NULL,
    "OptionName" VARCHAR(250) NOT NULL,
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "ServiceProductBookingQuestionOption_pkey" PRIMARY KEY ("ServiceProductBookingQuestionOptionID")
);

-- CreateTable
CREATE TABLE "ServiceProductBookingQuestionRule" (
    "ServiceProductBookingQuestionRuleID" BIGSERIAL NOT NULL,
    "TenantID" INTEGER NOT NULL,
    "CompanyID" INTEGER NOT NULL,
    "ServiceProductBookingQuestionID" BIGINT NOT NULL,
    "ParentQuestionID" BIGINT NOT NULL,
    "ParentQuestionOptionID" BIGINT,
    "BookingQuestionOperatorID" BIGINT NOT NULL,
    "ComparisonValue" VARCHAR(500),
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "ServiceProductBookingQuestionRule_pkey" PRIMARY KEY ("ServiceProductBookingQuestionRuleID")
);

-- CreateIndex
CREATE INDEX "ContentSectionType_TenantID_CompanyID_idx" ON "ContentSectionTypeMaster"("TenantID", "CompanyID");

-- CreateIndex
CREATE UNIQUE INDEX "ContentSectionType_Tenant_Company_Code_key" ON "ContentSectionTypeMaster"("TenantID", "CompanyID", "SectionTypeCode");

-- CreateIndex
CREATE INDEX "SvcProductContentSection_ProductID_idx" ON "ServiceProductContentSection"("ServiceProductID");

-- CreateIndex
CREATE INDEX "SvcProductContentSection_TypeID_idx" ON "ServiceProductContentSection"("ContentSectionTypeID");

-- CreateIndex
CREATE INDEX "SvcProductContentSectionItem_SectionID_idx" ON "ServiceProductContentSectionItem"("ServiceProductContentSectionID");

-- CreateIndex
CREATE INDEX "SvcProductContentSectionItemPoint_ItemID_idx" ON "ServiceProductContentSectionItemPoint"("ServiceProductContentSectionItemID");

-- CreateIndex
CREATE INDEX "AdditionalInfoType_TenantID_CompanyID_idx" ON "AdditionalInfoTypeMaster"("TenantID", "CompanyID");

-- CreateIndex
CREATE UNIQUE INDEX "AdditionalInfoType_Tenant_Company_Code_key" ON "AdditionalInfoTypeMaster"("TenantID", "CompanyID", "InfoTypeCode");

-- CreateIndex
CREATE INDEX "SvcProductAdditionalInfo_ProductID_idx" ON "ServiceProductAdditionalInfo"("ServiceProductID");

-- CreateIndex
CREATE INDEX "SvcProductAdditionalInfo_OptionID_idx" ON "ServiceProductAdditionalInfo"("ServiceProductOptionID");

-- CreateIndex
CREATE INDEX "SvcProductAdditionalInfo_VariantID_idx" ON "ServiceProductAdditionalInfo"("ServiceProductVariantID");

-- CreateIndex
CREATE INDEX "SvcProductAdditionalInfo_TypeID_idx" ON "ServiceProductAdditionalInfo"("AdditionalInfoTypeID");

-- CreateIndex
CREATE INDEX "RequirementType_TenantID_CompanyID_idx" ON "RequirementTypeMaster"("TenantID", "CompanyID");

-- CreateIndex
CREATE UNIQUE INDEX "RequirementType_Tenant_Company_Code_key" ON "RequirementTypeMaster"("TenantID", "CompanyID", "RequirementTypeCode");

-- CreateIndex
CREATE INDEX "SvcProductRequirement_ProductID_idx" ON "ServiceProductRequirement"("ServiceProductID");

-- CreateIndex
CREATE INDEX "SvcProductRequirement_OptionID_idx" ON "ServiceProductRequirement"("ServiceProductOptionID");

-- CreateIndex
CREATE INDEX "SvcProductRequirement_VariantID_idx" ON "ServiceProductRequirement"("ServiceProductVariantID");

-- CreateIndex
CREATE INDEX "SvcProductRequirement_TypeID_idx" ON "ServiceProductRequirement"("RequirementTypeID");

-- CreateIndex
CREATE INDEX "BookingQuestionType_TenantID_CompanyID_idx" ON "BookingQuestionTypeMaster"("TenantID", "CompanyID");

-- CreateIndex
CREATE UNIQUE INDEX "BookingQuestionType_Tenant_Company_Code_key" ON "BookingQuestionTypeMaster"("TenantID", "CompanyID", "QuestionTypeCode");

-- CreateIndex
CREATE INDEX "BookingQuestionRequirement_TenantID_CompanyID_idx" ON "BookingQuestionRequirementMaster"("TenantID", "CompanyID");

-- CreateIndex
CREATE UNIQUE INDEX "BookingQuestionRequirement_Tenant_Company_Code_key" ON "BookingQuestionRequirementMaster"("TenantID", "CompanyID", "RequirementCode");

-- CreateIndex
CREATE INDEX "BookingQuestionOperator_TenantID_CompanyID_idx" ON "BookingQuestionOperatorMaster"("TenantID", "CompanyID");

-- CreateIndex
CREATE UNIQUE INDEX "BookingQuestionOperator_Tenant_Company_Code_key" ON "BookingQuestionOperatorMaster"("TenantID", "CompanyID", "OperatorCode");

-- CreateIndex
CREATE INDEX "SvcProductBookingQuestion_ProductID_idx" ON "ServiceProductBookingQuestion"("ServiceProductID");

-- CreateIndex
CREATE INDEX "SvcProductBookingQuestion_OptionID_idx" ON "ServiceProductBookingQuestion"("ServiceProductOptionID");

-- CreateIndex
CREATE INDEX "SvcProductBookingQuestion_VariantID_idx" ON "ServiceProductBookingQuestion"("ServiceProductVariantID");

-- CreateIndex
CREATE INDEX "SvcProductBookingQuestion_TypeID_idx" ON "ServiceProductBookingQuestion"("BookingQuestionTypeID");

-- CreateIndex
CREATE INDEX "SvcProductBookingQuestion_RequirementID_idx" ON "ServiceProductBookingQuestion"("BookingQuestionRequirementID");

-- CreateIndex
CREATE INDEX "SvcProductBookingQuestionOption_QuestionID_idx" ON "ServiceProductBookingQuestionOption"("ServiceProductBookingQuestionID");

-- CreateIndex
CREATE INDEX "SvcProductBookingQuestionRule_QuestionID_idx" ON "ServiceProductBookingQuestionRule"("ServiceProductBookingQuestionID");

-- CreateIndex
CREATE INDEX "SvcProductBookingQuestionRule_ParentQuestionID_idx" ON "ServiceProductBookingQuestionRule"("ParentQuestionID");

-- CreateIndex
CREATE INDEX "SvcProductBookingQuestionRule_ParentOptionID_idx" ON "ServiceProductBookingQuestionRule"("ParentQuestionOptionID");

-- CreateIndex
CREATE INDEX "SvcProductBookingQuestionRule_OperatorID_idx" ON "ServiceProductBookingQuestionRule"("BookingQuestionOperatorID");

-- AddForeignKey
ALTER TABLE "ServiceProductContentSection" ADD CONSTRAINT "ServiceProductContentSection_ServiceProductID_fkey" FOREIGN KEY ("ServiceProductID") REFERENCES "ServiceProduct"("ServiceProductID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductContentSection" ADD CONSTRAINT "ServiceProductContentSection_ContentSectionTypeID_fkey" FOREIGN KEY ("ContentSectionTypeID") REFERENCES "ContentSectionTypeMaster"("ContentSectionTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductContentSectionItem" ADD CONSTRAINT "ServiceProductContentSectionItem_ServiceProductContentSect_fkey" FOREIGN KEY ("ServiceProductContentSectionID") REFERENCES "ServiceProductContentSection"("ServiceProductContentSectionID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductContentSectionItemPoint" ADD CONSTRAINT "ServiceProductContentSectionItemPoint_ServiceProductConten_fkey" FOREIGN KEY ("ServiceProductContentSectionItemID") REFERENCES "ServiceProductContentSectionItem"("ServiceProductContentSectionItemID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductAdditionalInfo" ADD CONSTRAINT "ServiceProductAdditionalInfo_ServiceProductID_fkey" FOREIGN KEY ("ServiceProductID") REFERENCES "ServiceProduct"("ServiceProductID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductAdditionalInfo" ADD CONSTRAINT "ServiceProductAdditionalInfo_ServiceProductOptionID_fkey" FOREIGN KEY ("ServiceProductOptionID") REFERENCES "ServiceProductOption"("ServiceProductOptionID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductAdditionalInfo" ADD CONSTRAINT "ServiceProductAdditionalInfo_ServiceProductVariantID_fkey" FOREIGN KEY ("ServiceProductVariantID") REFERENCES "ServiceProductVariant"("ServiceProductVariantID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductAdditionalInfo" ADD CONSTRAINT "ServiceProductAdditionalInfo_AdditionalInfoTypeID_fkey" FOREIGN KEY ("AdditionalInfoTypeID") REFERENCES "AdditionalInfoTypeMaster"("AdditionalInfoTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductRequirement" ADD CONSTRAINT "ServiceProductRequirement_ServiceProductID_fkey" FOREIGN KEY ("ServiceProductID") REFERENCES "ServiceProduct"("ServiceProductID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductRequirement" ADD CONSTRAINT "ServiceProductRequirement_ServiceProductOptionID_fkey" FOREIGN KEY ("ServiceProductOptionID") REFERENCES "ServiceProductOption"("ServiceProductOptionID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductRequirement" ADD CONSTRAINT "ServiceProductRequirement_ServiceProductVariantID_fkey" FOREIGN KEY ("ServiceProductVariantID") REFERENCES "ServiceProductVariant"("ServiceProductVariantID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductRequirement" ADD CONSTRAINT "ServiceProductRequirement_RequirementTypeID_fkey" FOREIGN KEY ("RequirementTypeID") REFERENCES "RequirementTypeMaster"("RequirementTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductBookingQuestion" ADD CONSTRAINT "ServiceProductBookingQuestion_ServiceProductID_fkey" FOREIGN KEY ("ServiceProductID") REFERENCES "ServiceProduct"("ServiceProductID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductBookingQuestion" ADD CONSTRAINT "ServiceProductBookingQuestion_ServiceProductOptionID_fkey" FOREIGN KEY ("ServiceProductOptionID") REFERENCES "ServiceProductOption"("ServiceProductOptionID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductBookingQuestion" ADD CONSTRAINT "ServiceProductBookingQuestion_ServiceProductVariantID_fkey" FOREIGN KEY ("ServiceProductVariantID") REFERENCES "ServiceProductVariant"("ServiceProductVariantID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductBookingQuestion" ADD CONSTRAINT "ServiceProductBookingQuestion_BookingQuestionTypeID_fkey" FOREIGN KEY ("BookingQuestionTypeID") REFERENCES "BookingQuestionTypeMaster"("BookingQuestionTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductBookingQuestion" ADD CONSTRAINT "ServiceProductBookingQuestion_BookingQuestionRequirementID_fkey" FOREIGN KEY ("BookingQuestionRequirementID") REFERENCES "BookingQuestionRequirementMaster"("BookingQuestionRequirementID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductBookingQuestionOption" ADD CONSTRAINT "ServiceProductBookingQuestionOption_ServiceProductBookingQ_fkey" FOREIGN KEY ("ServiceProductBookingQuestionID") REFERENCES "ServiceProductBookingQuestion"("ServiceProductBookingQuestionID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductBookingQuestionRule" ADD CONSTRAINT "ServiceProductBookingQuestionRule_ServiceProductBookingQue_fkey" FOREIGN KEY ("ServiceProductBookingQuestionID") REFERENCES "ServiceProductBookingQuestion"("ServiceProductBookingQuestionID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductBookingQuestionRule" ADD CONSTRAINT "ServiceProductBookingQuestionRule_ParentQuestionID_fkey" FOREIGN KEY ("ParentQuestionID") REFERENCES "ServiceProductBookingQuestion"("ServiceProductBookingQuestionID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductBookingQuestionRule" ADD CONSTRAINT "ServiceProductBookingQuestionRule_ParentQuestionOptionID_fkey" FOREIGN KEY ("ParentQuestionOptionID") REFERENCES "ServiceProductBookingQuestionOption"("ServiceProductBookingQuestionOptionID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductBookingQuestionRule" ADD CONSTRAINT "ServiceProductBookingQuestionRule_BookingQuestionOperatorI_fkey" FOREIGN KEY ("BookingQuestionOperatorID") REFERENCES "BookingQuestionOperatorMaster"("BookingQuestionOperatorID") ON DELETE RESTRICT ON UPDATE CASCADE;
