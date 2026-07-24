import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Corporate } from "@/types";
import { corporates as seedCorporates } from "@/mock/data/corporates";
import { useTenantStore } from "@/lib/store/tenant.store";

export interface NewCorporateInput {
  name: string;
}

interface CorporatesState {
  corporates: Corporate[];
  addCorporate: (input: NewCorporateInput) => Corporate;
  updateCorporate: (id: string, patch: Partial<Pick<Corporate, "name" | "status">>) => void;
  deleteCorporate: (id: string) => void;
}

export const useCorporatesStore = create<CorporatesState>()(
  persist(
    (set) => ({
      corporates: seedCorporates,

      addCorporate: (input) => {
        const corporate: Corporate = {
          id: `corporate_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
          tenantId: useTenantStore.getState().tenantId,
          name: input.name,
          status: "active",
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ corporates: [...state.corporates, corporate] }));
        return corporate;
      },

      updateCorporate: (id, patch) => {
        set((state) => ({
          corporates: state.corporates.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        }));
      },

      deleteCorporate: (id) => {
        set((state) => ({ corporates: state.corporates.filter((c) => c.id !== id) }));
      },
    }),
    { name: "travelsuite.corporates" }
  )
);
