"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MapPin } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableCombobox } from "@/components/shared/SearchableCombobox";
import { listCountries } from "@/lib/services/countries.service";
import { listCities } from "@/lib/services/cities.service";
import { listStates } from "@/lib/services/states.service";
import { listAreas } from "@/lib/services/areas.service";
import { listProperties, PropertiesApiError } from "@/lib/services/properties.service";
import type { Area, City, Country, Property, State } from "@/types";

const NONE = "__none__";

export type ExtranetPropertyPickerProps = {
  tenantId: number;
  /** Selected property id (0 / null = none). */
  value: number | null;
  onChange: (propertyId: number | null, property: Property | null) => void;
  /** Lock property selection (e.g. edit mode). */
  disabled?: boolean;
  /** Label shown when disabled and value is set. */
  selectedLabel?: string | null;
  error?: string;
  required?: boolean;
  /** Compact hint for list/filter bars. */
  compact?: boolean;
  className?: string;
  /** Seed the location filters on mount (e.g. restoring a previously-scoped property). */
  initialCountryId?: number | null;
  initialStateId?: number | null;
  initialCityId?: number | null;
  initialAreaId?: number | null;
};

/**
 * Shared extranet location → property picker.
 * Country + City required; State and Area optional; then property search.
 */
export function ExtranetPropertyPicker({
  tenantId,
  value,
  onChange,
  disabled = false,
  selectedLabel = null,
  error,
  required = true,
  compact = false,
  className,
  initialCountryId = null,
  initialStateId = null,
  initialCityId = null,
  initialAreaId = null,
}: ExtranetPropertyPickerProps) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [filterCountryId, setFilterCountryId] = useState<number | null>(initialCountryId);
  const [filterStateId, setFilterStateId] = useState<number | null>(initialStateId);
  const [filterCityId, setFilterCityId] = useState<number | null>(initialCityId);
  const [filterAreaId, setFilterAreaId] = useState<number | null>(initialAreaId);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [statesLoading, setStatesLoading] = useState(false);
  const [areasLoading, setAreasLoading] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(false);
  const [countriesLoading, setCountriesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setCountriesLoading(true);
    listCountries({ activeOnly: true })
      .then((rows) => {
        if (!cancelled) setCountries(rows);
      })
      .catch(() => {
        if (!cancelled) {
          setCountries([]);
          toast.error("Failed to load countries");
        }
      })
      .finally(() => {
        if (!cancelled) setCountriesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!filterCountryId) {
      setCities([]);
      setFilterCityId(null);
      return;
    }
    let cancelled = false;
    setCitiesLoading(true);
    listCities({ countryId: filterCountryId, activeOnly: true })
      .then((rows) => {
        if (cancelled) return;
        setCities(rows);
        setFilterCityId((current) => (current && rows.some((c) => c.cityKey === current) ? current : null));
      })
      .catch(() => {
        if (!cancelled) setCities([]);
      })
      .finally(() => {
        if (!cancelled) setCitiesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filterCountryId]);

  useEffect(() => {
    if (!filterCountryId) {
      setStates([]);
      setFilterStateId(null);
      return;
    }
    let cancelled = false;
    setStatesLoading(true);
    listStates({ countryId: filterCountryId, activeOnly: true })
      .then((rows) => {
        if (cancelled) return;
        setStates(rows);
        setFilterStateId((current) => (current && rows.some((s) => s.stateKey === current) ? current : null));
      })
      .catch(() => {
        if (!cancelled) setStates([]);
      })
      .finally(() => {
        if (!cancelled) setStatesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filterCountryId]);

  useEffect(() => {
    if (!filterCountryId || !filterCityId) {
      setAreas([]);
      setFilterAreaId(null);
      return;
    }
    let cancelled = false;
    setAreasLoading(true);
    listAreas({ countryId: filterCountryId, cityId: filterCityId, activeOnly: true })
      .then((rows) => {
        if (cancelled) return;
        setAreas(rows);
        setFilterAreaId((current) => (current && rows.some((a) => a.areaKey === current) ? current : null));
      })
      .catch(() => {
        if (!cancelled) setAreas([]);
      })
      .finally(() => {
        if (!cancelled) setAreasLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filterCountryId, filterCityId]);

  const locationReady = !!filterCountryId && !!filterCityId;

  useEffect(() => {
    if (!locationReady || tenantId <= 0) {
      setProperties([]);
      return;
    }
    let cancelled = false;
    setPropertiesLoading(true);
    listProperties({
      tenantId,
      includeGlobal: true,
      activeOnly: true,
      countryId: filterCountryId!,
      cityId: filterCityId!,
      stateId: filterStateId ?? undefined,
      areaId: filterAreaId ?? undefined,
      requireLocation: true,
      take: 500,
    })
      .then((rows) => {
        if (cancelled) return;
        setProperties(rows);
        if (value && !rows.some((p) => p.propertyId === value)) {
          onChange(null, null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setProperties([]);
          toast.error(err instanceof PropertiesApiError ? err.message : "Failed to load properties");
        }
      })
      .finally(() => {
        if (!cancelled) setPropertiesLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // intentionally omit onChange/value from deps to avoid loops when parent re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps -- location filters drive the fetch
  }, [locationReady, tenantId, filterCountryId, filterCityId, filterStateId, filterAreaId]);

  function resetDownstreamFromCountry(nextCountryId: number | null) {
    setFilterCountryId(nextCountryId);
    setFilterStateId(null);
    setFilterCityId(null);
    setFilterAreaId(null);
    onChange(null, null);
  }

  return (
    <div className={className ?? "space-y-3"}>
      {!compact && (
        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p>
            Choose <span className="font-medium text-foreground">Country</span> and{" "}
            <span className="font-medium text-foreground">City</span> first. Properties load only after both
            are selected (State and Area are optional).
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label required>Country</Label>
          <Select
            value={filterCountryId ? String(filterCountryId) : ""}
            onValueChange={(v) => {
              const next = v ? Number(v) : null;
              resetDownstreamFromCountry(Number.isFinite(next) && next! > 0 ? next : null);
            }}
            disabled={disabled || countriesLoading}
          >
            <SelectTrigger className="h-10 w-full">
              <SelectValue>
                {(val: string | null) => {
                  if (countriesLoading) return "Loading…";
                  if (!val) return "Select country";
                  return countries.find((c) => String(c.countryKey) === val)?.name ?? "Select country";
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {countries.map((c) => (
                <SelectItem key={c.countryKey} value={String(c.countryKey)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>State / Province</Label>
          <Select
            value={filterStateId ? String(filterStateId) : NONE}
            onValueChange={(v) => {
              setFilterStateId(!v || v === NONE ? null : Number(v));
              onChange(null, null);
            }}
            disabled={disabled || !filterCountryId || statesLoading}
          >
            <SelectTrigger className="h-10 w-full">
              <SelectValue>
                {(val: string | null) => {
                  if (statesLoading) return "Loading…";
                  if (!val || val === NONE) return "Any state";
                  return states.find((s) => String(s.stateKey) === val)?.name ?? "Any state";
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Any state</SelectItem>
              {states.map((s) => (
                <SelectItem key={s.stateKey} value={String(s.stateKey)}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label required>City</Label>
          <Select
            value={filterCityId ? String(filterCityId) : ""}
            onValueChange={(v) => {
              const next = v ? Number(v) : null;
              setFilterCityId(Number.isFinite(next) && next! > 0 ? next : null);
              setFilterAreaId(null);
              onChange(null, null);
            }}
            disabled={disabled || !filterCountryId || citiesLoading}
          >
            <SelectTrigger className="h-10 w-full">
              <SelectValue>
                {(val: string | null) => {
                  if (!filterCountryId) return "Select country first";
                  if (citiesLoading) return "Loading…";
                  if (!val) return "Select city";
                  return cities.find((c) => String(c.cityKey) === val)?.name ?? "Select city";
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {cities.map((c) => (
                <SelectItem key={c.cityKey} value={String(c.cityKey)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Area</Label>
          <Select
            value={filterAreaId ? String(filterAreaId) : NONE}
            onValueChange={(v) => {
              setFilterAreaId(!v || v === NONE ? null : Number(v));
              onChange(null, null);
            }}
            disabled={disabled || !filterCityId || areasLoading}
          >
            <SelectTrigger className="h-10 w-full">
              <SelectValue>
                {(val: string | null) => {
                  if (!filterCityId) return "Select city first";
                  if (areasLoading) return "Loading…";
                  if (!val || val === NONE) return "Any area";
                  return areas.find((a) => String(a.areaKey) === val)?.name ?? "Any area";
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Any area</SelectItem>
              {areas.map((a) => (
                <SelectItem key={a.areaKey} value={String(a.areaKey)}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label required={required}>Property</Label>
        <SearchableCombobox
          value={value && value > 0 ? value : null}
          onChange={(v) => {
            const prop = properties.find((p) => p.propertyId === v) ?? null;
            onChange(v > 0 ? v : null, prop);
          }}
          options={properties.map((p) => ({
            value: p.propertyId,
            label: p.propertyDisplayName || p.propertyName || p.propertyCode,
            sublabel: p.propertyCode,
          }))}
          placeholder={
            !locationReady
              ? "Select country and city first"
              : propertiesLoading
                ? "Loading properties…"
                : "Search property by name or code…"
          }
          emptyLabel="No properties found for this location."
          disabled={disabled || !locationReady || propertiesLoading}
          ariaInvalid={!!error}
        />
        {disabled && selectedLabel && (
          <p className="text-xs text-muted-foreground">Currently: {selectedLabel}</p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {properties.length >= 500 && (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Showing the first 500 matches — narrow with State or Area if needed.
          </p>
        )}
      </div>
    </div>
  );
}
