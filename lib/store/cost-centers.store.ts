import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CostCenter } from "@/types";
import { costCenters as seed } from "@/mock/data/cost-centers";

interface CostCentersState {
  costCenters: CostCenter[];
}

export const useCostCentersStore = create<CostCentersState>()(
  persist(
    () => ({
      costCenters: seed,
    }),
    {
      name: "travelsuite.cost-centers",
      version: 1,
      migrate: () => ({ costCenters: seed }),
    }
  )
);
