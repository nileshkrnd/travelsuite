import type { GlobalCodeLookup } from "@/types";

export interface GlobalCodeLookupRow {
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  [key: string]: unknown;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

export function toAppGlobalCodeLookup(
  row: GlobalCodeLookupRow,
  idField: string,
  codeField: string,
  nameField: string
): GlobalCodeLookup {
  const key = Number(row[idField]);
  return {
    id: String(key),
    key,
    code: String(row[codeField] ?? ""),
    name: String(row[nameField] ?? ""),
    description: (row.description as string | null) ?? null,
    displayOrder: Number(row.displayOrder ?? 0),
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdAt: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
  };
}
