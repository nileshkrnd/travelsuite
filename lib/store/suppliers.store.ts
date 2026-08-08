import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Supplier } from "@/types";

interface SuppliersState {
  suppliers: Supplier[];
  setSuppliers: (suppliers: Supplier[]) => void;
  upsertSupplier: (supplier: Supplier) => void;
  removeSupplier: (id: string) => void;
}

export const useSuppliersStore = create<SuppliersState>()(
  persist(
    (set) => ({
      suppliers: [],

      setSuppliers: (suppliers) => set({ suppliers }),

      upsertSupplier: (supplier) =>
        set((state) => {
          const idx = state.suppliers.findIndex((s) => s.id === supplier.id);
          if (idx === -1) return { suppliers: [...state.suppliers, supplier] };
          const next = [...state.suppliers];
          next[idx] = supplier;
          return { suppliers: next };
        }),

      removeSupplier: (id) => set((state) => ({ suppliers: state.suppliers.filter((s) => s.id !== id) })),
    }),
    {
      name: "travelsuite.suppliers",
      version: 1,
      migrate: () => ({ suppliers: [] }),
    }
  )
);
