/** Cash / walk-in customer type master — Retail, Walk-In. */
export interface CashCustomerType {
  cashCustomerTypeId: number;
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
