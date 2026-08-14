import type { PropertyRoomTypeExtraBed } from "@/types";

export interface PropertyRoomTypeExtraBedRow {
  propertyRoomTypeExtraBedId: bigint | number;
  tenantId: number;
  companyId: number;
  propertyRoomId: bigint | number;
  extraBedTypeId: bigint | number;
  maxQuantity: number;
  adultAllowed: boolean;
  childAllowed: boolean;
  isComplimentary: boolean;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  extraBedType?: { bedTypeCode: string; bedTypeName: string } | null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

export function toAppPropertyRoomTypeExtraBed(row: PropertyRoomTypeExtraBedRow): PropertyRoomTypeExtraBed {
  return {
    id: String(row.propertyRoomTypeExtraBedId),
    propertyRoomTypeExtraBedKey: Number(row.propertyRoomTypeExtraBedId),
    tenantKey: row.tenantId,
    companyKey: row.companyId,
    propertyRoomId: Number(row.propertyRoomId),
    extraBedTypeId: Number(row.extraBedTypeId),
    extraBedTypeCode: row.extraBedType?.bedTypeCode,
    extraBedTypeName: row.extraBedType?.bedTypeName,
    maxQuantity: row.maxQuantity,
    adultAllowed: row.adultAllowed,
    childAllowed: row.childAllowed,
    isComplimentary: row.isComplimentary,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdAt: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
  };
}
