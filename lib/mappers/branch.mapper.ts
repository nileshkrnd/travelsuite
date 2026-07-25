import type { Branch, BranchType } from "@/types";

export interface BranchTypeRow {
  branchTypeId: number;
  branchTypeName: string;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
}

export interface BranchRow {
  branchId: number;
  branchUid: string;
  branchTypeId: number;
  branchName: string;
  companyId: number;
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
  company?: { companyUid: string; companyName: string; tenantId: number } | null;
  country?: { countryName: string } | null;
  city?: { cityName: string } | null;
  tenantUid?: string;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

export function toAppBranchType(row: BranchTypeRow): BranchType {
  return {
    id: String(row.branchTypeId),
    branchTypeKey: row.branchTypeId,
    name: row.branchTypeName,
    status: row.isActive ? "active" : "inactive",
    createdAt: toIso(row.createdDtTm) ?? new Date().toISOString(),
  };
}

export function toAppBranch(row: BranchRow): Branch {
  const isActive = row.isActive ?? true;
  return {
    id: row.branchUid,
    branchKey: row.branchId,
    tenantId: row.tenantUid ?? `tenant_${row.company?.tenantId ?? 0}`,
    tenantKey: row.company?.tenantId ?? 0,
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
