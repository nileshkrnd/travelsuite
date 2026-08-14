import type { MediaCategory } from "@/types";

export interface MediaCategoryRow {
  mediaCategoryId: number;
  name: string;
  displayOrder: number;
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

export function toAppMediaCategory(row: MediaCategoryRow): MediaCategory {
  return {
    id: String(row.mediaCategoryId),
    mediaCategoryKey: row.mediaCategoryId,
    name: row.name,
    displayOrder: row.displayOrder,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdAt: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
  };
}
