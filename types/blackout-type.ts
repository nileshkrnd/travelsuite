export interface BlackoutType {
  id: string;
  blackoutTypeKey: number;
  tenantKey: number;
  companyKey: number;
  blackoutTypeCode: string;
  blackoutTypeName: string;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdAt: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
