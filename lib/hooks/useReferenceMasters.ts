"use client";

import { useEffect, useState } from "react";
import { listCountries, CountriesApiError } from "@/lib/services/countries.service";
import { listCities, CitiesApiError } from "@/lib/services/cities.service";
import { listCurrencies, CurrenciesApiError } from "@/lib/services/currencies.service";
import { useReferenceStore } from "@/lib/store/reference.store";
import type { City } from "@/types";

/** Hydrates global Country + Currency masters into the reference store. */
export function useHydrateReferenceMasters() {
  const setCountries = useReferenceStore((s) => s.setCountries);
  const setCurrencies = useReferenceStore((s) => s.setCurrencies);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([listCountries({ activeOnly: true }), listCurrencies({ activeOnly: true })])
      .then(([countries, currencies]) => {
        if (cancelled) return;
        setCountries(countries);
        setCurrencies(currencies);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        const message =
          err instanceof CountriesApiError || err instanceof CurrenciesApiError
            ? err.message
            : "Failed to load reference masters";
        setError(message);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [setCountries, setCurrencies]);

  return { loading, error };
}

/** Loads cities for a country code from the global City master. */
export function useCitiesForCountry(countryCode: string | undefined) {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!countryCode) {
      setCities([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    listCities({ countryCode, activeOnly: true })
      .then((rows) => {
        if (cancelled) return;
        setCities(rows);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof CitiesApiError ? err.message : "Failed to load cities");
        setCities([]);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [countryCode]);

  return { cities, loading, error };
}
