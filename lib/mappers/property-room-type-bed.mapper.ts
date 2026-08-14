import type { PropertyRoomTypeBed } from "@/types";

export interface PropertyRoomTypeBedRow {
  propertyRoomTypeBedId: bigint | number;
  tenantId: number;
  companyId: number;
  propertyRoomId: bigint | number;
  bedTypeId: bigint | number;
  bedCount: number;
  isExtraBed: boolean;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  bedType?: { bedTypeCode: string; bedTypeName: string } | null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

export function toAppPropertyRoomTypeBed(row: PropertyRoomTypeBedRow): PropertyRoomTypeBed {
  return {
    id: String(row.propertyRoomTypeBedId),
    propertyRoomTypeBedKey: Number(row.propertyRoomTypeBedId),
    tenantKey: row.tenantId,
    companyKey: row.companyId,
    propertyRoomId: Number(row.propertyRoomId),
    bedTypeId: Number(row.bedTypeId),
    bedTypeCode: row.bedType?.bedTypeCode,
    bedTypeName: row.bedType?.bedTypeName,
    bedCount: row.bedCount,
    isExtraBed: row.isExtraBed,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdAt: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
  };
}
