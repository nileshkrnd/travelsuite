export interface BlackoutReason {
  id: string;
  blackoutReasonKey: number;
  tenantKey: number;
  companyKey: number;
  blackoutReasonCode: string;
  blackoutReasonName: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdAt: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
