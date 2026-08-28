/**
 * Seeds PaymentTermMaster, B2BCustomerType, B2BCustomerCategory, contact/address/document/credit
 * lookups, and B2B_CUSTOMER / B2B_CUSTOMER_DOCUMENT CommonStatus lifecycles.
 * Run: npx tsx scripts/seed-b2b-customer-lookups.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TENANT_ID = 1;
const COMPANY_ID = 1;
const CREATED_BY = 1;

const PAYMENT_TERMS: { code: string; name: string; days: number }[] = [
  { code: "IMMEDIATE", name: "Immediate", days: 0 },
  { code: "NET_7", name: "Net 7 Days", days: 7 },
  { code: "NET_15", name: "Net 15 Days", days: 15 },
  { code: "NET_30", name: "Net 30 Days", days: 30 },
  { code: "NET_45", name: "Net 45 Days", days: 45 },
  { code: "NET_60", name: "Net 60 Days", days: 60 },
  { code: "NET_90", name: "Net 90 Days", days: 90 },
];

const CUSTOMER_TYPES: { code: string; name: string; description: string }[] = [
  { code: "CORPORATE", name: "Corporate", description: "Corporate/business customer" },
  { code: "SUB_AGENT", name: "Sub-Agent", description: "Travel agency/sub-agent customer" },
];

const CATEGORIES_BY_TYPE: Record<string, { code: string; name: string }[]> = {
  CORPORATE: [
    { code: "GOVERNMENT", name: "Government" },
    { code: "PRIVATE", name: "Private" },
    { code: "SME", name: "SME" },
    { code: "MNC", name: "MNC" },
  ],
  SUB_AGENT: [
    { code: "TRAVEL_AGENCY", name: "Travel Agency" },
    { code: "TOUR_OPERATOR", name: "Tour Operator" },
    { code: "OTA", name: "OTA" },
    { code: "DMC", name: "DMC" },
    { code: "CONSOLIDATOR", name: "Consolidator" },
  ],
};

const B2B_CUSTOMER_STATUSES: { code: string; name: string; isInitial?: boolean; isFinal?: boolean }[] = [
  { code: "DRAFT", name: "Draft", isInitial: true },
  { code: "ACTIVE", name: "Active" },
  { code: "SUSPENDED", name: "Suspended" },
  { code: "BLACKLISTED", name: "Blacklisted", isFinal: true },
  { code: "CLOSED", name: "Closed", isFinal: true },
];

async function main() {
  for (const [index, item] of PAYMENT_TERMS.entries()) {
    const row = await prisma.paymentTermMaster.upsert({
      where: { tenantId_companyId_paymentTermCode: { tenantId: TENANT_ID, companyId: COMPANY_ID, paymentTermCode: item.code } },
      create: {
        tenantId: TENANT_ID,
        companyId: COMPANY_ID,
        paymentTermCode: item.code,
        paymentTermName: item.name,
        numberOfDays: item.days,
        displayOrder: index,
        isActive: true,
        createdBy: CREATED_BY,
      },
      update: { paymentTermName: item.name, numberOfDays: item.days, displayOrder: index, modifiedBy: CREATED_BY, modifiedDtTm: new Date() },
    });
    console.log("PaymentTermMaster", row.paymentTermCode, Number(row.paymentTermId));
  }

  const typeIdByCode = new Map<string, bigint>();
  for (const [index, item] of CUSTOMER_TYPES.entries()) {
    const row = await prisma.b2BCustomerType.upsert({
      where: { tenantId_companyId_customerTypeCode: { tenantId: TENANT_ID, companyId: COMPANY_ID, customerTypeCode: item.code } },
      create: {
        tenantId: TENANT_ID,
        companyId: COMPANY_ID,
        customerTypeCode: item.code,
        customerTypeName: item.name,
        description: item.description,
        displayOrder: index,
        isActive: true,
        createdBy: CREATED_BY,
      },
      update: { customerTypeName: item.name, description: item.description, displayOrder: index, modifiedBy: CREATED_BY, modifiedDtTm: new Date() },
    });
    typeIdByCode.set(item.code, row.b2bCustomerTypeId);
    console.log("B2BCustomerType", row.customerTypeCode, Number(row.b2bCustomerTypeId));
  }

  for (const [typeCode, categories] of Object.entries(CATEGORIES_BY_TYPE)) {
    const typeId = typeIdByCode.get(typeCode);
    if (!typeId) {
      console.error(`Type ${typeCode} not found — skipping its categories`);
      continue;
    }
    for (const [index, item] of categories.entries()) {
      const row = await prisma.b2BCustomerCategory.upsert({
        where: {
          tenantId_companyId_b2bCustomerTypeId_categoryCode: {
            tenantId: TENANT_ID,
            companyId: COMPANY_ID,
            b2bCustomerTypeId: typeId,
            categoryCode: item.code,
          },
        },
        create: {
          tenantId: TENANT_ID,
          companyId: COMPANY_ID,
          b2bCustomerTypeId: typeId,
          categoryCode: item.code,
          categoryName: item.name,
          displayOrder: index,
          isActive: true,
          createdBy: CREATED_BY,
        },
        update: { categoryName: item.name, displayOrder: index, modifiedBy: CREATED_BY, modifiedDtTm: new Date() },
      });
      console.log("B2BCustomerCategory", typeCode, "/", row.categoryCode, Number(row.b2bCustomerCategoryId));
    }
  }

  const statusType = await prisma.commonStatusType.upsert({
    where: { tenantId_companyId_statusTypeCode: { tenantId: TENANT_ID, companyId: COMPANY_ID, statusTypeCode: "B2B_CUSTOMER" } },
    create: { tenantId: TENANT_ID, companyId: COMPANY_ID, statusTypeCode: "B2B_CUSTOMER", statusTypeName: "B2B Customer", isActive: true, createdBy: CREATED_BY },
    update: { statusTypeName: "B2B Customer", modifiedBy: CREATED_BY, modifiedDtTm: new Date() },
  });
  console.log("CommonStatusType", statusType.statusTypeCode, Number(statusType.commonStatusTypeId));

  for (const [index, item] of B2B_CUSTOMER_STATUSES.entries()) {
    const row = await prisma.commonStatus.upsert({
      where: {
        tenantId_companyId_commonStatusTypeId_statusCode: {
          tenantId: TENANT_ID,
          companyId: COMPANY_ID,
          commonStatusTypeId: statusType.commonStatusTypeId,
          statusCode: item.code,
        },
      },
      create: {
        tenantId: TENANT_ID,
        companyId: COMPANY_ID,
        commonStatusTypeId: statusType.commonStatusTypeId,
        statusCode: item.code,
        statusName: item.name,
        displayOrder: index,
        isInitial: item.isInitial ?? false,
        isFinal: item.isFinal ?? false,
        isActive: true,
        createdBy: CREATED_BY,
      },
      update: {
        statusName: item.name,
        displayOrder: index,
        isInitial: item.isInitial ?? false,
        isFinal: item.isFinal ?? false,
        modifiedBy: CREATED_BY,
        modifiedDtTm: new Date(),
      },
    });
    console.log("CommonStatus B2B_CUSTOMER /", row.statusCode, Number(row.commonStatusId));
  }

  const CONTACT_TYPES = [
    { code: "MANAGEMENT", name: "Management" },
    { code: "SALES", name: "Sales" },
    { code: "RESERVATION", name: "Reservation" },
    { code: "OPERATIONS", name: "Operations" },
    { code: "ACCOUNTS", name: "Accounts" },
    { code: "FINANCE", name: "Finance" },
    { code: "CONTRACTING", name: "Contracting" },
    { code: "TECHNICAL", name: "Technical" },
    { code: "OTHER", name: "Other" },
  ];
  for (const [index, item] of CONTACT_TYPES.entries()) {
    const row = await prisma.b2BCustomerContactType.upsert({
      where: { tenantId_companyId_contactTypeCode: { tenantId: TENANT_ID, companyId: COMPANY_ID, contactTypeCode: item.code } },
      create: { tenantId: TENANT_ID, companyId: COMPANY_ID, contactTypeCode: item.code, contactTypeName: item.name, displayOrder: index, isActive: true, createdBy: CREATED_BY },
      update: { contactTypeName: item.name, displayOrder: index, modifiedBy: CREATED_BY, modifiedDtTm: new Date() },
    });
    console.log("B2BCustomerContactType", row.contactTypeCode, Number(row.b2bCustomerContactTypeId));
  }

  const ADDRESS_TYPES = [
    { code: "REGISTERED", name: "Registered" },
    { code: "OFFICE", name: "Office" },
    { code: "BILLING", name: "Billing" },
    { code: "MAILING", name: "Mailing" },
    { code: "RESIDENTIAL", name: "Residential" },
    { code: "BRANCH", name: "Branch" },
    { code: "OTHER", name: "Other" },
  ];
  for (const [index, item] of ADDRESS_TYPES.entries()) {
    const row = await prisma.addressTypeMaster.upsert({
      where: { tenantId_companyId_addressTypeCode: { tenantId: TENANT_ID, companyId: COMPANY_ID, addressTypeCode: item.code } },
      create: { tenantId: TENANT_ID, companyId: COMPANY_ID, addressTypeCode: item.code, addressTypeName: item.name, displayOrder: index, isActive: true, createdBy: CREATED_BY },
      update: { addressTypeName: item.name, displayOrder: index, modifiedBy: CREATED_BY, modifiedDtTm: new Date() },
    });
    console.log("AddressTypeMaster", row.addressTypeCode, Number(row.addressTypeId));
  }

  const DOCUMENT_TYPES = [
    { code: "COMMERCIAL_REGISTRATION", name: "Commercial Registration" },
    { code: "TRADE_LICENSE", name: "Trade License" },
    { code: "TAX_CERTIFICATE", name: "Tax Certificate" },
    { code: "AGENCY_LICENSE", name: "Agency License" },
    { code: "IATA_CERTIFICATE", name: "IATA Certificate" },
    { code: "BUSINESS_LICENSE", name: "Business License" },
    { code: "OTHER", name: "Other" },
  ];
  for (const [index, item] of DOCUMENT_TYPES.entries()) {
    const row = await prisma.b2BCustomerDocumentType.upsert({
      where: { tenantId_companyId_documentTypeCode: { tenantId: TENANT_ID, companyId: COMPANY_ID, documentTypeCode: item.code } },
      create: { tenantId: TENANT_ID, companyId: COMPANY_ID, documentTypeCode: item.code, documentTypeName: item.name, displayOrder: index, isActive: true, createdBy: CREATED_BY },
      update: { documentTypeName: item.name, displayOrder: index, modifiedBy: CREATED_BY, modifiedDtTm: new Date() },
    });
    console.log("B2BCustomerDocumentType", row.documentTypeCode, Number(row.documentTypeId));
  }

  const CREDIT_STATUSES = [
    { code: "PENDING", name: "Pending" },
    { code: "APPROVED", name: "Approved" },
    { code: "SUSPENDED", name: "Suspended" },
    { code: "EXPIRED", name: "Expired" },
    { code: "CLOSED", name: "Closed" },
  ];
  for (const [index, item] of CREDIT_STATUSES.entries()) {
    const row = await prisma.b2BCustomerCreditStatus.upsert({
      where: { tenantId_companyId_creditStatusCode: { tenantId: TENANT_ID, companyId: COMPANY_ID, creditStatusCode: item.code } },
      create: { tenantId: TENANT_ID, companyId: COMPANY_ID, creditStatusCode: item.code, creditStatusName: item.name, displayOrder: index, isActive: true, createdBy: CREATED_BY },
      update: { creditStatusName: item.name, displayOrder: index, modifiedBy: CREATED_BY, modifiedDtTm: new Date() },
    });
    console.log("B2BCustomerCreditStatus", row.creditStatusCode, Number(row.b2bCustomerCreditStatusId));
  }

  const docStatusType = await prisma.commonStatusType.upsert({
    where: { tenantId_companyId_statusTypeCode: { tenantId: TENANT_ID, companyId: COMPANY_ID, statusTypeCode: "B2B_CUSTOMER_DOCUMENT" } },
    create: { tenantId: TENANT_ID, companyId: COMPANY_ID, statusTypeCode: "B2B_CUSTOMER_DOCUMENT", statusTypeName: "B2B Customer Document", isActive: true, createdBy: CREATED_BY },
    update: { statusTypeName: "B2B Customer Document", modifiedBy: CREATED_BY, modifiedDtTm: new Date() },
  });
  const DOC_STATUSES: { code: string; name: string; isInitial?: boolean }[] = [
    { code: "PENDING", name: "Pending", isInitial: true },
    { code: "VERIFIED", name: "Verified" },
    { code: "EXPIRED", name: "Expired" },
    { code: "REJECTED", name: "Rejected" },
  ];
  for (const [index, item] of DOC_STATUSES.entries()) {
    const row = await prisma.commonStatus.upsert({
      where: {
        tenantId_companyId_commonStatusTypeId_statusCode: {
          tenantId: TENANT_ID,
          companyId: COMPANY_ID,
          commonStatusTypeId: docStatusType.commonStatusTypeId,
          statusCode: item.code,
        },
      },
      create: {
        tenantId: TENANT_ID,
        companyId: COMPANY_ID,
        commonStatusTypeId: docStatusType.commonStatusTypeId,
        statusCode: item.code,
        statusName: item.name,
        displayOrder: index,
        isInitial: item.isInitial ?? false,
        isActive: true,
        createdBy: CREATED_BY,
      },
      update: { statusName: item.name, displayOrder: index, isInitial: item.isInitial ?? false, modifiedBy: CREATED_BY, modifiedDtTm: new Date() },
    });
    console.log("CommonStatus B2B_CUSTOMER_DOCUMENT /", row.statusCode, Number(row.commonStatusId));
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
