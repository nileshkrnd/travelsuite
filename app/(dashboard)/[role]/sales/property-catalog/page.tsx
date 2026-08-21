"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Search,
  MapPin,
  Star,
  ImageOff,
  LayoutGrid,
  SlidersHorizontal,
  X,
  Hotel,
  Building2,
} from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore, isPlatformMode } from "@/lib/store/tenant.store";
import { listProperties, PropertiesApiError } from "@/lib/services/properties.service";
import { SUPER_ADMIN_ROLE_ID } from "@/mock/data/roles";
import type { RoleDef, Property } from "@/types";

function displayName(p: Property) {
  return p.propertyDisplayName || p.propertyName || p.propertyCode;
}

function stripHtml(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

interface OptionEntry {
  id: number;
  label: string;
}

function uniqueOptions(items: { id: number | null | undefined; label: string | undefined }[]): OptionEntry[] {
  const map = new Map<number, string>();
  for (const item of items) {
    if (item.id != null && item.label) map.set(item.id, item.label);
  }
  return Array.from(map.entries())
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function uniqueMultiOptions(items: { ids: number[]; labels: string[] }[]): OptionEntry[] {
  const map = new Map<number, string>();
  for (const item of items) {
    item.ids.forEach((id, idx) => {
      const label = item.labels[idx];
      if (id != null && label) map.set(id, label);
    });
  }
  return Array.from(map.entries())
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function PropertyCatalogGrid({ roleDef }: { roleDef: RoleDef }) {
  const { role } = useParams<{ role: string }>();
  const user = useSessionStore((s) => s.user);
  const activeTenantId = useTenantStore((s) => s.tenantId);
  const activeTenant = useTenantStore((s) => s.tenant);

  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [typeId, setTypeId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [countryId, setCountryId] = useState<number | null>(null);
  const [cityId, setCityId] = useState<number | null>(null);

  const isSuperAdmin = roleDef.id === SUPER_ADMIN_ROLE_ID;
  const platformMode = isSuperAdmin && isPlatformMode(activeTenantId);
  const scopeTenantId = platformMode ? 0 : (user?.tenantKey ?? activeTenant.tenantKey ?? 0);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const rows = platformMode
          ? await listProperties({ global: true, activeOnly: true })
          : scopeTenantId > 0
            ? await listProperties({ tenantId: scopeTenantId, activeOnly: true })
            : [];
        if (!platformMode && scopeTenantId <= 0) {
          setLoadError("Missing tenant scope.");
        }
        setProperties(rows);
      } catch (error) {
        setLoadError(error instanceof PropertiesApiError ? error.message : "Failed to load properties");
        setProperties([]);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [scopeTenantId, platformMode]);

  const typeOptions = useMemo(
    () => uniqueMultiOptions(properties.map((p) => ({ ids: p.propertyTypeIds, labels: p.propertyTypeNames }))),
    [properties]
  );
  const categoryOptions = useMemo(
    () =>
      uniqueMultiOptions(
        properties
          .filter((p) => !typeId || p.propertyTypeIds.includes(typeId))
          .map((p) => ({ ids: p.propertyCategoryIds, labels: p.propertyCategoryNames }))
      ),
    [properties, typeId]
  );
  const countryOptions = useMemo(
    () => uniqueOptions(properties.map((p) => ({ id: p.countryId, label: p.countryName }))),
    [properties]
  );
  const cityOptions = useMemo(
    () =>
      uniqueOptions(
        properties.filter((p) => !countryId || p.countryId === countryId).map((p) => ({ id: p.cityId, label: p.cityName }))
      ),
    [properties, countryId]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return properties.filter((p) => {
      if (typeId && !p.propertyTypeIds.includes(typeId)) return false;
      if (categoryId && !p.propertyCategoryIds.includes(categoryId)) return false;
      if (countryId && p.countryId !== countryId) return false;
      if (cityId && p.cityId !== cityId) return false;
      if (term) {
        const haystack = `${displayName(p)} ${p.propertyCode} ${p.shortDescription ?? ""}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [properties, search, typeId, categoryId, countryId, cityId]);

  const activeFilterCount = [typeId, categoryId, countryId, cityId].filter((v) => v != null).length;

  function clearFilters() {
    setTypeId(null);
    setCategoryId(null);
    setCountryId(null);
    setCityId(null);
    setSearch("");
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Property Catalog"
        description="Browse every property in one place — filter by type, category, and destination."
      />

      {loadError && <p className="text-sm text-destructive">{loadError}</p>}

      {!loadError && (
        <div className="space-y-4 rounded-xl border border-border bg-card p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, code, or description…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ps-9"
              />
            </div>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="shrink-0">
                <X className="h-3.5 w-3.5" />
                Clear filters ({activeFilterCount})
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Property type</Label>
              <Select
                value={typeId ? String(typeId) : "all"}
                onValueChange={(v) => {
                  setTypeId(v === "all" ? null : Number(v));
                  setCategoryId(null);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {typeOptions.map((o) => (
                    <SelectItem key={o.id} value={String(o.id)}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Category</Label>
              <Select value={categoryId ? String(categoryId) : "all"} onValueChange={(v) => setCategoryId(v === "all" ? null : Number(v))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categoryOptions.map((o) => (
                    <SelectItem key={o.id} value={String(o.id)}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Country</Label>
              <Select
                value={countryId ? String(countryId) : "all"}
                onValueChange={(v) => {
                  setCountryId(v === "all" ? null : Number(v));
                  setCityId(null);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All countries</SelectItem>
                  {countryOptions.map((o) => (
                    <SelectItem key={o.id} value={String(o.id)}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">City</Label>
              <Select value={cityId ? String(cityId) : "all"} onValueChange={(v) => setCityId(v === "all" ? null : Number(v))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All cities</SelectItem>
                  {cityOptions.map((o) => (
                    <SelectItem key={o.id} value={String(o.id)}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse space-y-3 overflow-hidden rounded-xl border border-border bg-card">
              <div className="aspect-[4/3] bg-muted" />
              <div className="space-y-2 p-4">
                <div className="h-3 w-1/2 rounded bg-muted" />
                <div className="h-4 w-3/4 rounded bg-muted" />
                <div className="h-3 w-full rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : !loadError && filtered.length === 0 ? (
        <EmptyState
          icon={properties.length === 0 ? LayoutGrid : SlidersHorizontal}
          tone="muted"
          heading={properties.length === 0 ? "No properties yet" : "No matching properties"}
          description={
            properties.length === 0
              ? "Properties created in Masters → Property will show up here."
              : "Try a different search term or clear filters to see more results."
          }
          size="compact"
          action={
            properties.length > 0 && activeFilterCount > 0 ? (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        !loadError && (
          <>
            <p className="text-sm text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? "property" : "properties"}
            </p>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((property) => {
                const location = [property.cityName, property.countryName].filter(Boolean).join(", ");
                const description = stripHtml(property.shortDescription ?? property.description);
                return (
                  <Link
                    key={property.propertyId}
                    href={`/${role}/sales/property-catalog/${property.propertyId}`}
                    className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                      {property.coverImageUrl ? (
                        <img
                          src={property.coverImageUrl}
                          alt={displayName(property)}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#001C35] via-[#0a3558] to-[#1a5a7a] text-white/70">
                          <Hotel className="h-10 w-10" />
                        </div>
                      )}
                      <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2.5">
                        <Badge variant="secondary" className="bg-white/90 text-foreground shadow-sm backdrop-blur">
                          <Building2 className="h-3 w-3" />
                          {property.propertyTypeNames[0] ?? "—"}
                        </Badge>
                        {property.isFeatured && (
                          <Badge className="gap-1 bg-amber-500 text-white shadow-sm">
                            <Star className="h-3 w-3 fill-current" />
                            Featured
                          </Badge>
                        )}
                      </div>
                      {!property.coverImageUrl && (
                        <div className="absolute bottom-2 end-2 text-white/50">
                          <ImageOff className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-2 p-4">
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        {property.starRating != null && property.starRating > 0 && (
                          <span className="flex items-center gap-0.5 text-amber-500">
                            {Array.from({ length: property.starRating }).map((_, i) => (
                              <Star key={i} className="h-3 w-3 fill-current" />
                            ))}
                          </span>
                        )}
                        {property.propertyCategoryNames[0] && <span>{property.propertyCategoryNames[0]}</span>}
                      </div>
                      <h3 className="line-clamp-2 font-medium leading-snug text-foreground group-hover:text-primary">
                        {displayName(property)}
                      </h3>
                      {location && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{location}</span>
                        </div>
                      )}
                      {description && <p className="line-clamp-2 text-xs text-muted-foreground">{description}</p>}
                      <div className="mt-auto flex items-center justify-between pt-2 text-xs">
                        <span className="font-mono text-muted-foreground">{property.propertyCode}</span>
                        <span className="font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                          View details →
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )
      )}
    </div>
  );
}

export default function PropertyCatalogPage() {
  return <AccessGate module="propertyCatalog">{(roleDef) => <PropertyCatalogGrid roleDef={roleDef} />}</AccessGate>;
}
