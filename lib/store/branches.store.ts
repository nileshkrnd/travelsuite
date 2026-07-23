import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Branch } from "@/types";
import { branches as seedBranches } from "@/mock/data/branches";
import { useTenantStore } from "@/lib/store/tenant.store";

export interface NewBranchInput {
  name: string;
  companyId: string;
  city: string;
  country: string;
}

interface BranchesState {
  branches: Branch[];
  addBranch: (input: NewBranchInput) => Branch;
  updateBranch: (id: string, patch: Partial<Pick<Branch, "name" | "companyId" | "city" | "country" | "status">>) => void;
  deleteBranch: (id: string) => void;
}

export const useBranchesStore = create<BranchesState>()(
  persist(
    (set) => ({
      branches: seedBranches,

      addBranch: (input) => {
        const branch: Branch = {
          id: `branch_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
          tenantId: useTenantStore.getState().tenantId,
          companyId: input.companyId,
          name: input.name,
          city: input.city,
          country: input.country,
          status: "active",
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ branches: [...state.branches, branch] }));
        return branch;
      },

      updateBranch: (id, patch) => {
        set((state) => ({
          branches: state.branches.map((b) => (b.id === id ? { ...b, ...patch } : b)),
        }));
      },

      deleteBranch: (id) => {
        set((state) => ({ branches: state.branches.filter((b) => b.id !== id) }));
      },
    }),
    { name: "travelsuite.branches" }
  )
);
