/** Designation master — scoped by TenantID + CompanyID. */
export interface Designation {
  designationId: number;
  designationCode: string;
  designationName: string;
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
