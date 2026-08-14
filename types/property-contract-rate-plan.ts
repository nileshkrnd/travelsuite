/** Rate plan on a property contract — FIT-BB, Corporate-HB, … */
export interface PropertyContractRatePlan {
  id: string;
  propertyContractRatePlanKey: number;
  tenantKey: number;
  companyKey: number;
  propertyContractId: number;
  contractNumber?: string;
  contractName?: string;
  propertyId?: number;
  propertyName?: string;
  ratePlanCode: string;
  ratePlanName: string;
  ratePlanTypeId: number;
  ratePlanTypeCode?: string;
  ratePlanTypeName?: string;
  mealPlanId: number;
  mealPlanCode?: string;
  mealPlanName?: string;
  rateBasisId: number;
  rateBasisCode?: string;
  rateBasisName?: string;
  isActive: boolean;
  displayOrder: number;
  createdBy: number;
  createdAt: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
