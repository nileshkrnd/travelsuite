import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SupplierType } from "@/types";
import { supplierTypes as seedSupplierTypes } from "@/mock/data/supplierTypes";
import { useTenantStore } from "@/lib/store/tenant.store";

interface SupplierTypesState {
  supplierTypes: SupplierType[];
  addSupplierType: (name: string) => SupplierType;
}

export const useSupplierTypesStore = create<SupplierTypesState>()(
  persist(
    (set) => ({
      supplierTypes: seedSupplierTypes,
      addSupplierType: (name) => {
        const type: SupplierType = {
          id: `stype_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
          tenantId: useTenantStore.getState().tenantId,
          name,
        };
        set((state) => ({ supplierTypes: [...state.supplierTypes, type] }));
        return type;
      },
    }),
    { name: "travelsuite.supplierTypes" }
  )
);
