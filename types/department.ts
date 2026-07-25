/** Department master — scoped by TenantID + CompanyID. */
export interface Department {
  departmentId: number;
  departmentCode: string;
  departmentName: string;
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
