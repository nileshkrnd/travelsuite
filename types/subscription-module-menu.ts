/** Menus linked to a Subscription Module (Super Admin / Tenant Configuration). */
export interface SubscriptionModuleMenu {
  subscriptionModuleMenuId: number;
  subscriptionModuleId: number;
  parentMenuId: number | null;
  menuName: string;
  menuUrl: string;
  menuIcon: string;
  sortOrder: number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
  /** Joined display fields */
  subscriptionModuleName?: string;
  subscriptionProductName?: string;
  parentMenuName?: string;
  /** Module display priority (from SubscriptionModule.SortOrder). */
  moduleSortOrder?: number;
  /** Products that unlock this Administration menu (empty = common). */
  subscriptionProductIds?: number[];
  linkedProductNames?: string[];
}
