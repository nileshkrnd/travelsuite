export interface CancellationPolicyType {
  id: string;
  cancellationPolicyTypeKey: number;
  tenantKey: number;
  companyKey: number;
  cancellationPolicyTypeCode: string;
  cancellationPolicyTypeName: string;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdAt: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
