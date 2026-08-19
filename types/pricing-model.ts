/** Pricing model master — Per Person, Per Adult, Per Vehicle, Flat, … */
export interface PricingModel {
  pricingModelId: number;
  pricingModelCode: string;
  pricingModelName: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
  tenantId: number | null;
  companyId: number | null;
  companyName?: string;
}
