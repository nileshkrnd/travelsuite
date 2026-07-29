import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FinanceDepartment } from "@/types";
import { financeDepartments as seed } from "@/mock/data/finance-departments";

interface FinanceDepartmentsState {
  departments: FinanceDepartment[];
}

export const useFinanceDepartmentsStore = create<FinanceDepartmentsState>()(
  persist(
    () => ({
      departments: seed,
    }),
    {
      name: "travelsuite.finance-departments",
      version: 1,
      migrate: () => ({ departments: seed }),
    }
  )
);
