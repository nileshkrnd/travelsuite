import type { RatePlanType } from "@/types";

export interface RatePlanTypeRow {
  ratePlanTypeId: number;
  ratePlanTypeCode: string;
  ratePlanTypeName: string;
  description: string | null;
  displayOrder: number;
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

export function toAppRatePlanType(row: RatePlanTypeRow): RatePlanType {
  return {
    ratePlanTypeId: row.ratePlanTypeId,
    ratePlanTypeCode: row.ratePlanTypeCode,
    ratePlanTypeName: row.ratePlanTypeName,
    description: row.description,
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
