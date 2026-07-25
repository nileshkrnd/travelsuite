import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SaasModuleId, SaasPlanId } from "@/config/saasCatalog";
import type { CurrencyCode } from "@/types";

export interface TenantSubscription {
  id: string;
  tenantId: string;
  organizationName: string;
  tenantSlug: string;
  groupName: string;
  adminName: string;
  adminEmail: string;
  planId: SaasPlanId;
  moduleIds: SaasModuleId[];
  monthlyTotal: number;
  currency: CurrencyCode;
  status: "trial" | "active" | "pending";
  createdAt: string;
}

export interface RegisterSubscriptionInput {
  organizationName: string;
  tenantSlug: string;
  groupName?: string;
  adminName: string;
  adminEmail: string;
  planId: SaasPlanId;
  moduleIds: SaasModuleId[];
  monthlyTotal: number;
  country: string;
  city: string;
  phone: string;
  dialCode: string;
}

interface SubscriptionsState {
  subscriptions: TenantSubscription[];
  register: (input: RegisterSubscriptionInput & { tenantId: string }) => TenantSubscription;
}

export const useSubscriptionsStore = create<SubscriptionsState>()(
  persist(
    (set) => ({
      subscriptions: [],

      register: (input) => {
        const subscription: TenantSubscription = {
          id: `sub_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
          tenantId: input.tenantId,
          organizationName: input.organizationName,
          tenantSlug: input.tenantSlug,
          groupName: input.groupName?.trim() || input.organizationName,
          adminName: input.adminName,
          adminEmail: input.adminEmail,
          planId: input.planId,
          moduleIds: input.moduleIds,
          monthlyTotal: input.monthlyTotal,
          currency: "USD",
          status: "trial",
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ subscriptions: [subscription, ...state.subscriptions] }));
        return subscription;
      },
    }),
    { name: "travelsuite.subscriptions", version: 1 }
  )
);
