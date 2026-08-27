/**
 * Seeds PropertyTenantTypeMaster, IdentityDocumentTypeMaster, IdentityDocumentCountryMaster,
 * PropertyTenantAddressTypeMaster (all global), and the PROPERTY_TENANT
 * CommonStatusType/CommonStatus lifecycle for the primary dev tenant/company.
 * Run: npx tsx scripts/seed-property-tenant-lookups.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TENANT_ID = 1;
const COMPANY_ID = 1;
const CREATED_BY = 1;

const TENANT_TYPES: { code: string; name: string }[] = [
  { code: "INDIVIDUAL", name: "Individual" },
  { code: "COMPANY", name: "Company" },
  { code: "GOVERNMENT", name: "Government" },
  { code: "OTHER", name: "Other" },
];

const DOCUMENT_TYPES: { code: string; name: string }[] = [
  { code: "NATIONAL_ID", name: "National ID" },
  { code: "PASSPORT", name: "Passport" },
  { code: "RESIDENCE_PERMIT", name: "Residence Permit" },
  { code: "DRIVING_LICENSE", name: "Driving License" },
  { code: "OTHER", name: "Other" },
];

const DOCUMENT_COUNTRY_ROWS: { country: string; typeCode: string; displayName: string; shortName: string }[] = [
  { country: "Qatar", typeCode: "NATIONAL_ID", displayName: "Qatar ID", shortName: "QID" },
  { country: "United Arab Emirates", typeCode: "NATIONAL_ID", displayName: "Emirates ID", shortName: "EID" },
  { country: "India", typeCode: "NATIONAL_ID", displayName: "Aadhaar Card", shortName: "Aadhaar" },
  { country: "Saudi Arabia", typeCode: "NATIONAL_ID", displayName: "National ID", shortName: "NID" },
  { country: "Qatar", typeCode: "PASSPORT", displayName: "Passport", shortName: "Passport" },
  { country: "United Arab Emirates", typeCode: "PASSPORT", displayName: "Passport", shortName: "Passport" },
];

const ADDRESS_TYPES: { code: string; name: string }[] = [
  { code: "HOME", name: "Home" },
  { code: "WORK", name: "Work" },
  { code: "REGISTERED_OFFICE", name: "Registered Office" },
  { code: "MAILING", name: "Mailing" },
];

const PROPERTY_TENANT_STATUSES: { code: string; name: string; isInitial?: boolean; isFinal?: boolean }[] = [
  { code: "DRAFT", name: "Draft", isInitial: true },
  { code: "PENDING_VERIFICATION", name: "Pending Verification" },
  { code: "ACTIVE", name: "Active" },
  { code: "SUSPENDED", name: "Suspended" },
  { code: "CLOSED", name: "Closed", isFinal: true },
];

const DOCUMENT_STATUSES: { code: string; name: string; isInitial?: boolean; isFinal?: boolean }[] = [
  { code: "PENDING", name: "Pending Verification", isInitial: true },
  { code: "VERIFIED", name: "Verified" },
  { code: "REJECTED", name: "Rejected" },
  { code: "EXPIRED", name: "Expired", isFinal: true },
];

async function main() {
  for (const [index, item] of TENANT_TYPES.entries()) {
    const row = await prisma.propertyTenantTypeMaster.upsert({
      where: { tenantTypeCode: item.code },
      create: { tenantTypeCode: item.code, tenantTypeName: item.name, displayOrder: index, isActive: true, createdBy: CREATED_BY },
      update: { tenantTypeName: item.name, displayOrder: index, modifiedBy: CREATED_BY, modifiedDtTm: new Date() },
    });
    console.log("PropertyTenantTypeMaster", row.tenantTypeCode, Number(row.propertyTenantTypeId));
  }

  const docTypeIdByCode = new Map<string, bigint>();
  for (const item of DOCUMENT_TYPES) {
    const row = await prisma.identityDocumentTypeMaster.upsert({
      where: { documentTypeCode: item.code },
      create: { documentTypeCode: item.code, documentTypeName: item.name, isActive: true, createdBy: CREATED_BY },
      update: { documentTypeName: item.name, modifiedBy: CREATED_BY, modifiedDtTm: new Date() },
    });
    docTypeIdByCode.set(item.code, row.identityDocumentTypeId);
    console.log("IdentityDocumentTypeMaster", row.documentTypeCode, Number(row.identityDocumentTypeId));
  }

  for (const item of DOCUMENT_COUNTRY_ROWS) {
    const country = await prisma.country.findFirst({ where: { countryName: item.country } });
    const typeId = docTypeIdByCode.get(item.typeCode);
    if (!country || !typeId) {
      console.error(`Skipping ${item.country}/${item.typeCode} — country or type not found`);
      continue;
    }
    const row = await prisma.identityDocumentCountryMaster.upsert({
      where: { identityDocumentTypeId_countryId: { identityDocumentTypeId: typeId, countryId: country.countryId } },
      create: {
        identityDocumentTypeId: typeId,
        countryId: country.countryId,
        documentDisplayName: item.displayName,
        documentShortName: item.shortName,
        isActive: true,
        createdBy: CREATED_BY,
      },
      update: { documentDisplayName: item.displayName, documentShortName: item.shortName, modifiedBy: CREATED_BY, modifiedDtTm: new Date() },
    });
    console.log("IdentityDocumentCountryMaster", item.country, "/", item.typeCode, Number(row.identityDocumentCountryId));
  }

  for (const item of ADDRESS_TYPES) {
    const row = await prisma.propertyTenantAddressTypeMaster.upsert({
      where: { addressTypeCode: item.code },
      create: { addressTypeCode: item.code, addressTypeName: item.name, isActive: true, createdBy: CREATED_BY },
      update: { addressTypeName: item.name, modifiedBy: CREATED_BY, modifiedDtTm: new Date() },
    });
    console.log("PropertyTenantAddressTypeMaster", row.addressTypeCode, Number(row.propertyTenantAddressTypeId));
  }

  const tenantStatusType = await prisma.commonStatusType.upsert({
    where: { tenantId_companyId_statusTypeCode: { tenantId: TENANT_ID, companyId: COMPANY_ID, statusTypeCode: "PROPERTY_TENANT" } },
    create: { tenantId: TENANT_ID, companyId: COMPANY_ID, statusTypeCode: "PROPERTY_TENANT", statusTypeName: "Property Tenant", isActive: true, createdBy: CREATED_BY },
    update: { statusTypeName: "Property Tenant", modifiedBy: CREATED_BY, modifiedDtTm: new Date() },
  });
  console.log("CommonStatusType", tenantStatusType.statusTypeCode, Number(tenantStatusType.commonStatusTypeId));

  for (const [index, item] of PROPERTY_TENANT_STATUSES.entries()) {
    const row = await prisma.commonStatus.upsert({
      where: {
        tenantId_companyId_commonStatusTypeId_statusCode: {
          tenantId: TENANT_ID,
          companyId: COMPANY_ID,
          commonStatusTypeId: tenantStatusType.commonStatusTypeId,
          statusCode: item.code,
        },
      },
      create: {
        tenantId: TENANT_ID,
        companyId: COMPANY_ID,
        commonStatusTypeId: tenantStatusType.commonStatusTypeId,
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
    console.log("CommonStatus PROPERTY_TENANT /", row.statusCode, Number(row.commonStatusId));
  }

  const docStatusType = await prisma.commonStatusType.upsert({
    where: { tenantId_companyId_statusTypeCode: { tenantId: TENANT_ID, companyId: COMPANY_ID, statusTypeCode: "PROPERTY_TENANT_DOCUMENT" } },
    create: { tenantId: TENANT_ID, companyId: COMPANY_ID, statusTypeCode: "PROPERTY_TENANT_DOCUMENT", statusTypeName: "Property Tenant Document", isActive: true, createdBy: CREATED_BY },
    update: { statusTypeName: "Property Tenant Document", modifiedBy: CREATED_BY, modifiedDtTm: new Date() },
  });
  console.log("CommonStatusType", docStatusType.statusTypeCode, Number(docStatusType.commonStatusTypeId));

  for (const [index, item] of DOCUMENT_STATUSES.entries()) {
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
    console.log("CommonStatus PROPERTY_TENANT_DOCUMENT /", row.statusCode, Number(row.commonStatusId));
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
