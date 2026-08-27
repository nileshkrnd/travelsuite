import type { PropertyTenant } from "@/types";

export interface PropertyTenantRow {
  propertyTenantId: bigint | number;
  tenantId: number;
  companyId: number;
  tenantCode: string;
  propertyTenantTypeId: bigint | number;
  tenantName: string;
  legalName: string | null;
  registrationNumber: string | null;
  taxRegistrationNumber: string | null;
  nationalityId: number | null;
  countryOfResidenceId: number | null;
  countryId: number;
  cityId: number | null;
  contactPersonName: string | null;
  email: string | null;
  mobileCountryCode: string | null;
  mobileNumber: string | null;
  statusId: bigint | number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  tenantType?: { tenantTypeName: string } | null;
  nationality?: { countryName: string } | null;
  countryOfResidence?: { countryName: string } | null;
  country?: { countryName: string } | null;
  city?: { cityName: string } | null;
  status?: { statusName: string } | null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

export function toAppPropertyTenant(row: PropertyTenantRow): PropertyTenant {
  return {
    propertyTenantId: Number(row.propertyTenantId),
    tenantId: row.tenantId,
    companyId: row.companyId,
    tenantCode: row.tenantCode,
    propertyTenantTypeId: Number(row.propertyTenantTypeId),
    tenantTypeName: row.tenantType?.tenantTypeName ?? undefined,
    tenantName: row.tenantName,
    legalName: row.legalName,
    registrationNumber: row.registrationNumber,
    taxRegistrationNumber: row.taxRegistrationNumber,
    nationalityId: row.nationalityId,
    nationalityName: row.nationality?.countryName ?? undefined,
    countryOfResidenceId: row.countryOfResidenceId,
    countryOfResidenceName: row.countryOfResidence?.countryName ?? undefined,
    countryId: row.countryId,
    countryName: row.country?.countryName ?? undefined,
    cityId: row.cityId,
    cityName: row.city?.cityName ?? undefined,
    contactPersonName: row.contactPersonName,
    email: row.email,
    mobileCountryCode: row.mobileCountryCode,
    mobileNumber: row.mobileNumber,
    statusId: Number(row.statusId),
    statusName: row.status?.statusName ?? undefined,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdDtTm: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
  };
}
