/** A single property this employee has been granted access to (part of a grant that isn't "all properties"). */
export interface EmployeeGrantedProperty {
  propertyId: number;
  propertyCode?: string;
  propertyName?: string;
}

/**
 * An employee's property-access grant — either every property (isAllProperties)
 * or an explicit multi-select list. One logical grant per employee, backed by
 * one-or-many EmployeePropertyAccess rows (PropertyID = NULL means "all properties").
 */
export interface EmployeePropertyGrant {
  employeeId: number;
  employeeName?: string;
  tenantKey: number;
  companyKey: number;
  isAllProperties: boolean;
  properties: EmployeeGrantedProperty[];
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
