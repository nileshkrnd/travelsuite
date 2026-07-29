import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AccountGroup } from "@/types";
import { accountGroups as seedGroups } from "@/mock/data/account-groups";
import { useTenantStore } from "@/lib/store/tenant.store";

export type AccountGroupInput = Omit<AccountGroup, "id" | "tenantId" | "createdAt" | "isSystem"> & {
  isSystem?: boolean;
};

interface AccountGroupsState {
  groups: AccountGroup[];
  addGroup: (input: AccountGroupInput) => AccountGroup;
  updateGroup: (id: string, patch: Partial<AccountGroupInput>) => void;
  setGroupStatus: (id: string, status: AccountGroup["status"]) => void;
  deleteGroup: (id: string) => boolean;
}

export const useAccountGroupsStore = create<AccountGroupsState>()(
  persist(
    (set, get) => ({
      groups: seedGroups,

      addGroup: (input) => {
        const group: AccountGroup = {
          id: `ag_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
          tenantId: useTenantStore.getState().tenantId,
          code: input.code.trim().toUpperCase(),
          name: input.name.trim(),
          parentId: input.parentId,
          nature: input.nature,
          reportType: input.reportType,
          normalBalance: input.normalBalance,
          affectsGrossProfit: input.affectsGrossProfit,
          behavesLikeSubLedger: input.behavesLikeSubLedger,
          nettBalancesForReporting: input.nettBalancesForReporting,
          isSystem: false,
          status: input.status,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ groups: [...state.groups, group] }));
        return group;
      },

      updateGroup: (id, patch) => {
        set((state) => ({
          groups: state.groups.map((g) => {
            if (g.id !== id) return g;
            return {
              ...g,
              ...patch,
              code: patch.code !== undefined ? patch.code.trim().toUpperCase() : g.code,
              name: patch.name !== undefined ? patch.name.trim() : g.name,
              isSystem: g.isSystem,
            };
          }),
        }));
      },

      setGroupStatus: (id, status) => {
        set((state) => ({
          groups: state.groups.map((g) => (g.id === id ? { ...g, status } : g)),
        }));
      },

      deleteGroup: (id) => {
        const target = get().groups.find((g) => g.id === id);
        if (!target || target.isSystem) return false;
        const hasChildren = get().groups.some((g) => g.parentId === id);
        if (hasChildren) return false;
        set((state) => ({ groups: state.groups.filter((g) => g.id !== id) }));
        return true;
      },
    }),
    {
      name: "travelsuite.account-groups",
      version: 1,
      migrate: () => ({ groups: seedGroups }),
    }
  )
);
