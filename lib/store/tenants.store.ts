import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CurrencyCode, Tenant, TenantAddress, TenantContact } from "@/types";
import { tenants as seedTenants, DEFAULT_BRANDING } from "@/mock/data/tenants";

export interface NewTenantInput {
  name: string;
  slug: string;
  defaultCurrency: CurrencyCode;
  address: TenantAddress;
  contact: TenantContact;
}

interface TenantsState {
  tenants: Tenant[];
  addTenant: (input: NewTenantInput) => Tenant;
  updateTenant: (id: string, patch: Partial<Omit<Tenant, "id">>) => void;
}

/** The registry of every tenant Super Admin has registered — distinct from tenant.store.ts,
 *  which tracks only the one tenant currently active for theming/login preview. */
export const useTenantsStore = create<TenantsState>()(
  persist(
    (set) => ({
      tenants: seedTenants,

      addTenant: (input) => {
        const tenant: Tenant = {
          id: `tenant_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
          slug: input.slug,
          branding: { name: input.name, logoUrl: "", primaryColor: DEFAULT_BRANDING.primaryColor },
          defaultCurrency: input.defaultCurrency,
          supportedCurrencies: [input.defaultCurrency],
          defaultLocale: "en",
          supportedLocales: ["en"],
          status: "active",
          createdAt: new Date().toISOString(),
          address: input.address,
          contact: input.contact,
        };
        set((state) => ({ tenants: [...state.tenants, tenant] }));
        return tenant;
      },

      updateTenant: (id, patch) => {
        set((state) => ({
          tenants: state.tenants.map((t) =>
            t.id === id
              ? {
                  ...t,
                  ...patch,
                  branding: { ...t.branding, ...patch.branding },
                  address: { ...t.address, ...patch.address },
                  contact: { ...t.contact, ...patch.contact },
                }
              : t
          ),
        }));
      },
    }),
    { name: "travelsuite.tenants" }
  )
);
