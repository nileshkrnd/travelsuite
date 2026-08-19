import type { CommonStatusType } from "@/types";

export interface CommonStatusTypeRow {
  commonStatusTypeId: bigint | number;
  statusTypeCode: string;
  statusTypeName: string;
  description: string | null;
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

export function toAppCommonStatusType(row: CommonStatusTypeRow): CommonStatusType {
  return {
    commonStatusTypeId: Number(row.commonStatusTypeId),
    statusTypeCode: row.statusTypeCode,
    statusTypeName: row.statusTypeName,
    description: row.description,
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
