export interface StopSaleReason {
  id: string;
  stopSaleReasonKey: number;
  tenantKey: number;
  companyKey: number;
  stopSaleReasonCode: string;
  stopSaleReasonName: string;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdAt: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
