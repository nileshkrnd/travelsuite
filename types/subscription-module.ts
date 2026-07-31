/** Global Subscription Module master (Super Admin / Tenant Configuration). */
export interface SubscriptionModule {
  subscriptionModuleId: number;
  subscriptionProductId: number;
  subscriptionModuleName: string;
  description: string;
  sortOrder: number;
  /** False = separate portal (B2B/CBT/…) — excluded from Admin/Super Admin sidebar. */
  showInMenu: boolean;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
  /** Joined product name for list/view display. */
  subscriptionProductName?: string;
}
