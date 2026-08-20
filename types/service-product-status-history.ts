/** Append-only audit log entry of a Service Product's status transitions. */
export interface ServiceProductStatusHistory {
  serviceProductStatusHistoryId: number;
  serviceProductId: number;
  fromCommonStatusId: number | null;
  fromStatusName?: string;
  toCommonStatusId: number;
  toStatusName?: string;
  remarks: string | null;
  changedBy: number;
  changedDtTm: string;
}
