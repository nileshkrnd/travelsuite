import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Currency } from "@/types";
import { currencies as seedCurrencies } from "@/mock/data/currencies";
import { useTenantStore } from "@/lib/store/tenant.store";

export interface NewCurrencyInput {
  code: string;
  name: string;
  smallCurrencyName: string;
  significantDigit: number;
}

interface CurrenciesState {
  currencies: Currency[];
  addCurrency: (input: NewCurrencyInput) => Currency;
  updateCurrency: (
    id: string,
    patch: Partial<Pick<Currency, "code" | "name" | "smallCurrencyName" | "significantDigit" | "status">>
  ) => void;
}

export const useCurrenciesStore = create<CurrenciesState>()(
  persist(
    (set) => ({
      currencies: seedCurrencies,

      addCurrency: (input) => {
        const currency: Currency = {
          id: `currency_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
          tenantId: useTenantStore.getState().tenantId,
          code: input.code,
          name: input.name,
          smallCurrencyName: input.smallCurrencyName,
          significantDigit: input.significantDigit,
          status: "active",
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ currencies: [...state.currencies, currency] }));
        return currency;
      },

      updateCurrency: (id, patch) => {
        set((state) => ({
          currencies: state.currencies.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        }));
      },
    }),
    { name: "travelsuite.currencies" }
  )
);
