"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Loader2, Plus, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { SearchableCombobox } from "@/components/shared/SearchableCombobox";
import { SearchableMultiSelect } from "@/components/shared/SearchableMultiSelect";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { resolveSessionCompanyKey } from "@/lib/session-company";
import { listCountries } from "@/lib/services/countries.service";
import { listRegions } from "@/lib/services/regions.service";
import { listCities } from "@/lib/services/cities.service";
import {
  createPropertyContractMarketRule,
  updatePropertyContractMarketRule,
  ensureDefaultMarketTypes,
  listMarketGroups,
  createMarketGroup,
  PropertyContractMarketRuleApiError,
  MarketGroupsApiError,
} from "@/lib/services/property-contract-market-rules.service";
import type {
  Country,
  Region,
  City,
  MarketType,
  MarketGroup,
  PropertyContract,
  PropertyContractMarketRule,
} from "@/types";

const schema = z
  .object({
    propertyContractId: z.number().int().positive(),
    marketTypeId: z.number().int().positive("Choose a market type"),
    regionId: z.number().int().positive().nullable(),
    countryId: z.number().int().positive().nullable(),
    cityId: z.number().int().positive().nullable(),
    marketGroupId: z.number().int().positive().nullable(),
    ruleType: z.enum(["INCLUDE", "EXCLUDE"]),
    fromDate: z.string(),
    toDate: z.string(),
    isActive: z.boolean(),
  })
  .refine((v) => !v.fromDate || !v.toDate || v.fromDate <= v.toDate, {
    message: "From date must be on or before to date",
    path: ["toDate"],
  });

type FormValues = z.infer<typeof schema>;

function defaultValues(contract: PropertyContract): FormValues {
  return {
    propertyContractId: contract.propertyContractKey,
    marketTypeId: 0,
    regionId: null,
    countryId: null,
    cityId: null,
    marketGroupId: null,
    ruleType: "INCLUDE",
    fromDate: "",
    toDate: "",
    isActive: true,
  };
}

function valuesFromEntry(entry: PropertyContractMarketRule): FormValues {
  return {
    propertyContractId: entry.propertyContractId,
    marketTypeId: entry.marketTypeId,
    regionId: entry.regionId,
    countryId: entry.countryId,
    cityId: entry.cityId,
    marketGroupId: entry.marketGroupId,
    ruleType: entry.ruleType,
    fromDate: entry.fromDate ?? "",
    toDate: entry.toDate ?? "",
    isActive: entry.isActive,
  };
}

/** Create or edit a contract market rule — Country / Region / City / Market Group include-exclude scoping. */
export function PropertyContractMarketRuleForm({
  lockedContract,
  entry,
}: {
  lockedContract: PropertyContract;
  entry?: PropertyContractMarketRule;
}) {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();
  const sessionUser = useSessionStore((s) => s.user);
  const activeTenant = useTenantStore((s) => s.tenant);
  const tenantKey = sessionUser?.tenantKey ?? activeTenant.tenantKey ?? 0;
  const companyKey = resolveSessionCompanyKey(sessionUser) ?? 0;
  const actorKey = sessionUser?.userKey ?? 0;

  const returnHref = `/${role}/extranet/contracts/${lockedContract.propertyContractKey}?tab=market-rules`;
  const isEdit = !!entry;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [marketTypes, setMarketTypes] = useState<MarketType[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [marketGroups, setMarketGroups] = useState<MarketGroup[]>([]);
  const [selectedCountryIds, setSelectedCountryIds] = useState<number[]>([]);
  const [selectedRegionIds, setSelectedRegionIds] = useState<number[]>([]);
  const [showNewMarketGroup, setShowNewMarketGroup] = useState(false);
  const [newMarketGroupCode, setNewMarketGroupCode] = useState("");
  const [newMarketGroupName, setNewMarketGroupName] = useState("");
  const [creatingMarketGroup, setCreatingMarketGroup] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: entry ? valuesFromEntry(entry) : defaultValues(lockedContract),
  });

  const selectedMarketTypeId = watch("marketTypeId");
  const selectedMarketType = marketTypes.find((t) => t.marketTypeKey === selectedMarketTypeId);
  const marketTypeCode = selectedMarketType?.marketTypeCode.toUpperCase();

  async function loadLookups() {
    if (tenantKey <= 0 || companyKey <= 0 || !actorKey) return;
    const [types, countryRows, regionRows, cityRows, groupRows] = await Promise.all([
      ensureDefaultMarketTypes({ tenantId: tenantKey, companyId: companyKey, createdBy: actorKey }),
      listCountries({ activeOnly: true }),
      listRegions({ activeOnly: true }),
      listCities({ activeOnly: true }),
      listMarketGroups({ tenantId: tenantKey, companyId: companyKey, activeOnly: true }),
    ]);
    setMarketTypes(types);
    setCountries(countryRows);
    setRegions(regionRows);
    setCities(cityRows);
    setMarketGroups(groupRows);

    if (!isEdit && types.length > 0) {
      const country = types.find((t) => t.marketTypeCode === "COUNTRY");
      setValue("marketTypeId", (country ?? types[0]!).marketTypeKey);
    }
  }

  useEffect(() => {
    if (tenantKey <= 0 || companyKey <= 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    loadLookups()
      .catch(() => {
        if (!cancelled) toast.error("Failed to load market rule form");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantKey, companyKey, actorKey, lockedContract.propertyContractKey, isEdit]);

  const countryOptions = useMemo(
    () => countries.map((c) => ({ value: c.countryKey, label: c.name, sublabel: c.code })),
    [countries]
  );
  const regionOptions = useMemo(
    () => regions.map((r) => ({ value: r.regionId, label: r.regionName, sublabel: r.regionCode })),
    [regions]
  );
  const cityOptions = useMemo(
    () => cities.map((c) => ({ value: c.cityKey, label: c.name, sublabel: c.countryCode })),
    [cities]
  );
  const marketGroupOptions = useMemo(
    () => marketGroups.map((g) => ({ value: g.marketGroupKey, label: g.marketGroupName, sublabel: g.marketGroupCode })),
    [marketGroups]
  );

  function selectMarketType(id: number | null) {
    setValue("marketTypeId", id ?? 0, { shouldValidate: true });
    setValue("regionId", null);
    setValue("countryId", null);
    setValue("cityId", null);
    setValue("marketGroupId", null);
    setSelectedCountryIds([]);
    setSelectedRegionIds([]);
  }

  async function handleCreateMarketGroup() {
    if (!newMarketGroupCode.trim() || !newMarketGroupName.trim()) {
      toast.error("Enter both a code and a name for the market group.");
      return;
    }
    setCreatingMarketGroup(true);
    try {
      const created = await createMarketGroup({
        tenantId: tenantKey,
        companyId: companyKey,
        marketGroupCode: newMarketGroupCode.trim(),
        marketGroupName: newMarketGroupName.trim(),
        createdBy: actorKey,
      });
      setMarketGroups((prev) => [...prev, created].sort((a, b) => a.marketGroupCode.localeCompare(b.marketGroupCode)));
      setValue("marketGroupId", created.marketGroupKey, { shouldValidate: true });
      setShowNewMarketGroup(false);
      setNewMarketGroupCode("");
      setNewMarketGroupName("");
      toast.success("Market group created");
    } catch (err) {
      toast.error(err instanceof MarketGroupsApiError ? err.message : "Could not create market group");
    } finally {
      setCreatingMarketGroup(false);
    }
  }

  async function onSubmit(values: FormValues) {
    if (tenantKey <= 0 || companyKey <= 0 || !actorKey) {
      toast.error("Missing tenant, company, or user context.");
      return;
    }

    const basePayload = {
      tenantId: tenantKey,
      companyId: companyKey,
      propertyContractId: values.propertyContractId,
      marketTypeId: values.marketTypeId,
      ruleType: values.ruleType,
      fromDate: values.fromDate || null,
      toDate: values.toDate || null,
      isActive: values.isActive,
    };

    // Multi-select create: batch-create one rule row per selected country/region.
    const isMultiCreate =
      !entry &&
      ((marketTypeCode === "COUNTRY" && selectedCountryIds.length > 0) ||
        (marketTypeCode === "REGION" && selectedRegionIds.length > 0));

    if (isMultiCreate) {
      const ids = marketTypeCode === "COUNTRY" ? selectedCountryIds : selectedRegionIds;
      const idField = marketTypeCode === "COUNTRY" ? "countryId" : "regionId";
      const optionsById =
        marketTypeCode === "COUNTRY"
          ? new Map(countries.map((c) => [c.countryKey, c.name]))
          : new Map(regions.map((r) => [r.regionId, r.regionName]));

      setSaving(true);
      let saved = 0;
      const failed: string[] = [];
      for (const id of ids) {
        try {
          await createPropertyContractMarketRule({
            ...basePayload,
            regionId: null,
            countryId: null,
            cityId: null,
            marketGroupId: null,
            [idField]: id,
            createdBy: actorKey,
          });
          saved += 1;
        } catch (err) {
          const label = optionsById.get(id) ?? `#${id}`;
          const message = err instanceof PropertyContractMarketRuleApiError ? err.message : "save failed";
          failed.push(`${label} (${message})`);
        }
      }
      setSaving(false);

      if (saved > 0) {
        toast.success(`${saved} market rule${saved === 1 ? "" : "s"} added`);
      }
      if (failed.length > 0) {
        toast.error(`Could not add: ${failed.join(", ")}`);
      } else {
        router.push(returnHref);
      }
      return;
    }

    if (!entry && (marketTypeCode === "COUNTRY" || marketTypeCode === "REGION")) {
      toast.error(`Select at least one ${marketTypeCode === "COUNTRY" ? "country" : "region"}.`);
      return;
    }

    const payload = {
      ...basePayload,
      regionId: values.regionId,
      countryId: values.countryId,
      cityId: values.cityId,
      marketGroupId: values.marketGroupId,
    };

    setSaving(true);
    try {
      if (entry) {
        await updatePropertyContractMarketRule(entry.propertyContractMarketRuleKey, {
          ...payload,
          modifiedBy: actorKey,
        });
        toast.success("Market rule saved");
      } else {
        await createPropertyContractMarketRule({ ...payload, createdBy: actorKey });
        toast.success("Market rule added");
      }
      router.push(returnHref);
    } catch (error) {
      toast.error(
        error instanceof PropertyContractMarketRuleApiError ? error.message : "Could not save market rule"
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-1 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Contract</p>
        <p className="text-base font-semibold text-foreground">{lockedContract.contractName}</p>
        <p className="text-muted-foreground">
          {lockedContract.contractNumber}
          {lockedContract.propertyName ? ` · ${lockedContract.propertyName}` : ""}
        </p>
      </div>

      <Card>
        <CardContent className="space-y-5 pt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label required>Market type</Label>
              <Controller
                control={control}
                name="marketTypeId"
                render={({ field }) => (
                  <SearchableCombobox
                    value={field.value > 0 ? field.value : null}
                    onChange={(v) => selectMarketType(v)}
                    options={marketTypes.map((t) => ({ value: t.marketTypeKey, label: t.marketTypeName }))}
                    placeholder="Select market type…"
                  />
                )}
              />
              {errors.marketTypeId && (
                <p className="text-xs text-destructive">{errors.marketTypeId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label required>Rule type</Label>
              <Controller
                control={control}
                name="ruleType"
                render={({ field }) => (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={field.value === "INCLUDE" ? "default" : "outline"}
                      onClick={() => field.onChange("INCLUDE")}
                      className="flex-1"
                    >
                      Include
                    </Button>
                    <Button
                      type="button"
                      variant={field.value === "EXCLUDE" ? "default" : "outline"}
                      onClick={() => field.onChange("EXCLUDE")}
                      className="flex-1"
                    >
                      Exclude
                    </Button>
                  </div>
                )}
              />
            </div>
          </div>

          {marketTypeCode === "COUNTRY" &&
            (!isEdit ? (
              <div className="space-y-2">
                <Label required>Countries</Label>
                <SearchableMultiSelect
                  values={selectedCountryIds}
                  onChange={setSelectedCountryIds}
                  options={countryOptions}
                  placeholder="Search and select one or more countries…"
                  emptyLabel="No countries found."
                />
                <p className="text-xs text-muted-foreground">
                  Select multiple — one rule row is created per country.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label required>Country</Label>
                <Controller
                  control={control}
                  name="countryId"
                  render={({ field }) => (
                    <SearchableCombobox
                      value={field.value}
                      onChange={(v) => field.onChange(v)}
                      options={countryOptions}
                      placeholder="Select country…"
                      emptyLabel="No countries found."
                    />
                  )}
                />
                {errors.countryId && <p className="text-xs text-destructive">{errors.countryId.message}</p>}
              </div>
            ))}

          {marketTypeCode === "REGION" &&
            (!isEdit ? (
              <div className="space-y-2">
                <Label required>Regions</Label>
                <SearchableMultiSelect
                  values={selectedRegionIds}
                  onChange={setSelectedRegionIds}
                  options={regionOptions}
                  placeholder="Search and select one or more regions…"
                  emptyLabel="No regions found."
                />
                <p className="text-xs text-muted-foreground">
                  Select multiple — one rule row is created per region.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label required>Region</Label>
                <Controller
                  control={control}
                  name="regionId"
                  render={({ field }) => (
                    <SearchableCombobox
                      value={field.value}
                      onChange={(v) => field.onChange(v)}
                      options={regionOptions}
                      placeholder="Select region…"
                      emptyLabel="No regions found."
                    />
                  )}
                />
                {errors.regionId && <p className="text-xs text-destructive">{errors.regionId.message}</p>}
              </div>
            ))}

          {marketTypeCode === "CITY" && (
            <div className="space-y-2">
              <Label required>City</Label>
              <Controller
                control={control}
                name="cityId"
                render={({ field }) => (
                  <SearchableCombobox
                    value={field.value}
                    onChange={(v) => field.onChange(v)}
                    options={cityOptions}
                    placeholder="Select city…"
                    emptyLabel="No cities found."
                  />
                )}
              />
              {errors.cityId && <p className="text-xs text-destructive">{errors.cityId.message}</p>}
            </div>
          )}

          {marketTypeCode === "MARKET_GROUP" && (
            <div className="space-y-2">
              <Label required>Market group</Label>
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <Controller
                    control={control}
                    name="marketGroupId"
                    render={({ field }) => (
                      <SearchableCombobox
                        value={field.value}
                        onChange={(v) => field.onChange(v)}
                        options={marketGroupOptions}
                        placeholder="Select market group…"
                        emptyLabel="No market groups yet — create one."
                      />
                    )}
                  />
                </div>
                <Button type="button" variant="outline" onClick={() => setShowNewMarketGroup((v) => !v)}>
                  <Plus className="h-4 w-4" />
                  New
                </Button>
              </div>
              {errors.marketGroupId && (
                <p className="text-xs text-destructive">{errors.marketGroupId.message}</p>
              )}
              {showNewMarketGroup && (
                <div className="grid gap-2 rounded-lg border bg-muted/20 p-3 sm:grid-cols-[1fr_1fr_auto]">
                  <div className="space-y-1">
                    <Label className="text-xs">Code</Label>
                    <Input
                      value={newMarketGroupCode}
                      onChange={(e) => setNewMarketGroupCode(e.target.value)}
                      placeholder="GCC-WHOLESALE"
                      className="font-mono uppercase"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Name</Label>
                    <Input
                      value={newMarketGroupName}
                      onChange={(e) => setNewMarketGroupName(e.target.value)}
                      placeholder="GCC Wholesale"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      size="sm"
                      disabled={creatingMarketGroup}
                      onClick={() => void handleCreateMarketGroup()}
                    >
                      {creatingMarketGroup ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>From date</Label>
              <Controller
                control={control}
                name="fromDate"
                render={({ field }) => (
                  <Input type="date" value={field.value} onChange={(e) => field.onChange(e.target.value)} />
                )}
              />
              <p className="text-xs text-muted-foreground">Leave blank for no start limit</p>
            </div>
            <div className="space-y-2">
              <Label>To date</Label>
              <Controller
                control={control}
                name="toDate"
                render={({ field }) => (
                  <Input
                    type="date"
                    min={watch("fromDate") || undefined}
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                  />
                )}
              />
              {errors.toDate && <p className="text-xs text-destructive">{errors.toDate.message}</p>}
              <p className="text-xs text-muted-foreground">Leave blank for no end limit</p>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={watch("isActive")}
              onCheckedChange={(c) => setValue("isActive", c === true)}
            />
            Active
          </label>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 border-t pt-4">
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isEdit
            ? "Save changes"
            : marketTypeCode === "COUNTRY" && selectedCountryIds.length > 1
              ? `Add ${selectedCountryIds.length} market rules`
              : marketTypeCode === "REGION" && selectedRegionIds.length > 1
                ? `Add ${selectedRegionIds.length} market rules`
                : "Add market rule"}
        </Button>
        <Button type="button" variant="outline" nativeButton={false} render={<Link href={returnHref} />}>
          <X className="h-4 w-4" />
          Cancel
        </Button>
      </div>
    </form>
  );
}
