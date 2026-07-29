import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Ledger } from "@/types";
import { ledgers as seedLedgers } from "@/mock/data/ledgers";
import { useTenantStore } from "@/lib/store/tenant.store";

export type LedgerInput = Omit<Ledger, "id" | "tenantId" | "createdAt" | "isSystem"> & {
  isSystem?: boolean;
};

interface LedgersState {
  ledgers: Ledger[];
  addLedger: (input: LedgerInput) => Ledger;
  updateLedger: (id: string, patch: Partial<LedgerInput>) => void;
  setLedgerStatus: (id: string, status: Ledger["status"]) => void;
  deleteLedger: (id: string) => boolean;
}

export const useLedgersStore = create<LedgersState>()(
  persist(
    (set, get) => ({
      ledgers: seedLedgers,

      addLedger: (input) => {
        const ledger: Ledger = {
          id: `led_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
          tenantId: useTenantStore.getState().tenantId,
          code: input.code.trim().toUpperCase(),
          name: input.name.trim(),
          groupId: input.groupId,
          openingBalance: input.openingBalance,
          openingBalanceType: input.openingBalanceType,
          billByBill: input.billByBill,
          inventoryValuesAffected: input.inventoryValuesAffected,
          costCentresApplicable: input.costCentresApplicable,
          creditPeriodDays: input.creditPeriodDays,
          creditLimit: input.creditLimit,
          mailingName: input.mailingName.trim(),
          status: input.status,
          isSystem: false,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ ledgers: [...state.ledgers, ledger] }));
        return ledger;
      },

      updateLedger: (id, patch) => {
        set((state) => ({
          ledgers: state.ledgers.map((l) => {
            if (l.id !== id) return l;
            return {
              ...l,
              ...patch,
              code: patch.code !== undefined ? patch.code.trim().toUpperCase() : l.code,
              name: patch.name !== undefined ? patch.name.trim() : l.name,
              mailingName:
                patch.mailingName !== undefined ? patch.mailingName.trim() : l.mailingName,
              isSystem: l.isSystem,
            };
          }),
        }));
      },

      setLedgerStatus: (id, status) => {
        set((state) => ({
          ledgers: state.ledgers.map((l) => (l.id === id ? { ...l, status } : l)),
        }));
      },

      deleteLedger: (id) => {
        const target = get().ledgers.find((l) => l.id === id);
        if (!target || target.isSystem) return false;
        set((state) => ({ ledgers: state.ledgers.filter((l) => l.id !== id) }));
        return true;
      },
    }),
    {
      name: "travelsuite.ledgers",
      version: 2,
      migrate: () => ({ ledgers: seedLedgers }),
    }
  )
);
