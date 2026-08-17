export interface TaxType {
  id: string;
  taxTypeKey: number;
  tenantKey: number;
  companyKey: number;
  taxTypeCode: string;
  taxTypeName: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdAt: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
