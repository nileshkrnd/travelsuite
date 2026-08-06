import type { SupplierTypeMaster } from "@/types";

export interface SupplierTypeRow {
  supplierTypeId: number;
  supplierTypeName: string;
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

export function toAppSupplierType(row: SupplierTypeRow): SupplierTypeMaster {
  return {
    id: String(row.supplierTypeId),
    typeKey: row.supplierTypeId,
    name: row.supplierTypeName,
    isActive: row.isActive,
    isDeleted: row.isDeleted,
    createdBy: row.createdBy,
    createdAt: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
  };
}
