export interface PromotionBenefitType {
  id: string;
  promotionBenefitTypeKey: number;
  tenantKey: number;
  companyKey: number;
  promotionBenefitTypeCode: string;
  promotionBenefitTypeName: string;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdAt: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
