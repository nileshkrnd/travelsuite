import type { Supplier } from "@/types";

export interface SupplierRow {
  supplierId: bigint | number;
  tenantId: number;
  companyId: number;
  supplierCode: string;
  supplierName: string;
  supplierLegalName: string;
  supplierTypeId: bigint | number;
  registrationNumber: string | null;
  taxVatNumber: string | null;
  countryId: number;
  stateId: number | null;
  cityId: number;
  address: string;
  postalCode: string | null;
  website: string | null;
  currencyId: number;
  timeZoneId: number;
  requiresExtranetAccess: boolean;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  companyName?: string | null;
  supplierType?: { supplierTypeName: string } | null;
  country?: { countryName: string } | null;
  state?: { stateName: string } | null;
  city?: { cityName: string } | null;
  currency?: { currencyCode: string } | null;
}

function toIso(value: Date | string): string {
  return typeof value === "string" ? value : value.toISOString();
}

export function toAppSupplier(row: SupplierRow): Supplier {
  const supplierKey = Number(row.supplierId);
  return {
    id: String(supplierKey),
    supplierKey,
    tenantKey: row.tenantId,
    companyKey: row.companyId,
    code: row.supplierCode,
    name: row.supplierName,
    legalName: row.supplierLegalName,
    supplierTypeId: Number(row.supplierTypeId),
    supplierTypeName: row.supplierType?.supplierTypeName,
    registrationNumber: row.registrationNumber,
    taxVatNumber: row.taxVatNumber,
    countryId: row.countryId,
    countryName: row.country?.countryName,
    stateId: row.stateId,
    stateName: row.state?.stateName,
    cityId: row.cityId,
    cityName: row.city?.cityName,
    address: row.address,
    postalCode: row.postalCode,
    website: row.website,
    currencyId: row.currencyId,
    currencyCode: row.currency?.currencyCode,
    timeZoneId: row.timeZoneId,
    requiresExtranetAccess: row.requiresExtranetAccess,
    isActive: row.isActive,
    companyName: row.companyName ?? undefined,
    createdBy: row.createdBy,
    createdAt: toIso(row.createdDtTm),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: row.modifiedDtTm == null ? null : toIso(row.modifiedDtTm),
  };
}
