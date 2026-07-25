import { create } from "zustand";
import type { Currency } from "@/types";

interface CurrenciesState {
  currencies: Currency[];
  setCurrencies: (currencies: Currency[]) => void;
  upsertCurrency: (currency: Currency) => void;
}

/** Cache for global Currency master (no tenant scope). Prefer API + hydrate over this store. */
export const useCurrenciesStore = create<CurrenciesState>((set) => ({
  currencies: [],
  setCurrencies: (currencies) => set({ currencies }),
  upsertCurrency: (currency) =>
    set((state) => {
      const idx = state.currencies.findIndex((c) => c.id === currency.id);
      if (idx === -1) return { currencies: [...state.currencies, currency] };
      const next = [...state.currencies];
      next[idx] = currency;
      return { currencies: next };
    }),
}));
