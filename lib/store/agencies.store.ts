import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Agency } from "@/types";
import { agencies as seedAgencies } from "@/mock/data/agencies";
import { useTenantStore } from "@/lib/store/tenant.store";

export interface NewAgencyInput {
  name: string;
}

interface AgenciesState {
  agencies: Agency[];
  addAgency: (input: NewAgencyInput) => Agency;
  updateAgency: (id: string, patch: Partial<Pick<Agency, "name" | "status">>) => void;
  deleteAgency: (id: string) => void;
}

export const useAgenciesStore = create<AgenciesState>()(
  persist(
    (set) => ({
      agencies: seedAgencies,

      addAgency: (input) => {
        const agency: Agency = {
          id: `agency_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
          tenantId: useTenantStore.getState().tenantId,
          name: input.name,
          status: "active",
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ agencies: [...state.agencies, agency] }));
        return agency;
      },

      updateAgency: (id, patch) => {
        set((state) => ({
          agencies: state.agencies.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        }));
      },

      deleteAgency: (id) => {
        set((state) => ({ agencies: state.agencies.filter((a) => a.id !== id) }));
      },
    }),
    { name: "travelsuite.agencies" }
  )
);
