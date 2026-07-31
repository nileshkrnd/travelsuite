/** Global Subscription Module master (Super Admin / Tenant Configuration). */
export interface SubscriptionModule {
  subscriptionModuleId: number;
  subscriptionProductId: number;
  subscriptionModuleName: string;
  description: string;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
  /** Joined product name for list/view display. */
  subscriptionProductName?: string;
}
