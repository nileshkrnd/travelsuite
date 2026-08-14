export interface StopSaleType {
  id: string;
  stopSaleTypeKey: number;
  tenantKey: number;
  companyKey: number;
  stopSaleTypeCode: string;
  stopSaleTypeName: string;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdAt: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
