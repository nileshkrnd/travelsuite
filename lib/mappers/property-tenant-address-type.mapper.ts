import type { PropertyTenantAddressType } from "@/types";

export interface PropertyTenantAddressTypeRow {
  propertyTenantAddressTypeId: bigint | number;
  addressTypeCode: string;
  addressTypeName: string;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

export function toAppPropertyTenantAddressType(row: PropertyTenantAddressTypeRow): PropertyTenantAddressType {
  return {
    propertyTenantAddressTypeId: Number(row.propertyTenantAddressTypeId),
    addressTypeCode: row.addressTypeCode,
    addressTypeName: row.addressTypeName,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdDtTm: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
  };
}
