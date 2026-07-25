import { useReferenceStore } from "@/lib/store/reference.store";
import type { Country } from "@/types";

/**
 * Resolve a country from the hydrated global Country master.
 * Prefer loading via `useHydrateReferenceMasters` before relying on this helper.
 */
export function getCountry(code: string): Country | undefined {
  return useReferenceStore.getState().getCountry(code);
}

/** @deprecated Use `useCitiesForCountry` — cities are loaded from the global City master. */
export function getCitiesForCountry(_code: string): string[] {
  return [];
}
