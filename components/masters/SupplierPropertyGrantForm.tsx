"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Store, Building2, Search, Save, X, Loader2, Check, MapPin, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Section } from "@/components/masters/PropertyFormSection";
import { SearchableCombobox } from "@/components/shared/SearchableCombobox";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { listSuppliers } from "@/lib/services/suppliers.service";
import { listProperties, PropertiesApiError } from "@/lib/services/properties.service";
import { listCountries } from "@/lib/services/countries.service";
import { listCities } from "@/lib/services/cities.service";
import { listStates } from "@/lib/services/states.service";
import { listAreas } from "@/lib/services/areas.service";
import {
  saveSupplierPropertyGrant,
  PropertySuppliersApiError,
} from "@/lib/services/property-suppliers.service";
import type { Area, City, Country, Property, State, Supplier, SupplierPropertyGrant } from "@/types";

const NONE = "__none__";

const schema = z
  .object({
    supplierId: z.number().int().positive("Supplier is required"),
    propertyIds: z.array(z.number().int().positive()),
    isPrimary: z.boolean(),
    isActive: z.boolean(),
    validFrom: z.string().trim().optional().or(z.literal("")),
    validTo: z.string().trim().optional().or(z.literal("")),
  })
  .superRefine((values, ctx) => {
    if (values.propertyIds.length === 0) {
      ctx.addIssue({ code: "custom", path: ["propertyIds"], message: "Select at least one property" });
    }
    if (values.validFrom && values.validTo && values.validTo < values.validFrom) {
      ctx.addIssue({ code: "custom", path: ["validTo"], message: "Valid to must be on or after valid from" });
    }
  });
type FormValues = z.infer<typeof schema>;

function emptyValues(): FormValues {
  return {
    supplierId: 0,
    propertyIds: [],
    isPrimary: false,
    isActive: true,
    validFrom: "",
    validTo: "",
  };
}

function valuesFromGrant(g: SupplierPropertyGrant): FormValues {
  return {
    supplierId: g.supplierId,
    propertyIds: g.properties.map((p) => p.propertyId),
    isPrimary: g.isPrimary,
    isActive: g.isActive,
    validFrom: g.validFrom ?? "",
    validTo: g.validTo ?? "",
  };
}

type SelectedLabel = { propertyId: number; label: string; code?: string };

/** Shared Create / Modify form for a supplier's property links. */
export function SupplierPropertyGrantForm({ grant }: { grant?: SupplierPropertyGrant }) {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();
  const sessionUser = useSessionStore((s) => s.user);
  const activeTenant = useTenantStore((s) => s.tenant);
  const tenantKey = sessionUser?.tenantKey ?? activeTenant.tenantKey ?? 0;
  const actorKey = sessionUser?.userKey ?? 0;
  const isEdit = !!grant;

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  const [countries, setCountries] = useState<Country[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [filterCountryId, setFilterCountryId] = useState<number | null>(null);
  const [filterStateId, setFilterStateId] = useState<number | null>(null);
  const [filterCityId, setFilterCityId] = useState<number | null>(null);
  const [filterAreaId, setFilterAreaId] = useState<number | null>(null);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [statesLoading, setStatesLoading] = useState(false);
  const [areasLoading, setAreasLoading] = useState(false);

  const [properties, setProperties] = useState<Property[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(false);
  const [propertySearch, setPropertySearch] = useState("");
  const [selectedLabels, setSelectedLabels] = useState<SelectedLabel[]>(() =>
    (grant?.properties ?? []).map((p) => ({
      propertyId: p.propertyId,
      label: p.propertyName || p.propertyCode || `Property #${p.propertyId}`,
      code: p.propertyCode,
    }))
  );
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: grant ? valuesFromGrant(grant) : emptyValues(),
  });

  useEffect(() => {
    if (tenantKey <= 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      listSuppliers({ tenantId: tenantKey, activeOnly: true }),
      listCountries({ activeOnly: true }),
    ])
      .then(([supplierRows, countryRows]) => {
        if (cancelled) return;
        setSuppliers(supplierRows);
        setCountries(countryRows);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load suppliers/countries");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantKey]);

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
    if (!locationReady || tenantKey <= 0) {
      setProperties([]);
      return;
    }
    let cancelled = false;
    setPropertiesLoading(true);
    listProperties({
      tenantId: tenantKey,
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
        setSelectedLabels((prev) => {
          const map = new Map(prev.map((p) => [p.propertyId, p]));
          for (const p of rows) {
            map.set(p.propertyId, {
              propertyId: p.propertyId,
              label: p.propertyDisplayName || p.propertyName || p.propertyCode,
              code: p.propertyCode,
            });
          }
          return Array.from(map.values());
        });
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
  }, [locationReady, tenantKey, filterCountryId, filterCityId, filterStateId, filterAreaId]);

  const supplierId = useWatch({ control, name: "supplierId" });
  const propertyIds = useWatch({ control, name: "propertyIds" });
  const isPrimary = useWatch({ control, name: "isPrimary" });
  const selectedSupplier = suppliers.find((s) => s.supplierKey === supplierId);

  const visibleProperties = useMemo(() => {
    const term = propertySearch.trim().toLowerCase();
    if (!term) return properties;
    return properties.filter(
      (p) =>
        (p.propertyDisplayName ?? p.propertyName ?? p.propertyCode).toLowerCase().includes(term) ||
        p.propertyCode.toLowerCase().includes(term)
    );
  }, [properties, propertySearch]);

  const selectedOutsideFilter = useMemo(() => {
    const visibleIds = new Set(properties.map((p) => p.propertyId));
    return propertyIds
      .filter((id) => !visibleIds.has(id))
      .map((id) => {
        const meta = selectedLabels.find((s) => s.propertyId === id);
        return { propertyId: id, label: meta?.label || `Property #${id}`, code: meta?.code };
      });
  }, [propertyIds, properties, selectedLabels]);

  async function onSubmit(values: FormValues) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    const payload = {
      propertyIds: values.propertyIds,
      isPrimary: values.isPrimary,
      isActive: values.isActive,
      validFrom: values.validFrom || null,
      validTo: values.validTo || null,
    };
    try {
      const saved = await saveSupplierPropertyGrant(values.supplierId, { ...payload, createdBy: actorKey });
      toast.success(isEdit ? "Property links updated" : "Properties linked to supplier");
      router.push(`/${role}/masters/property-supplier/${saved.supplierId}`);
    } catch (error) {
      toast.error(error instanceof PropertySuppliersApiError ? error.message : "Could not save property links");
    }
  }

  if (loading) {
    return (
      <Card className="max-w-xl">
        <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </CardContent>
      </Card>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,280px)] lg:items-start"
      noValidate
    >
      <div className="min-w-0 space-y-5">
        <Section icon={Store} title="Supplier" description="Which supplier these property links belong to.">
          <div className="space-y-2">
            <Label required>Supplier</Label>
            <Controller
              control={control}
              name="supplierId"
              render={({ field }) => (
                <SearchableCombobox
                  value={field.value || null}
                  onChange={(v) => field.onChange(v)}
                  options={suppliers.map((s) => ({ value: s.supplierKey, label: s.name, sublabel: s.code }))}
                  placeholder="Search supplier by name or code…"
                  emptyLabel="No suppliers found."
                  disabled={isEdit}
                  ariaInvalid={!!errors.supplierId}
                />
              )}
            />
            {errors.supplierId && <p className="text-sm text-destructive">{errors.supplierId.message}</p>}
          </div>
        </Section>

        <Section icon={Building2} title="Properties" description="Which properties this supplier services.">
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p>
                Choose <span className="font-medium text-foreground">Country</span> and{" "}
                <span className="font-medium text-foreground">City</span> first. Properties load only after
                both are selected (State and Area are optional) — this keeps the picker fast across very
                large property catalogs.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label required>Country</Label>
                <Select
                  value={filterCountryId ? String(filterCountryId) : ""}
                  onValueChange={(v) => {
                    const next = v ? Number(v) : null;
                    setFilterCountryId(Number.isFinite(next) && next! > 0 ? next : null);
                    setFilterStateId(null);
                    setFilterCityId(null);
                    setFilterAreaId(null);
                  }}
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue>
                      {(value: string | null) => {
                        if (!value) return "Select country";
                        return countries.find((c) => String(c.countryKey) === value)?.name ?? "Select country";
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
                  onValueChange={(v) => setFilterStateId(!v || v === NONE ? null : Number(v))}
                  disabled={!filterCountryId || statesLoading}
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue>
                      {(value: string | null) => {
                        if (statesLoading) return "Loading…";
                        if (!value || value === NONE) return "Any state";
                        return states.find((s) => String(s.stateKey) === value)?.name ?? "Any state";
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
                  }}
                  disabled={!filterCountryId || citiesLoading}
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue>
                      {(value: string | null) => {
                        if (!filterCountryId) return "Select country first";
                        if (citiesLoading) return "Loading…";
                        if (!value) return "Select city";
                        return cities.find((c) => String(c.cityKey) === value)?.name ?? "Select city";
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
                  onValueChange={(v) => setFilterAreaId(!v || v === NONE ? null : Number(v))}
                  disabled={!filterCityId || areasLoading}
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue>
                      {(value: string | null) => {
                        if (!filterCityId) return "Select city first";
                        if (areasLoading) return "Loading…";
                        if (!value || value === NONE) return "Any area";
                        return areas.find((a) => String(a.areaKey) === value)?.name ?? "Any area";
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

            {!locationReady ? (
              <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                Select country and city to load properties for this location.
              </p>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search within this location…"
                    value={propertySearch}
                    onChange={(e) => setPropertySearch(e.target.value)}
                    className="h-9 ps-9"
                  />
                </div>
                <Controller
                  control={control}
                  name="propertyIds"
                  render={({ field }) => (
                    <div className="max-h-72 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                      {propertiesLoading ? (
                        <p className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Loading properties…
                        </p>
                      ) : visibleProperties.length === 0 ? (
                        <p className="p-2 text-sm text-muted-foreground">No properties found for this location.</p>
                      ) : (
                        visibleProperties.map((p) => {
                          const checked = field.value.includes(p.propertyId);
                          return (
                            <label
                              key={p.propertyId}
                              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(v) => {
                                  const label = p.propertyDisplayName || p.propertyName || p.propertyCode;
                                  if (v) {
                                    field.onChange([...field.value, p.propertyId]);
                                    setSelectedLabels((prev) => {
                                      if (prev.some((x) => x.propertyId === p.propertyId)) return prev;
                                      return [...prev, { propertyId: p.propertyId, label, code: p.propertyCode }];
                                    });
                                  } else {
                                    field.onChange(field.value.filter((id) => id !== p.propertyId));
                                  }
                                }}
                              />
                              <span className="min-w-0 truncate">
                                {p.propertyDisplayName || p.propertyName || p.propertyCode}
                              </span>
                              <span className="ms-auto shrink-0 font-mono text-xs text-muted-foreground">
                                {p.propertyCode}
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  )}
                />
                {properties.length >= 500 && (
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Showing the first 500 matches — narrow with Area or search if needed.
                  </p>
                )}
              </div>
            )}

            {selectedOutsideFilter.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Selected outside current filter ({selectedOutsideFilter.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedOutsideFilter.map((p) => (
                    <Badge key={p.propertyId} variant="secondary" className="gap-1 pe-1">
                      <span className="max-w-[160px] truncate">{p.label}</span>
                      <button
                        type="button"
                        className="rounded-sm p-0.5 hover:bg-muted"
                        aria-label={`Remove ${p.label}`}
                        onClick={() =>
                          setValue(
                            "propertyIds",
                            propertyIds.filter((id) => id !== p.propertyId),
                            { shouldValidate: true }
                          )
                        }
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {errors.propertyIds && <p className="text-sm text-destructive">{errors.propertyIds.message}</p>}
            {propertyIds.length > 0 && (
              <p className="text-xs text-muted-foreground">{propertyIds.length} selected</p>
            )}
          </div>
        </Section>

        <Section icon={Star} title="Link details" description="Applies uniformly to every selected property.">
          <div className="space-y-4">
            <Controller
              control={control}
              name="isPrimary"
              render={({ field }) => (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} />
                  Make this supplier the primary supplier for every selected property
                </label>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="validFrom">Valid from</Label>
                <Input id="validFrom" type="date" {...register("validFrom")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="validTo">Valid to</Label>
                <Input id="validTo" type="date" {...register("validTo")} />
                {errors.validTo && <p className="text-sm text-destructive">{errors.validTo.message}</p>}
              </div>
            </div>
          </div>
        </Section>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEdit ? "Save changes" : "Link properties"}
          </Button>
          <Button
            type="button"
            variant="outline"
            nativeButton={false}
            render={
              <Link
                href={
                  isEdit
                    ? `/${role}/masters/property-supplier/${grant.supplierId}`
                    : `/${role}/masters/property-supplier`
                }
              />
            }
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
        </div>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6">
        <Card className="overflow-hidden p-0">
          <div className="flex h-24 items-end bg-gradient-to-br from-[#001C35] via-[#0a3558] to-[#1a5a7a] p-4 text-white">
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold">
                {selectedSupplier ? selectedSupplier.name : "Select a supplier"}
              </p>
              <p className="truncate text-sm text-white/75">
                {propertyIds.length} propert{propertyIds.length === 1 ? "y" : "ies"}
              </p>
            </div>
          </div>
          <CardContent className="space-y-3 pt-4">
            {isPrimary && (
              <Badge variant="default" className="gap-1">
                <Check className="h-3 w-3" />
                Primary supplier
              </Badge>
            )}
          </CardContent>
        </Card>
      </aside>
    </form>
  );
}
