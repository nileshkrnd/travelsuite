import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Supplier } from "@/types";
import { suppliers as seedSuppliers } from "@/mock/data/suppliers";
import { useTenantStore } from "@/lib/store/tenant.store";

export interface NewSupplierInput {
  name: string;
  supplierTypeId: string;
}

interface SuppliersState {
  suppliers: Supplier[];
  addSupplier: (input: NewSupplierInput) => Supplier;
  updateSupplier: (id: string, patch: Partial<Pick<Supplier, "name" | "supplierTypeId" | "status">>) => void;
  deleteSupplier: (id: string) => void;
}

export const useSuppliersStore = create<SuppliersState>()(
  persist(
    (set) => ({
      suppliers: seedSuppliers,

      addSupplier: (input) => {
        const supplier: Supplier = {
          id: `supplier_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
          tenantId: useTenantStore.getState().tenantId,
          name: input.name,
          supplierTypeId: input.supplierTypeId,
          status: "active",
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ suppliers: [...state.suppliers, supplier] }));
        return supplier;
      },

      updateSupplier: (id, patch) => {
        set((state) => ({
          suppliers: state.suppliers.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        }));
      },

      deleteSupplier: (id) => {
        set((state) => ({ suppliers: state.suppliers.filter((s) => s.id !== id) }));
      },
    }),
    { name: "travelsuite.suppliers" }
  )
);
