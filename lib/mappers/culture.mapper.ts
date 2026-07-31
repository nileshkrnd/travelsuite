import type { Culture } from "@/types";

export interface CultureRow {
  cultureId: number;
  cultureCode: string;
  cultureName: string;
  direction: string;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
}

function toIso(value: Date | string): string {
  return typeof value === "string" ? value : value.toISOString();
}

export function toAppCulture(row: CultureRow): Culture {
  return {
    id: `culture_${row.cultureId}`,
    cultureKey: row.cultureId,
    code: row.cultureCode,
    name: row.cultureName,
    direction: row.direction === "rtl" ? "rtl" : "ltr",
    isActive: row.isActive,
    createdAt: toIso(row.createdDtTm),
    modifiedAt: row.modifiedDtTm ? toIso(row.modifiedDtTm) : null,
  };
}
