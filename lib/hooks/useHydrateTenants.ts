"use client";

import { useEffect, useState } from "react";
import { listTenants, TenantsApiError } from "@/lib/services/tenants.service";
import { useTenantsStore } from "@/lib/store/tenants.store";

/** Loads Tenant master from PostgreSQL into the in-memory registry (primary entry point). */
export function useHydrateTenants() {
  const setTenants = useTenantsStore((s) => s.setTenants);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    listTenants()
      .then((rows) => {
        if (cancelled) return;
        setTenants(rows);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err instanceof TenantsApiError ? err.message : "Failed to load tenants";
        setError(message);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [setTenants]);

  return { loading, error };
}
