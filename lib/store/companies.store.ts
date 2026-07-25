import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Company } from "@/types";
import { companies as seedCompanies } from "@/mock/data/companies";

interface CompaniesState {
  companies: Company[];
  setCompanies: (companies: Company[]) => void;
  upsertCompany: (company: Company) => void;
  /** @deprecated Prefer API create — kept for temporary local fallbacks. */
  updateCompanyLocal: (id: string, patch: Partial<Company>) => void;
}

export const useCompaniesStore = create<CompaniesState>()(
  persist(
    (set) => ({
      companies: seedCompanies,

      setCompanies: (companies) => set({ companies }),

      upsertCompany: (company) =>
        set((state) => {
          const idx = state.companies.findIndex(
            (c) => c.id === company.id || c.companyKey === company.companyKey
          );
          if (idx === -1) return { companies: [...state.companies, company] };
          const next = [...state.companies];
          next[idx] = company;
          return { companies: next };
        }),

      updateCompanyLocal: (id, patch) => {
        set((state) => ({
          companies: state.companies.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        }));
      },
    }),
    {
      name: "travelsuite.companies",
      version: 4,
      migrate: () => ({ companies: seedCompanies }),
    }
  )
);
