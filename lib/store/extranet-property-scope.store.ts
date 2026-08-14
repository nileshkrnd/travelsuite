import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ExtranetPropertyScopeState {
  propertyId: number | null;
  propertyLabel: string | null;
  countryId: number | null;
  stateId: number | null;
  cityId: number | null;
  areaId: number | null;
  setProperty: (input: {
    propertyId: number | null;
    propertyLabel: string | null;
    countryId?: number | null;
    stateId?: number | null;
    cityId?: number | null;
    areaId?: number | null;
  }) => void;
  clear: () => void;
}

/** Sticky "current property" for the Extranet section — set once, reused by Contracts/Rooms/Seasons until cleared. */
export const useExtranetPropertyScopeStore = create<ExtranetPropertyScopeState>()(
  persist(
    (set) => ({
      propertyId: null,
      propertyLabel: null,
      countryId: null,
      stateId: null,
      cityId: null,
      areaId: null,
      setProperty: (input) =>
        set({
          propertyId: input.propertyId,
          propertyLabel: input.propertyLabel,
          countryId: input.countryId ?? null,
          stateId: input.stateId ?? null,
          cityId: input.cityId ?? null,
          areaId: input.areaId ?? null,
        }),
      clear: () =>
        set({ propertyId: null, propertyLabel: null, countryId: null, stateId: null, cityId: null, areaId: null }),
    }),
    { name: "travelsuite.extranet-property-scope" }
  )
);
