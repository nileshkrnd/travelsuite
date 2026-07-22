import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CurrencyCode } from "@/types";

interface UiPrefsState {
  currency: CurrencyCode;
  locale: string;
  sidebarCollapsed: boolean;
  mobileDrawerOpen: boolean;
  setCurrency: (currency: CurrencyCode) => void;
  setLocale: (locale: string) => void;
  toggleSidebarCollapsed: () => void;
  setMobileDrawerOpen: (open: boolean) => void;
}

export const useUiPrefsStore = create<UiPrefsState>()(
  persist(
    (set) => ({
      currency: "USD",
      locale: "en",
      sidebarCollapsed: false,
      mobileDrawerOpen: false,
      setCurrency: (currency) => set({ currency }),
      setLocale: (locale) => set({ locale }),
      toggleSidebarCollapsed: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setMobileDrawerOpen: (open) => set({ mobileDrawerOpen: open }),
    }),
    { name: "travelsuite.ui-prefs" }
  )
);
