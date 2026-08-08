/** Grants an Employee explicit access to a Property (view/create/edit/submit/approve). */
export interface EmployeePropertyAccess {
  id: string;
  employeePropertyAccessKey: number;
  tenantKey: number;
  companyKey: number;
  employeeId: number;
  employeeName?: string;
  propertyId: number;
  propertyCode?: string;
  propertyName?: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canSubmit: boolean;
  canApprove: boolean;
  isActive: boolean;
  /** YYYY-MM-DD */
  validFrom: string | null;
  /** YYYY-MM-DD */
  validTo: string | null;
  createdBy: number;
  createdAt: string;
}
