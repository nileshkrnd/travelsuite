/** Global Subscription Product master (Super Admin / Tenant Configuration). */
export interface SubscriptionProduct {
  subscriptionProductId: number;
  subscriptionProductName: string;
  description: string;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
}
