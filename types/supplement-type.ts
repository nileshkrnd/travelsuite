export interface SupplementType {
  id: string;
  supplementTypeKey: number;
  tenantKey: number;
  companyKey: number;
  supplementTypeCode: string;
  supplementTypeName: string;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdAt: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
