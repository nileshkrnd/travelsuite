import type { Company } from "@/types";

export interface CompanyRow {
  companyId: number;
  companyUid: string;
  companyGroupId: number | null;
  companyCode: string;
  companyName: string;
  address1: string;
  address2: string;
  countryId: number;
  cityId: number;
  currencyId: number;
  zipCode: string;
  countryDialCode: string;
  contactNumber: string | null;
  fax: string | null;
  contactPerson: string | null;
  emailAddress: string | null;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  isRoundOff: boolean;
  noOfSignificantDigits: number;
  isDisplayNumberInThousands: boolean | null;
  tenantId: number;
  companyLogo: string;
  companyFavIcon: string;
  country?: { countryName: string } | null;
  city?: { cityName: string } | null;
  currency?: { currencyCode: string } | null;
  tenantUid?: string;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

export function toAppCompany(row: CompanyRow): Company {
  return {
    id: row.companyUid,
    companyKey: row.companyId,
    tenantId: row.tenantUid ?? `tenant_${row.tenantId}`,
    tenantKey: row.tenantId,
    companyGroupId: row.companyGroupId,
    code: row.companyCode,
    name: row.companyName,
    address1: row.address1,
    address2: row.address2,
    countryId: row.countryId,
    cityId: row.cityId,
    currencyId: row.currencyId,
    zipCode: row.zipCode,
    countryDialCode: row.countryDialCode,
    contactNumber: row.contactNumber,
    fax: row.fax,
    contactPerson: row.contactPerson,
    emailAddress: row.emailAddress,
    isActive: row.isActive,
    status: row.isActive ? "active" : "inactive",
    isRoundOff: row.isRoundOff,
    noOfSignificantDigits: row.noOfSignificantDigits,
    isDisplayNumberInThousands: row.isDisplayNumberInThousands,
    companyLogo: row.companyLogo,
    companyFavIcon: row.companyFavIcon,
    createdBy: row.createdBy,
    createdAt: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
    countryName: row.country?.countryName,
    cityName: row.city?.cityName,
    currencyCode: row.currency?.currencyCode,
  };
}
