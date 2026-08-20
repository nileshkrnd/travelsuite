import type { RateTypeGroup } from "@/types";

export interface RateTypeGroupRow {
  rateTypeGroupId: bigint | number;
  rateTypeGroupCode: string;
  rateTypeGroupName: string;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  tenantId: number | null;
  companyId: number | null;
  companyName?: string | null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

export function toAppRateTypeGroup(row: RateTypeGroupRow): RateTypeGroup {
  return {
    rateTypeGroupId: Number(row.rateTypeGroupId),
    rateTypeGroupCode: row.rateTypeGroupCode,
    rateTypeGroupName: row.rateTypeGroupName,
    displayOrder: row.displayOrder,
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
