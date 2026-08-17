export interface MarketGroup {
  id: string;
  marketGroupKey: number;
  tenantKey: number;
  companyKey: number;
  marketGroupCode: string;
  marketGroupName: string;
  isActive: boolean;
  createdBy: number;
  createdAt: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
