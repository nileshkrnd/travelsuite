"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Globe2, Eye, Pencil, Power, PowerOff, Trash2, X, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useSessionStore } from "@/lib/store/session.store";
import { useUsersStore } from "@/lib/store/users.store";
import { listServiceProductSuppliers } from "@/lib/services/service-product-suppliers.service";
import { listServiceProductOptions } from "@/lib/services/service-product-options.service";
import { listServiceProductVariants } from "@/lib/services/service-product-variants.service";
import { listCountries } from "@/lib/services/countries.service";
import { listRegions } from "@/lib/services/regions.service";
import { listCities } from "@/lib/services/cities.service";
import { ensureDefaultMarketTypes, listMarketGroups } from "@/lib/services/property-contract-market-rules.service";
import { listRuleTypes } from "@/lib/services/rule-types.service";
import {
  listServiceProductMarketRules,
  createServiceProductMarketRule,
  updateServiceProductMarketRule,
  setServiceProductMarketRuleActive,
  deleteServiceProductMarketRule,
  ServiceProductMarketRulesApiError,
} from "@/lib/services/service-product-market-rules.service";
import { can } from "@/config/permissions";
import type {
  City,
  Country,
  MarketGroup,
  MarketType,
  Region,
  RoleDef,
  RuleType,
  ServiceProduct,
  ServiceProductMarketRule,
  ServiceProductOption,
  ServiceProductSupplier,
  ServiceProductVariant,
} from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";
type StatusFilter = "all" | "active" | "inactive";
const NONE = "none";

const schema = z
  .object({
    serviceProductSupplierId: z.number().int().positive().nullable(),
    serviceProductOptionId: z.number().int().positive().nullable(),
    serviceProductVariantId: z.number().int().positive().nullable(),
    marketTypeId: z.number().int().positive("Market type is required"),
    regionId: z.number().int().positive().nullable(),
    countryId: z.number().int().positive().nullable(),
    cityId: z.number().int().positive().nullable(),
    marketGroupId: z.number().int().positive().nullable(),
    ruleTypeId: z.number().int().positive("Rule type is required"),
    fromDate: z.string().trim().optional().or(z.literal("")),
    toDate: z.string().trim().optional().or(z.literal("")),
    isActive: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (values.fromDate && values.toDate && values.fromDate > values.toDate) {
      ctx.addIssue({ code: "custom", path: ["toDate"], message: "To date must be on or after from date" });
    }
  });

type FormValues = z.infer<typeof schema>;

function blankValues(): FormValues {
  return {
    serviceProductSupplierId: null,
    serviceProductOptionId: null,
    serviceProductVariantId: null,
    marketTypeId: 0,
    regionId: null,
    countryId: null,
    cityId: null,
    marketGroupId: null,
    ruleTypeId: 0,
    fromDate: "",
    toDate: "",
    isActive: true,
  };
}

function MarketRulePanel({
  mode,
  row,
  product,
  supplierLinks,
  options,
  marketTypes,
  ruleTypes,
  countries,
  regions,
  cities,
  marketGroups,
  userKey,
  onClose,
  onSaved,
}: {
  mode: Exclude<PanelMode, "closed">;
  row?: ServiceProductMarketRule;
  product: ServiceProduct;
  supplierLinks: ServiceProductSupplier[];
  options: ServiceProductOption[];
  marketTypes: MarketType[];
  ruleTypes: RuleType[];
  countries: Country[];
  regions: Region[];
  cities: City[];
  marketGroups: MarketGroup[];
  userKey: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const isReadOnly = mode === "view";
  const [variants, setVariants] = useState<ServiceProductVariant[]>([]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: row
      ? {
          serviceProductSupplierId: row.serviceProductSupplierId,
          serviceProductOptionId: row.serviceProductOptionId,
          serviceProductVariantId: row.serviceProductVariantId,
          marketTypeId: row.marketTypeId,
          regionId: row.regionId,
          countryId: row.countryId,
          cityId: row.cityId,
          marketGroupId: row.marketGroupId,
          ruleTypeId: row.ruleTypeId,
          fromDate: row.fromDate ?? "",
          toDate: row.toDate ?? "",
          isActive: row.isActive,
        }
      : blankValues(),
  });

  const selectedOptionId = watch("serviceProductOptionId");
  const selectedMarketTypeId = watch("marketTypeId");
  const marketTypeCode = marketTypes.find((t) => t.marketTypeKey === selectedMarketTypeId)?.marketTypeCode.toUpperCase();

  useEffect(() => {
    if (!selectedOptionId) {
      setVariants([]);
      return;
    }
    listServiceProductVariants({ serviceProductOptionId: selectedOptionId }).then(setVariants).catch(() => setVariants([]));
  }, [selectedOptionId]);

  function selectMarketType(id: number) {
    setValue("marketTypeId", id, { shouldValidate: true });
    setValue("regionId", null);
    setValue("countryId", null);
    setValue("cityId", null);
    setValue("marketGroupId", null);
  }

  async function submit(values: FormValues) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    if (marketTypeCode === "COUNTRY" && !values.countryId) {
      toast.error("Select a country.");
      return;
    }
    if (marketTypeCode === "REGION" && !values.regionId) {
      toast.error("Select a region.");
      return;
    }
    if (marketTypeCode === "CITY" && !values.cityId) {
      toast.error("Select a city.");
      return;
    }
    if (marketTypeCode === "MARKET_GROUP" && !values.marketGroupId) {
      toast.error("Select a market group.");
      return;
    }

    const payload = {
      serviceProductId: product.serviceProductId,
      serviceProductSupplierId: values.serviceProductSupplierId,
      serviceProductOptionId: values.serviceProductOptionId,
      serviceProductVariantId: values.serviceProductVariantId,
      marketTypeId: values.marketTypeId,
      regionId: values.regionId,
      countryId: values.countryId,
      cityId: values.cityId,
      marketGroupId: values.marketGroupId,
      ruleTypeId: values.ruleTypeId,
      fromDate: values.fromDate || null,
      toDate: values.toDate || null,
      isActive: values.isActive,
    };

    try {
      if (mode === "edit" && row) {
        await updateServiceProductMarketRule(row.serviceProductMarketRuleId, { ...payload, modifiedBy: userKey });
        toast.success("Market rule updated");
      } else {
        await createServiceProductMarketRule({ ...payload, createdBy: userKey });
        toast.success("Market rule created");
      }
      await onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof ServiceProductMarketRulesApiError ? error.message : "Could not save market rule");
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <h2 className="text-base font-semibold">{mode === "create" ? "Add market rule" : mode === "edit" ? "Edit market rule" : "Market rule details"}</h2>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit(submit)} className="grid grid-cols-2 gap-3 sm:grid-cols-4" noValidate>
        <div className="space-y-1">
          <Label required>Market type</Label>
          <Controller
            control={control}
            name="marketTypeId"
            render={({ field }) => (
              <Select value={field.value ? String(field.value) : ""} onValueChange={(v) => selectMarketType(Number(v))} disabled={isReadOnly}>
                <SelectTrigger className="h-10 w-full min-w-0" aria-invalid={!!errors.marketTypeId}>
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value) return "Select type";
                      return marketTypes.find((t) => String(t.marketTypeKey) === value)?.marketTypeName ?? value;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {marketTypes.map((t) => (
                    <SelectItem key={t.marketTypeKey} value={String(t.marketTypeKey)}>
                      {t.marketTypeName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.marketTypeId && <p className="text-sm text-destructive">{errors.marketTypeId.message}</p>}
        </div>

        <div className="space-y-1">
          <Label required>Rule type</Label>
          <Controller
            control={control}
            name="ruleTypeId"
            render={({ field }) => (
              <Select value={field.value ? String(field.value) : ""} onValueChange={(v) => field.onChange(Number(v))} disabled={isReadOnly}>
                <SelectTrigger className="h-10 w-full min-w-0" aria-invalid={!!errors.ruleTypeId}>
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value) return "Select rule type";
                      return ruleTypes.find((t) => String(t.ruleTypeId) === value)?.ruleTypeName ?? value;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ruleTypes.map((t) => (
                    <SelectItem key={t.ruleTypeId} value={String(t.ruleTypeId)}>
                      {t.ruleTypeName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.ruleTypeId && <p className="text-sm text-destructive">{errors.ruleTypeId.message}</p>}
        </div>

        {marketTypeCode === "COUNTRY" && (
          <div className="space-y-1">
            <Label required>Country</Label>
            <Controller
              control={control}
              name="countryId"
              render={({ field }) => (
                <Select value={field.value ? String(field.value) : ""} onValueChange={(v) => field.onChange(v ? Number(v) : null)} disabled={isReadOnly}>
                  <SelectTrigger className="h-10 w-full min-w-0">
                    <SelectValue>
                      {(value: string | null) => {
                        if (!value) return "Select country";
                        return countries.find((c) => String(c.countryKey) === value)?.name ?? value;
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
              )}
            />
          </div>
        )}

        {marketTypeCode === "REGION" && (
          <div className="space-y-1">
            <Label required>Region</Label>
            <Controller
              control={control}
              name="regionId"
              render={({ field }) => (
                <Select value={field.value ? String(field.value) : ""} onValueChange={(v) => field.onChange(v ? Number(v) : null)} disabled={isReadOnly}>
                  <SelectTrigger className="h-10 w-full min-w-0">
                    <SelectValue>
                      {(value: string | null) => {
                        if (!value) return "Select region";
                        return regions.find((r) => String(r.regionId) === value)?.regionName ?? value;
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {regions.map((r) => (
                      <SelectItem key={r.regionId} value={String(r.regionId)}>
                        {r.regionName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        )}

        {marketTypeCode === "CITY" && (
          <div className="space-y-1">
            <Label required>City</Label>
            <Controller
              control={control}
              name="cityId"
              render={({ field }) => (
                <Select value={field.value ? String(field.value) : ""} onValueChange={(v) => field.onChange(v ? Number(v) : null)} disabled={isReadOnly}>
                  <SelectTrigger className="h-10 w-full min-w-0">
                    <SelectValue>
                      {(value: string | null) => {
                        if (!value) return "Select city";
                        return cities.find((c) => String(c.cityKey) === value)?.name ?? value;
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
              )}
            />
          </div>
        )}

        {marketTypeCode === "MARKET_GROUP" && (
          <div className="space-y-1">
            <Label required>Market group</Label>
            <Controller
              control={control}
              name="marketGroupId"
              render={({ field }) => (
                <Select value={field.value ? String(field.value) : ""} onValueChange={(v) => field.onChange(v ? Number(v) : null)} disabled={isReadOnly}>
                  <SelectTrigger className="h-10 w-full min-w-0">
                    <SelectValue>
                      {(value: string | null) => {
                        if (!value) return "Select market group";
                        return marketGroups.find((g) => String(g.marketGroupKey) === value)?.marketGroupName ?? value;
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {marketGroups.map((g) => (
                      <SelectItem key={g.marketGroupKey} value={String(g.marketGroupKey)}>
                        {g.marketGroupName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        )}

        <div className="space-y-1">
          <Label>Supplier scope</Label>
          <Controller
            control={control}
            name="serviceProductSupplierId"
            render={({ field }) => (
              <Select value={field.value ? String(field.value) : NONE} onValueChange={(v) => field.onChange(!v || v === NONE ? null : Number(v))} disabled={isReadOnly}>
                <SelectTrigger className="h-10 w-full min-w-0">
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value || value === NONE) return "All suppliers";
                      return supplierLinks.find((s) => String(s.serviceProductSupplierId) === value)?.supplierName ?? value;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>All suppliers</SelectItem>
                  {supplierLinks.map((s) => (
                    <SelectItem key={s.serviceProductSupplierId} value={String(s.serviceProductSupplierId)}>
                      {s.supplierName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1">
          <Label>Option scope</Label>
          <Controller
            control={control}
            name="serviceProductOptionId"
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : NONE}
                onValueChange={(v) => {
                  field.onChange(!v || v === NONE ? null : Number(v));
                  setValue("serviceProductVariantId", null);
                }}
                disabled={isReadOnly}
              >
                <SelectTrigger className="h-10 w-full min-w-0">
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value || value === NONE) return "All options";
                      return options.find((o) => String(o.serviceProductOptionId) === value)?.optionName ?? value;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>All options</SelectItem>
                  {options.map((o) => (
                    <SelectItem key={o.serviceProductOptionId} value={String(o.serviceProductOptionId)}>
                      {o.optionName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1">
          <Label>Variant scope</Label>
          <Controller
            control={control}
            name="serviceProductVariantId"
            render={({ field }) => (
              <Select value={field.value ? String(field.value) : NONE} onValueChange={(v) => field.onChange(!v || v === NONE ? null : Number(v))} disabled={isReadOnly || !selectedOptionId}>
                <SelectTrigger className="h-10 w-full min-w-0">
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value || value === NONE) return "All variants";
                      return variants.find((v) => String(v.serviceProductVariantId) === value)?.variantName ?? value;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>All variants</SelectItem>
                  {variants.map((v) => (
                    <SelectItem key={v.serviceProductVariantId} value={String(v.serviceProductVariantId)}>
                      {v.variantName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="fromDate">From date</Label>
          <Input id="fromDate" type="date" disabled={isReadOnly} {...register("fromDate")} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="toDate">To date</Label>
          <Input id="toDate" type="date" disabled={isReadOnly} {...register("toDate")} />
          {errors.toDate && <p className="text-sm text-destructive">{errors.toDate.message}</p>}
        </div>

        <div className="flex items-end pb-2">
          <Controller
            control={control}
            name="isActive"
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} disabled={isReadOnly} />
                Active
              </label>
            )}
          />
        </div>

        {!isReadOnly && (
          <div className="flex items-center gap-2 sm:col-span-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "edit" ? "Save" : "Create"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        )}
      </form>
    </Card>
  );
}

export function ProductMarketRuleTab({ product, roleDef }: { product: ServiceProduct; roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const [supplierLinks, setSupplierLinks] = useState<ServiceProductSupplier[]>([]);
  const [options, setOptions] = useState<ServiceProductOption[]>([]);
  const [marketTypes, setMarketTypes] = useState<MarketType[]>([]);
  const [ruleTypes, setRuleTypes] = useState<RuleType[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [marketGroups, setMarketGroups] = useState<MarketGroup[]>([]);
  const [rows, setRows] = useState<ServiceProductMarketRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<ServiceProductMarketRule | undefined>();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const canEdit = can(roleDef, "serviceProductMarketRule", "edit");
  const canCreate = can(roleDef, "serviceProductMarketRule", "create");
  const canDelete = can(roleDef, "serviceProductMarketRule", "delete");
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  useEffect(() => {
    Promise.all([
      ensureDefaultMarketTypes({ tenantId: product.tenantId, companyId: product.companyId, createdBy: userKey || 1 }),
      listRuleTypes({ activeOnly: true }),
      listCountries({ activeOnly: true }),
      listRegions({ activeOnly: true }),
      listCities({ activeOnly: true }),
      listMarketGroups({ tenantId: product.tenantId, companyId: product.companyId, activeOnly: true }),
    ])
      .then(([marketTypeRows, ruleTypeRows, countryRows, regionRows, cityRows, groupRows]) => {
        setMarketTypes(marketTypeRows);
        setRuleTypes(ruleTypeRows);
        setCountries(countryRows);
        setRegions(regionRows);
        setCities(cityRows);
        setMarketGroups(groupRows);
      })
      .catch(() => toast.error("Failed to load market rule reference data"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.tenantId, product.companyId]);

  useEffect(() => {
    Promise.all([
      listServiceProductSuppliers({ serviceProductId: product.serviceProductId, activeOnly: true }),
      listServiceProductOptions({ serviceProductId: product.serviceProductId }),
    ]).then(([supplierRows, optionRows]) => {
      setSupplierLinks(supplierRows);
      setOptions(optionRows);
    });
  }, [product.serviceProductId]);

  async function refreshRows() {
    setLoading(true);
    try {
      const rowsResult = await listServiceProductMarketRules({ serviceProductId: product.serviceProductId });
      setRows(rowsResult);
    } catch (error) {
      toast.error(error instanceof ServiceProductMarketRulesApiError ? error.message : "Failed to load market rules");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.serviceProductId]);

  const visible = useMemo(() => {
    let result = rows;
    if (statusFilter === "active") result = result.filter((r) => r.isActive);
    if (statusFilter === "inactive") result = result.filter((r) => !r.isActive);
    return result;
  }, [rows, statusFilter]);

  async function toggleActive(row: ServiceProductMarketRule) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      await setServiceProductMarketRuleActive(row.serviceProductMarketRuleId, !row.isActive, userKey);
      await refreshRows();
      toast.success(row.isActive ? "Rule deactivated" : "Rule activated");
    } catch (error) {
      toast.error(error instanceof ServiceProductMarketRulesApiError ? error.message : "Could not update status");
    }
  }

  async function removeRow(row: ServiceProductMarketRule) {
    try {
      await deleteServiceProductMarketRule(row.serviceProductMarketRuleId);
      await refreshRows();
      toast.success("Market rule deleted");
    } catch (error) {
      toast.error(error instanceof ServiceProductMarketRulesApiError ? error.message : "Could not delete market rule");
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Market Rules"
        description="Market include/exclude rules for this product — restrict or open sale to a Country, Region, City, or Market Group."
        actions={
          canCreate && panelMode === "closed" && marketTypes.length > 0 && ruleTypes.length > 0 ? (
            <Button onClick={() => { setTarget(undefined); setPanelMode("create"); }}>
              <Plus className="h-4 w-4" />
              Add rule
            </Button>
          ) : undefined
        }
      />

      {panelMode !== "closed" && (
        <MarketRulePanel
          mode={panelMode}
          row={target}
          product={product}
          supplierLinks={supplierLinks}
          options={options}
          marketTypes={marketTypes}
          ruleTypes={ruleTypes}
          countries={countries}
          regions={regions}
          cities={cities}
          marketGroups={marketGroups}
          userKey={userKey}
          onSaved={refreshRows}
          onClose={() => { setPanelMode("closed"); setTarget(undefined); }}
        />
      )}

      {rows.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter((value as StatusFilter) ?? "all")}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <Card>
        {loading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading market rules…</p>
        ) : rows.length === 0 ? (
          <EmptyState icon={Globe2} tone="primary" heading="No market rules yet" description="Add a market rule for this product." size="compact" />
        ) : visible.length === 0 ? (
          <EmptyState icon={Globe2} tone="muted" heading="No matching rules" description="Try a different status filter." size="compact" />
        ) : (
          <Table className="table-fixed border-collapse text-xs [&_th]:h-auto [&_th]:whitespace-normal [&_td]:whitespace-normal">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[16%] px-2 py-1.5">Rule</TableHead>
                <TableHead className="w-[16%] px-2 py-1.5">Market type</TableHead>
                <TableHead className="w-[22%] px-2 py-1.5">Target</TableHead>
                <TableHead className="w-[18%] px-2 py-1.5">Valid</TableHead>
                <TableHead className="w-[10%] px-2 py-1.5">Status</TableHead>
                <TableHead className="w-[18%] px-2 py-1.5 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row) => (
                <TableRow key={row.serviceProductMarketRuleId}>
                  <TableCell className="px-2 py-1.5 leading-tight">
                    <Badge variant={row.ruleTypeCode === "BLOCK" ? "secondary" : "default"} className="px-1.5 py-0 text-[11px]">
                      {row.ruleTypeName ?? `#${row.ruleTypeId}`}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">{row.marketTypeName ?? `#${row.marketTypeId}`}</TableCell>
                  <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">
                    {row.countryName ?? row.regionName ?? row.cityName ?? row.marketGroupName ?? "—"}
                  </TableCell>
                  <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">
                    {row.fromDate ?? "—"}
                    <br />→ {row.toDate ?? "—"}
                  </TableCell>
                  <TableCell className="px-2 py-1.5">
                    <Badge variant={row.isActive ? "default" : "secondary"} className="px-1.5 py-0 text-[11px]">
                      {row.isActive ? "active" : "inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-2 py-1.5 text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      <Tooltip>
                        <TooltipTrigger render={<Button variant="ghost" size="icon-sm" aria-label="View" onClick={() => { setTarget(row); setPanelMode("view"); }} />}>
                          <Eye className="h-3.5 w-3.5" />
                        </TooltipTrigger>
                        <TooltipContent>View</TooltipContent>
                      </Tooltip>
                      {canEdit && (
                        <>
                          <Tooltip>
                            <TooltipTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Edit" onClick={() => { setTarget(row); setPanelMode("edit"); }} />}>
                              <Pencil className="h-3.5 w-3.5" />
                            </TooltipTrigger>
                            <TooltipContent>Edit</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger render={<Button variant="ghost" size="icon-sm" aria-label={row.isActive ? "Deactivate" : "Activate"} onClick={() => void toggleActive(row)} />}>
                              {row.isActive ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                            </TooltipTrigger>
                            <TooltipContent>{row.isActive ? "Deactivate" : "Activate"}</TooltipContent>
                          </Tooltip>
                        </>
                      )}
                      {canDelete && (
                        <Tooltip>
                          <TooltipTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Delete" onClick={() => void removeRow(row)} />}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </TooltipTrigger>
                          <TooltipContent>Delete</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
