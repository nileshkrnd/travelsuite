import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SubAgency } from "@/types";
import { subAgencies as seedSubAgencies } from "@/mock/data/subAgencies";
import { useTenantStore } from "@/lib/store/tenant.store";

export interface NewSubAgencyInput {
  name: string;
  agencyId: string;
}

interface SubAgenciesState {
  subAgencies: SubAgency[];
  addSubAgency: (input: NewSubAgencyInput) => SubAgency;
  updateSubAgency: (id: string, patch: Partial<Pick<SubAgency, "name" | "agencyId" | "status">>) => void;
  deleteSubAgency: (id: string) => void;
}

export const useSubAgenciesStore = create<SubAgenciesState>()(
  persist(
    (set) => ({
      subAgencies: seedSubAgencies,

      addSubAgency: (input) => {
        const subAgency: SubAgency = {
          id: `subagency_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
          tenantId: useTenantStore.getState().tenantId,
          agencyId: input.agencyId,
          name: input.name,
          status: "active",
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ subAgencies: [...state.subAgencies, subAgency] }));
        return subAgency;
      },

      updateSubAgency: (id, patch) => {
        set((state) => ({
          subAgencies: state.subAgencies.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        }));
      },

      deleteSubAgency: (id) => {
        set((state) => ({ subAgencies: state.subAgencies.filter((s) => s.id !== id) }));
      },
    }),
    { name: "travelsuite.subAgencies" }
  )
);
