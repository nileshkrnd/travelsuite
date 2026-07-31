/** Grants a subscription module to a tenant (Super Admin / Tenant Configuration). */
export interface SubscriptionModuleAccess {
  subscriptionModuleAccessId: number;
  subscriptionModuleId: number;
  tenantId: number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
  /** Joined display fields */
  subscriptionModuleName?: string;
  subscriptionProductName?: string;
  tenantName?: string;
  tenantCode?: string;
}
