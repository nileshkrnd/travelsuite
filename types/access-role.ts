/** Access Role master — scoped by TenantID / CompanyID. */
export interface AccessRole {
  accessRoleId: number;
  accessRoleName: string;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
  tenantId: number;
  companyId: number;
}
