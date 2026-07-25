import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Tenant } from "@/types";
import { DEFAULT_PREVIEW_TENANT, tenants as seedTenants, DEFAULT_TENANT_ID } from "@/mock/data/tenants";
import { useTenantsStore } from "@/lib/store/tenants.store";

/** Platform / no-tenant workspace id used by Super Admin common settings. */
export const PLATFORM_TENANT_ID = DEFAULT_PREVIEW_TENANT.id;

interface TenantState {
  tenantId: string;
  tenant: Tenant;
  setTenant: (tenantId: string) => void;
  /** Looks up a tenant by its Tenant Code (slug), case-insensitive. Returns whether a match was found. */
  setTenantBySlug: (slug: string) => boolean;
  /** Resets to the neutral platform branding — used by the generic /login page before a tenant code is entered. */
  resetToDefaultBranding: () => void;
  /** Super Admin: leave a specific tenant and return to platform (common settings) mode. */
  clearTenantSelection: () => void;
}

const defaultTenant = seedTenants.find((t) => t.id === DEFAULT_TENANT_ID)!;

/** Looks up a tenant by its Tenant Code (slug) against the live registry, so newly registered tenants resolve too. */
export function findTenantBySlug(slug: string): Tenant | undefined {
  const normalized = slug.trim().toLowerCase();
  return useTenantsStore.getState().tenants.find((t) => t.slug.toLowerCase() === normalized);
}

export function isPlatformMode(tenantId: string = useTenantStore.getState().tenantId): boolean {
  return tenantId === PLATFORM_TENANT_ID;
}

export const useTenantStore = create<TenantState>()(
  persist(
    (set) => ({
      tenantId: defaultTenant.id,
      tenant: defaultTenant,
      setTenant: (tenantId) => {
        const tenant = useTenantsStore.getState().tenants.find((t) => t.id === tenantId);
        if (tenant) set({ tenantId, tenant });
      },
      setTenantBySlug: (slug) => {
        const tenant = findTenantBySlug(slug);
        if (tenant) set({ tenantId: tenant.id, tenant });
        return !!tenant;
      },
      resetToDefaultBranding: () => {
        set({ tenantId: DEFAULT_PREVIEW_TENANT.id, tenant: DEFAULT_PREVIEW_TENANT });
      },
      clearTenantSelection: () => {
        set({ tenantId: DEFAULT_PREVIEW_TENANT.id, tenant: DEFAULT_PREVIEW_TENANT });
      },
    }),
    {
      name: "travelsuite.tenant",
      version: 2,
      migrate: (persisted) => {
        const state = (persisted ?? {}) as Partial<TenantState>;
        return {
          tenantId: state.tenantId ?? defaultTenant.id,
          tenant: state.tenant ?? defaultTenant,
        };
      },
    }
  )
);
