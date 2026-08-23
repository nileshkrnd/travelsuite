/** B2B customer type master — Corporate, Sub-Agent. */
export interface B2BCustomerType {
  b2bCustomerTypeId: number;
  tenantId: number;
  companyId: number;
  customerTypeCode: string;
  customerTypeName: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
