/** Meal Plan master — RO, BB, HB, FB, AI, … Scoped by TenantID + CompanyID. */
export interface MealPlan {
  mealPlanId: number;
  mealPlanCode: string;
  mealPlanName: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
  tenantId: number;
  companyId: number;
  /** Optional display name when company join is available. */
  companyName?: string;
}
