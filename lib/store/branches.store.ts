import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Branch } from "@/types";
import { branches as seedBranches } from "@/mock/data/branches";

interface BranchesState {
  branches: Branch[];
  setBranches: (branches: Branch[]) => void;
  upsertBranch: (branch: Branch) => void;
}

export const useBranchesStore = create<BranchesState>()(
  persist(
    (set) => ({
      branches: seedBranches,

      setBranches: (branches) => set({ branches }),

      upsertBranch: (branch) =>
        set((state) => {
          const idx = state.branches.findIndex(
            (b) => b.id === branch.id || b.branchKey === branch.branchKey
          );
          if (idx === -1) return { branches: [...state.branches, branch] };
          const next = [...state.branches];
          next[idx] = branch;
          return { branches: next };
        }),
    }),
    {
      name: "travelsuite.branches",
      version: 4,
      migrate: () => ({ branches: seedBranches }),
    }
  )
);
