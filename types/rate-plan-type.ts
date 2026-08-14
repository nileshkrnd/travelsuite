/** Rate Plan Type master — FIT, Corporate, Group, … Scoped by TenantID + CompanyID. */
export interface RatePlanType {
  ratePlanTypeId: number;
  ratePlanTypeCode: string;
  ratePlanTypeName: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
  tenantId: number;
  companyId: number;
  /** Optional display name when company join is available. */
  companyName?: string;
}
