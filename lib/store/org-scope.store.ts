import { create } from "zustand";
import { persist } from "zustand/middleware";

interface OrgScopeState {
  companyId: string | null;
  branchId: string | null;
  setCompanyId: (companyId: string | null) => void;
  setBranchId: (branchId: string | null) => void;
  /** Clear branch when company changes; optionally seed from the signed-in user. */
  hydrateFromUser: (companyId?: string, branchId?: string) => void;
}

export const useOrgScopeStore = create<OrgScopeState>()(
  persist(
    (set) => ({
      companyId: null,
      branchId: null,
      setCompanyId: (companyId) => set({ companyId, branchId: null }),
      setBranchId: (branchId) => set({ branchId }),
      hydrateFromUser: (companyId, branchId) =>
        set((state) => ({
          companyId: state.companyId ?? companyId ?? null,
          branchId: state.branchId ?? branchId ?? null,
        })),
    }),
    { name: "travelsuite.org-scope" }
  )
);
