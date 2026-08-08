import type { BedType } from "@/types";

export interface BedTypeRow {
  bedTypeId: number;
  bedTypeCode: string;
  bedTypeName: string;
  bedSize: string | null;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  isDeleted: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

export function toAppBedType(row: BedTypeRow): BedType {
  return {
    id: String(row.bedTypeId),
    bedTypeKey: row.bedTypeId,
    code: row.bedTypeCode,
    name: row.bedTypeName,
    bedSize: row.bedSize,
    description: row.description,
    displayOrder: row.displayOrder,
    isActive: row.isActive,
    isDeleted: row.isDeleted,
    createdBy: row.createdBy,
    createdAt: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
  };
}
