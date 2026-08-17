export interface MarketType {
  id: string;
  marketTypeKey: number;
  tenantKey: number;
  companyKey: number;
  marketTypeCode: string;
  marketTypeName: string;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdAt: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
