/** A status value within a status-type lifecycle (Draft, Under Review, Approved, Published, …). */
export interface CommonStatus {
  commonStatusId: number;
  commonStatusTypeId: number;
  statusTypeName?: string;
  statusCode: string;
  statusName: string;
  description: string | null;
  displayOrder: number;
  isInitial: boolean;
  isFinal: boolean;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
  tenantId: number | null;
  companyId: number | null;
  companyName?: string;
}
