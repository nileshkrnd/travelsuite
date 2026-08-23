/** B2B customer category master, scoped by B2B customer type (e.g. Government/Private/SME/MNC under Corporate). */
export interface B2BCustomerCategory {
  b2bCustomerCategoryId: number;
  tenantId: number;
  companyId: number;
  b2bCustomerTypeId: number;
  customerTypeName?: string;
  categoryCode: string;
  categoryName: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
