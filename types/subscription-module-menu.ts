/** Menus linked to a Subscription Module (Super Admin / Tenant Configuration). */
export interface SubscriptionModuleMenu {
  subscriptionModuleMenuId: number;
  subscriptionModuleId: number;
  menuName: string;
  menuUrl: string;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
  /** Joined display fields */
  subscriptionModuleName?: string;
  subscriptionProductName?: string;
}
