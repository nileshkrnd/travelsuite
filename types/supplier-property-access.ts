/** Grants a Supplier's portal user rate-management access to one Property↔Supplier link. */
export interface SupplierPropertyAccess {
  id: string;
  supplierPropertyAccessKey: number;
  tenantKey: number;
  companyKey: number;
  propertySupplierId: number;
  propertyName?: string;
  supplierName?: string;
  userKey: number;
  userName?: string;
  canView: boolean;
  canCreateRate: boolean;
  canEditRate: boolean;
  canSubmitRate: boolean;
  canApproveRate: boolean;
  isActive: boolean;
  /** YYYY-MM-DD */
  validFrom: string | null;
  /** YYYY-MM-DD */
  validTo: string | null;
  createdBy: number;
  createdAt: string;
}
