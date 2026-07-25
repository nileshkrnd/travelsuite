import type { BranchType } from "@/types";

export interface BranchTypeRow {
  branchTypeId: number;
  branchTypeName: string;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  tenantId: number;
  companyId: number;
  companyName?: string | null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

export function toAppBranchType(row: BranchTypeRow): BranchType {
  return {
    branchTypeId: row.branchTypeId,
    branchTypeName: row.branchTypeName,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdDtTm: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
    tenantId: row.tenantId,
    companyId: row.companyId,
    companyName: row.companyName ?? undefined,
  };
}
