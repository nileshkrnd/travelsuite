import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Company } from "@/types";
import { companies as seedCompanies } from "@/mock/data/companies";
import { useTenantStore } from "@/lib/store/tenant.store";

export interface NewCompanyInput {
  name: string;
  code: string;
}

interface CompaniesState {
  companies: Company[];
  addCompany: (input: NewCompanyInput) => Company;
  updateCompany: (id: string, patch: Partial<Pick<Company, "name" | "code" | "status">>) => void;
  deleteCompany: (id: string) => void;
}

/** Backfills the code field on companies persisted before it existed. */
function withDefaults(company: Company): Company {
  return { ...company, code: company.code ?? "" };
}

export const useCompaniesStore = create<CompaniesState>()(
  persist(
    (set) => ({
      companies: seedCompanies,

      addCompany: (input) => {
        const company: Company = {
          id: `company_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
          tenantId: useTenantStore.getState().tenantId,
          name: input.name,
          code: input.code,
          status: "active",
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ companies: [...state.companies, company] }));
        return company;
      },

      updateCompany: (id, patch) => {
        set((state) => ({
          companies: state.companies.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        }));
      },

      deleteCompany: (id) => {
        set((state) => ({ companies: state.companies.filter((c) => c.id !== id) }));
      },
    }),
    {
      name: "travelsuite.companies",
      version: 1,
      migrate: (persistedState) => {
        const state = persistedState as CompaniesState;
        return { ...state, companies: (state.companies ?? []).map(withDefaults) };
      },
    }
  )
);
