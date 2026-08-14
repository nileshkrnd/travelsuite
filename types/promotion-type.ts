export interface PromotionType {
  id: string;
  promotionTypeKey: number;
  tenantKey: number;
  companyKey: number;
  promotionTypeCode: string;
  promotionTypeName: string;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdAt: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
