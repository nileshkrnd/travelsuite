import type { PropertyTenantAddress } from "@/types";

export interface PropertyTenantAddressRow {
  propertyTenantAddressId: bigint | number;
  propertyTenantId: bigint | number;
  propertyTenantAddressTypeId: bigint | number;
  addressLine1: string;
  addressLine2: string | null;
  area: string | null;
  countryId: number;
  stateId: number | null;
  cityId: number | null;
  postalCode: string | null;
  isPrimary: boolean;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  addressType?: { addressTypeName: string } | null;
  country?: { countryName: string } | null;
  state?: { stateName: string } | null;
  city?: { cityName: string } | null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

export function toAppPropertyTenantAddress(row: PropertyTenantAddressRow): PropertyTenantAddress {
  return {
    propertyTenantAddressId: Number(row.propertyTenantAddressId),
    propertyTenantId: Number(row.propertyTenantId),
    propertyTenantAddressTypeId: Number(row.propertyTenantAddressTypeId),
    addressTypeName: row.addressType?.addressTypeName ?? undefined,
    addressLine1: row.addressLine1,
    addressLine2: row.addressLine2,
    area: row.area,
    countryId: row.countryId,
    countryName: row.country?.countryName ?? undefined,
    stateId: row.stateId,
    stateName: row.state?.stateName ?? undefined,
    cityId: row.cityId,
    cityName: row.city?.cityName ?? undefined,
    postalCode: row.postalCode,
    isPrimary: row.isPrimary,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdDtTm: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
  };
}
