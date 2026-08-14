/** Standard promotion type catalog — used for seeding and the contract promotion form. */
export type PromotionTypeCatalogEntry = {
  code: string;
  name: string;
};

export const DEFAULT_PROMOTION_TYPES: PromotionTypeCatalogEntry[] = [
  { code: "EARLY_BIRD", name: "Early Bird" },
  { code: "LAST_MINUTE", name: "Last Minute" },
  { code: "LONG_STAY", name: "Long Stay" },
  { code: "STAY_PAY", name: "Stay X Pay Y" },
  { code: "ROOM_UPGRADE", name: "Room Upgrade" },
  { code: "FREE_NIGHT", name: "Free Night" },
  { code: "PERCENTAGE", name: "Percentage Discount" },
  { code: "FIXED_DISCOUNT", name: "Fixed Discount" },
  { code: "MEAL_UPGRADE", name: "Meal Upgrade" },
  { code: "SPECIAL_OFFER", name: "Special Offer" },
];
