import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Region } from "@/types";
import { regions as seedRegions } from "@/mock/data/regions";
import { useTenantStore } from "@/lib/store/tenant.store";

export interface NewRegionInput {
  code: string;
  name: string;
}

interface RegionsState {
  regions: Region[];
  addRegion: (input: NewRegionInput) => Region;
  updateRegion: (id: string, patch: Partial<Pick<Region, "code" | "name" | "status">>) => void;
}

export const useRegionsStore = create<RegionsState>()(
  persist(
    (set) => ({
      regions: seedRegions,

      addRegion: (input) => {
        const region: Region = {
          id: `region_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
          tenantId: useTenantStore.getState().tenantId,
          code: input.code,
          name: input.name,
          status: "active",
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ regions: [...state.regions, region] }));
        return region;
      },

      updateRegion: (id, patch) => {
        set((state) => ({
          regions: state.regions.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        }));
      },
    }),
    { name: "travelsuite.regions" }
  )
);
