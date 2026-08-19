"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Building2, FileSignature, Globe, Loader2, MapPin, Search, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/EmptyState";
import { cn } from "@/lib/utils";
import { listPropertySuppliers, PropertySuppliersApiError } from "@/lib/services/property-suppliers.service";
import { listPropertyContracts, PropertyContractsApiError } from "@/lib/services/property-contracts.service";
import type { PropertySupplier } from "@/types";

const ALL_COUNTRIES = "__all__";

/** Two-letter ISO country code → flag emoji via the regional-indicator Unicode trick. No image/CDN dependency. */
function countryFlagEmoji(countryCode?: string | null): string | null {
  if (!countryCode || !/^[A-Za-z]{2}$/.test(countryCode)) return null;
  const codePoints = [...countryCode.toUpperCase()].map((c) => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

/** Properties assigned to the logged-in Supplier (Hotelier / DMC / …) — searchable hotel-listing style grid. */
export function SupplierPropertyList({
  supplierId,
  role,
  onViewProperty,
}: {
  supplierId: number;
  role: string;
  onViewProperty: (property: PropertySupplier) => void;
}) {
  const router = useRouter();
  const [properties, setProperties] = useState<PropertySupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [countryFilter, setCountryFilter] = useState<string>(ALL_COUNTRIES);
  const [search, setSearch] = useState("");
  const [updatingPropertyId, setUpdatingPropertyId] = useState<number | null>(null);

  useEffect(() => {
    if (supplierId <= 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    listPropertySuppliers({ supplierId, activeOnly: true })
      .then((rows) => {
        if (!cancelled) setProperties(rows);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(
            err instanceof PropertySuppliersApiError ? err.message : "Failed to load your properties"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [supplierId]);

  const countries = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of properties) {
      const name = p.countryName ?? "Unspecified";
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [properties]);

  const countryFlagByName = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of properties) {
      if (!p.countryName) continue;
      const flag = countryFlagEmoji(p.countryCode);
      if (flag && !map.has(p.countryName)) map.set(p.countryName, flag);
    }
    return map;
  }, [properties]);

  const visible = useMemo(() => {
    let rows = properties;
    if (countryFilter !== ALL_COUNTRIES) {
      rows = rows.filter((p) => (p.countryName ?? "Unspecified") === countryFilter);
    }
    const query = search.trim().toLowerCase();
    if (query) {
      rows = rows.filter((p) =>
        [p.propertyDisplayName, p.propertyName, p.propertyCode, p.cityName, p.countryName]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(query))
      );
    }
    return rows;
  }, [properties, countryFilter, search]);

  async function updateContract(p: PropertySupplier) {
    setUpdatingPropertyId(p.propertyId);
    try {
      const contracts = await listPropertyContracts({ propertyId: p.propertyId, supplierId });
      if (contracts.length === 1) {
        router.push(`/${role}/extranet/contracts/${contracts[0]!.propertyContractKey}/edit`);
      } else {
        router.push(`/${role}/extranet/contracts?propertyId=${p.propertyId}`);
      }
    } catch (err) {
      toast.error(err instanceof PropertyContractsApiError ? err.message : "Could not load contracts");
    } finally {
      setUpdatingPropertyId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading your properties…
      </div>
    );
  }

  if (supplierId <= 0) {
    return (
      <EmptyState
        icon={Building2}
        tone="muted"
        heading="No supplier account linked"
        description="Your login isn't linked to a supplier record yet — ask your tenant admin to link it under Masters → Supplier User."
      />
    );
  }

  if (properties.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        tone="muted"
        heading="No properties assigned yet"
        description="Your tenant admin hasn't assigned any properties to your supplier account."
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your hotels by name or code…"
            className="pl-9"
          />
        </div>

        {countries.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCountryFilter(ALL_COUNTRIES)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                countryFilter === ALL_COUNTRIES
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-muted"
              )}
            >
              <Globe className="h-3 w-3" />
              All ({properties.length})
            </button>
            {countries.map(([name, count]) => (
              <button
                key={name}
                type="button"
                onClick={() => setCountryFilter(name)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  countryFilter === name
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                )}
              >
                <span>{countryFlagByName.get(name) ?? "🌐"}</span>
                {name} ({count})
              </button>
            ))}
          </div>
        )}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={Search}
          tone="muted"
          heading="No hotels match your search"
          description="Try a different name, code, or clear the country filter."
          size="compact"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((p) => {
            const flag = countryFlagEmoji(p.countryCode);
            return (
              <Card key={p.propertySupplierKey} className="overflow-hidden pt-0 transition-shadow hover:shadow-md">
                <div className="group relative aspect-video w-full overflow-hidden bg-muted">
                  {p.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- external/uploaded property media, not a static asset
                    <img
                      src={p.coverImageUrl}
                      alt={p.propertyDisplayName || p.propertyName || p.propertyCode || "Property"}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 via-primary/5 to-muted">
                      <Building2 className="h-10 w-10 text-primary/30" />
                    </div>
                  )}
                  {p.isPrimary && (
                    <Badge className="absolute left-2 top-2 shadow-sm">Primary</Badge>
                  )}
                  {!!p.starRating && (
                    <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-xs font-semibold text-foreground shadow-sm backdrop-blur">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {p.starRating}
                    </div>
                  )}
                </div>
                <CardContent className="space-y-3 pt-4">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">
                      {p.propertyDisplayName || p.propertyName || p.propertyCode}
                    </p>
                    <p className="text-xs text-muted-foreground">{p.propertyCode}</p>
                  </div>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {flag ? <span className="text-sm leading-none">{flag}</span> : <MapPin className="h-3.5 w-3.5 shrink-0" />}
                    <span className="truncate">
                      {[p.cityName, p.countryName].filter(Boolean).join(", ") || "—"}
                    </span>
                    {typeof p.rating === "number" && p.rating > 0 && (
                      <span className="ml-auto shrink-0 font-medium text-foreground">{p.rating.toFixed(1)}</span>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => onViewProperty(p)}>
                      <Building2 className="h-4 w-4" />
                      View setup
                    </Button>
                    <Button
                      size="sm"
                      disabled={updatingPropertyId === p.propertyId}
                      onClick={() => void updateContract(p)}
                    >
                      {updatingPropertyId === p.propertyId ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileSignature className="h-4 w-4" />
                      )}
                      Update contract
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
