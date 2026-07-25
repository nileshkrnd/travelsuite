import { create } from "zustand";
import type { Country, Currency } from "@/types";

interface ReferenceState {
  countries: Country[];
  currencies: Currency[];
  setCountries: (countries: Country[]) => void;
  setCurrencies: (currencies: Currency[]) => void;
  getCountry: (code: string) => Country | undefined;
  getCurrency: (code: string) => Currency | undefined;
}

/** In-memory cache of global Country / Currency masters (no tenant scope). */
export const useReferenceStore = create<ReferenceState>((set, get) => ({
  countries: [],
  currencies: [],
  setCountries: (countries) => set({ countries }),
  setCurrencies: (currencies) => set({ currencies }),
  getCountry: (code) => get().countries.find((c) => c.code.toUpperCase() === code.toUpperCase()),
  getCurrency: (code) => get().currencies.find((c) => c.code.toUpperCase() === code.toUpperCase()),
}));
