import type { ViewType } from "@/types";

export interface ViewTypeRow {
  viewTypeId: number;
  viewTypeCode: string;
  viewTypeName: string;
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

export function toAppViewType(row: ViewTypeRow): ViewType {
  return {
    id: String(row.viewTypeId),
    viewTypeKey: row.viewTypeId,
    code: row.viewTypeCode,
    name: row.viewTypeName,
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
