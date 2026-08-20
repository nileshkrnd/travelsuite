import type { RateType } from "@/types";

export interface RateTypeRow {
  rateTypeId: bigint | number;
  rateTypeCode: string;
  rateTypeName: string;
  description: string | null;
  rateTypeGroupId: bigint | number | null;
  isPaxType: boolean;
  isQuantityType: boolean;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  tenantId: number | null;
  companyId: number | null;
  companyName?: string | null;
  rateTypeGroup?: { rateTypeGroupName: string } | null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

export function toAppRateType(row: RateTypeRow): RateType {
  return {
    rateTypeId: Number(row.rateTypeId),
    rateTypeCode: row.rateTypeCode,
    rateTypeName: row.rateTypeName,
    description: row.description,
    rateTypeGroupId: row.rateTypeGroupId != null ? Number(row.rateTypeGroupId) : null,
    rateTypeGroupName: row.rateTypeGroup?.rateTypeGroupName ?? undefined,
    isPaxType: row.isPaxType,
    isQuantityType: row.isQuantityType,
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
