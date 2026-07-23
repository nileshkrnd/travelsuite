import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Company } from "@/types";
import { companies as seedCompanies } from "@/mock/data/companies";
import { useTenantStore } from "@/lib/store/tenant.store";

export interface NewCompanyInput {
  name: string;
}

interface CompaniesState {
  companies: Company[];
  addCompany: (input: NewCompanyInput) => Company;
  updateCompany: (id: string, patch: Partial<Pick<Company, "name" | "status">>) => void;
  deleteCompany: (id: string) => void;
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
    { name: "travelsuite.companies" }
  )
);
