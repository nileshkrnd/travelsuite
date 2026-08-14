export interface ChildPolicyType {
  id: string;
  childPolicyTypeKey: number;
  tenantKey: number;
  companyKey: number;
  childPolicyTypeCode: string;
  childPolicyTypeName: string;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdAt: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
