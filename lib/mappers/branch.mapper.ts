import type { Branch } from "@/types";

export interface BranchRow {
  branchId: number;
  branchUid: string;
  branchTypeId: number;
  branchName: string;
  companyId: number;
  tenantId: number;
  address1: string;
  address2: string | null;
  countryId: number;
  cityId: number;
  zipCode: string;
  contactPerson: string;
  emailAddress: string;
  countryDialCode: string;
  phoneNumber: string;
  faxNumber: string | null;
  isActive: boolean | null;
  createdBy: number | null;
  createdDtTm: Date | string | null;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  branchType?: { branchTypeName: string } | null;
  company?: { companyUid: string; companyName: string; tenantId?: number } | null;
  country?: { countryName: string } | null;
  city?: { cityName: string } | null;
  tenantUid?: string;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

export function toAppBranch(row: BranchRow): Branch {
  const isActive = row.isActive ?? true;
  const tenantKey = row.tenantId || row.company?.tenantId || 0;
  return {
    id: row.branchUid,
    branchKey: row.branchId,
    tenantId: row.tenantUid ?? `tenant_${tenantKey}`,
    tenantKey,
    companyId: row.company?.companyUid ?? `company_${row.companyId}`,
    companyKey: row.companyId,
    branchTypeId: row.branchTypeId,
    name: row.branchName,
    address1: row.address1,
    address2: row.address2 ?? "",
    countryId: row.countryId,
    cityId: row.cityId,
    zipCode: row.zipCode,
    contactPerson: row.contactPerson,
    emailAddress: row.emailAddress,
    countryDialCode: row.countryDialCode,
    phoneNumber: row.phoneNumber,
    faxNumber: row.faxNumber,
    isActive,
    status: isActive ? "active" : "inactive",
    createdBy: row.createdBy,
    createdAt: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
    branchTypeName: row.branchType?.branchTypeName,
    companyName: row.company?.companyName,
    countryName: row.country?.countryName,
    cityName: row.city?.cityName,
  };
}
