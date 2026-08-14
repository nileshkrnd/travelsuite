/** Standard promotion benefit type catalog — used for seeding and the contract promotion form. */
export type PromotionBenefitTypeCatalogEntry = {
  code: string;
  name: string;
};

export const DEFAULT_PROMOTION_BENEFIT_TYPES: PromotionBenefitTypeCatalogEntry[] = [
  { code: "PERCENTAGE_DISCOUNT", name: "Percentage Discount" },
  { code: "FIXED_DISCOUNT", name: "Fixed Discount" },
  { code: "FREE_NIGHT", name: "Free Night" },
  { code: "STAY_PAY", name: "Stay X Pay Y" },
  { code: "FREE_UPGRADE", name: "Free Room Upgrade" },
  { code: "MEAL_UPGRADE", name: "Meal Upgrade" },
  { code: "FREE_MEAL", name: "Free Meal" },
  { code: "FREE_TRANSFER", name: "Free Transfer" },
];

export function promotionBenefitNeedsValue(code: string): boolean {
  const upper = code.toUpperCase();
  return upper === "PERCENTAGE_DISCOUNT" || upper === "FIXED_DISCOUNT";
}

export function promotionBenefitNeedsStayPay(code: string): boolean {
  return code.toUpperCase() === "STAY_PAY";
}

export function promotionBenefitNeedsFreeNights(code: string): boolean {
  return code.toUpperCase() === "FREE_NIGHT";
}

export function promotionBenefitNeedsUpgradeRoom(code: string): boolean {
  return code.toUpperCase() === "FREE_UPGRADE";
}

export function promotionBenefitNeedsMealUpgrade(code: string): boolean {
  const upper = code.toUpperCase();
  return upper === "MEAL_UPGRADE" || upper === "FREE_MEAL";
}
