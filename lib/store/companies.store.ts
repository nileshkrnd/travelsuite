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

/** Backfills code / companyKey on companies persisted before those fields existed. */
function withDefaults(company: Company): Company {
  return { ...company, code: company.code ?? "", companyKey: company.companyKey ?? 0 };
}

export const useCompaniesStore = create<CompaniesState>()(
  persist(
    (set, get) => ({
      companies: seedCompanies,

      addCompany: (input) => {
        const nextKey = Math.max(0, ...get().companies.map((c) => c.companyKey ?? 0)) + 1;
        const company: Company = {
          id: `company_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
          companyKey: nextKey,
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
      version: 3,
      migrate: () => ({ companies: seedCompanies.map(withDefaults) }),
    }
  )
);
