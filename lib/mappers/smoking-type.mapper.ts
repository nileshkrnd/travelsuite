import type { SmokingType } from "@/types";

export interface SmokingTypeRow {
  smokingTypeId: number;
  smokingTypeCode: string;
  smokingTypeName: string;
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

export function toAppSmokingType(row: SmokingTypeRow): SmokingType {
  return {
    id: String(row.smokingTypeId),
    smokingTypeKey: row.smokingTypeId,
    code: row.smokingTypeCode,
    name: row.smokingTypeName,
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
