import type { ServiceProductStatusHistory } from "@/types";

export interface ServiceProductStatusHistoryRow {
  serviceProductStatusHistoryId: bigint | number;
  serviceProductId: bigint | number;
  fromCommonStatusId: bigint | number | null;
  toCommonStatusId: bigint | number;
  remarks: string | null;
  changedBy: number;
  changedDtTm: Date | string;
  fromStatus?: { statusName: string } | null;
  toStatus?: { statusName: string } | null;
}

function toIso(value: Date | string): string {
  return typeof value === "string" ? value : value.toISOString();
}

export function toAppServiceProductStatusHistory(row: ServiceProductStatusHistoryRow): ServiceProductStatusHistory {
  return {
    serviceProductStatusHistoryId: Number(row.serviceProductStatusHistoryId),
    serviceProductId: Number(row.serviceProductId),
    fromCommonStatusId: row.fromCommonStatusId != null ? Number(row.fromCommonStatusId) : null,
    fromStatusName: row.fromStatus?.statusName ?? undefined,
    toCommonStatusId: Number(row.toCommonStatusId),
    toStatusName: row.toStatus?.statusName ?? undefined,
    remarks: row.remarks,
    changedBy: row.changedBy,
    changedDtTm: toIso(row.changedDtTm),
  };
}
