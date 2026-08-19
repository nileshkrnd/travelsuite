import type { CommonStatus } from "@/types";

export interface CommonStatusRow {
  commonStatusId: bigint | number;
  commonStatusTypeId: bigint | number;
  statusCode: string;
  statusName: string;
  description: string | null;
  displayOrder: number;
  isInitial: boolean;
  isFinal: boolean;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  tenantId: number | null;
  companyId: number | null;
  companyName?: string | null;
  statusType?: { statusTypeName: string } | null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

export function toAppCommonStatus(row: CommonStatusRow): CommonStatus {
  return {
    commonStatusId: Number(row.commonStatusId),
    commonStatusTypeId: Number(row.commonStatusTypeId),
    statusTypeName: row.statusType?.statusTypeName ?? undefined,
    statusCode: row.statusCode,
    statusName: row.statusName,
    description: row.description,
    displayOrder: row.displayOrder,
    isInitial: row.isInitial,
    isFinal: row.isFinal,
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
