import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Tenant } from "@/types";
import { DEFAULT_TENANT_ID, tenants } from "@/mock/data/tenants";

interface TenantState {
  tenantId: string;
  tenant: Tenant;
  setTenant: (tenantId: string) => void;
  updateTenant: (patch: Partial<Omit<Tenant, "id" | "slug">>) => void;
}

const defaultTenant = tenants.find((t) => t.id === DEFAULT_TENANT_ID)!;

export const useTenantStore = create<TenantState>()(
  persist(
    (set) => ({
      tenantId: defaultTenant.id,
      tenant: defaultTenant,
      setTenant: (tenantId) => {
        const tenant = tenants.find((t) => t.id === tenantId);
        if (tenant) set({ tenantId, tenant });
      },
      updateTenant: (patch) => {
        set((state) => ({
          tenant: {
            ...state.tenant,
            ...patch,
            branding: { ...state.tenant.branding, ...patch.branding },
          },
        }));
      },
    }),
    { name: "travelsuite.tenant" }
  )
);
