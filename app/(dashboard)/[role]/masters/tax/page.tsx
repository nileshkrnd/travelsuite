"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Landmark, Loader2, MoreHorizontal, Pencil, Plus, Power, PowerOff, Search, Trash2 } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SearchableCombobox } from "@/components/shared/SearchableCombobox";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { resolveSessionCompanyKey } from "@/lib/session-company";
import { TAX_APPLICATION_BASIS_OPTIONS } from "@/lib/constants/tax-application-basis";
import { listCountries } from "@/lib/services/countries.service";
import { listRegions } from "@/lib/services/regions.service";
import { listCurrencies } from "@/lib/services/currencies.service";
import {
  ensureDefaultTaxTypes,
  listTaxes,
  createTax,
  updateTax,
  setTaxActive,
  deleteTax,
  TaxesApiError,
} from "@/lib/services/taxes.service";
import { can } from "@/config/permissions";
import type { Country, Region, Currency, TaxType, Tax, RoleDef } from "@/types";

const schema = z
  .object({
    taxTypeId: z.number().int().positive("Choose a tax type"),
    taxCode: z.string().trim().min(1, "Code is required").max(50),
    taxName: z.string().trim().min(1, "Name is required").max(200),
    countryId: z.number().int().positive().nullable(),
    regionId: z.number().int().positive().nullable(),
    calculationType: z.enum(["PERCENTAGE", "FIXED"]),
    defaultRate: z.string(),
    defaultAmount: z.string(),
    currencyId: z.number().int().positive().nullable(),
    applicationBasis: z.string().min(1, "Choose an application basis"),
    isInclusiveDefault: z.boolean(),
    isCompound: z.boolean(),
    isActive: z.boolean(),
  })
  .refine((v) => v.calculationType !== "PERCENTAGE" || v.defaultRate.trim() !== "", {
    message: "Default rate is required",
    path: ["defaultRate"],
  })
  .refine((v) => v.calculationType !== "FIXED" || v.defaultAmount.trim() !== "", {
    message: "Default amount is required",
    path: ["defaultAmount"],
  });

type FormValues = z.infer<typeof schema>;

function defaultValues(): FormValues {
  return {
    taxTypeId: 0,
    taxCode: "",
    taxName: "",
    countryId: null,
    regionId: null,
    calculationType: "PERCENTAGE",
    defaultRate: "",
    defaultAmount: "",
    currencyId: null,
    applicationBasis: "TOTAL",
    isInclusiveDefault: false,
    isCompound: false,
    isActive: true,
  };
}

function valuesFromTax(tax: Tax): FormValues {
  return {
    taxTypeId: tax.taxTypeId,
    taxCode: tax.taxCode,
    taxName: tax.taxName,
    countryId: tax.countryId,
    regionId: tax.regionId,
    calculationType: tax.calculationType,
    defaultRate: tax.defaultRate != null ? String(tax.defaultRate) : "",
    defaultAmount: tax.defaultAmount != null ? String(tax.defaultAmount) : "",
    currencyId: tax.currencyId,
    applicationBasis: tax.applicationBasis,
    isInclusiveDefault: tax.isInclusiveDefault,
    isCompound: tax.isCompound,
    isActive: tax.isActive,
  };
}

function TaxDialog({
  open,
  onOpenChange,
  tax,
  taxTypes,
  countries,
  regions,
  currencies,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tax?: Tax;
  taxTypes: TaxType[];
  countries: Country[];
  regions: Region[];
  currencies: Currency[];
  onSaved: (tax: Tax) => void;
}) {
  const sessionUser = useSessionStore((s) => s.user);
  const activeTenant = useTenantStore((s) => s.tenant);
  const tenantKey = sessionUser?.tenantKey ?? activeTenant.tenantKey ?? 0;
  const companyKey = resolveSessionCompanyKey(sessionUser) ?? 0;
  const actorKey = sessionUser?.userKey ?? 0;

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: tax ? valuesFromTax(tax) : defaultValues(),
  });

  useEffect(() => {
    if (open) reset(tax ? valuesFromTax(tax) : defaultValues());
  }, [open, tax, reset]);

  const calculationType = watch("calculationType");

  const countryOptions = useMemo(
    () => [
      { value: 0, label: "Any country" },
      ...countries.map((c) => ({ value: c.countryKey, label: c.name, sublabel: c.code })),
    ],
    [countries]
  );
  const regionOptions = useMemo(
    () => [
      { value: 0, label: "Any region" },
      ...regions.map((r) => ({ value: r.regionId, label: r.regionName, sublabel: r.regionCode })),
    ],
    [regions]
  );
  const currencyOptions = useMemo(
    () => currencies.map((c) => ({ value: c.currencyKey, label: `${c.name} (${c.code})` })),
    [currencies]
  );

  async function onSubmit(values: FormValues) {
    if (tenantKey <= 0 || companyKey <= 0 || !actorKey) {
      toast.error("Missing session context — sign in again.");
      return;
    }
    const payload = {
      tenantId: tenantKey,
      companyId: companyKey,
      taxTypeId: values.taxTypeId,
      taxCode: values.taxCode,
      taxName: values.taxName,
      countryId: values.countryId,
      regionId: values.regionId,
      calculationType: values.calculationType,
      defaultRate: values.calculationType === "PERCENTAGE" ? Number(values.defaultRate) : null,
      defaultAmount: values.calculationType === "FIXED" ? Number(values.defaultAmount) : null,
      currencyId: values.currencyId,
      applicationBasis: values.applicationBasis,
      isInclusiveDefault: values.isInclusiveDefault,
      isCompound: values.isCompound,
      isActive: values.isActive,
    };
    try {
      const saved = tax
        ? await updateTax(tax.taxKey, { ...payload, modifiedBy: actorKey })
        : await createTax({ ...payload, createdBy: actorKey });
      toast.success(tax ? "Tax saved" : "Tax created");
      onSaved(saved);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof TaxesApiError ? err.message : "Could not save tax");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{tax ? "Edit tax" : "Add tax"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label required>Tax type</Label>
              <Controller
                control={control}
                name="taxTypeId"
                render={({ field }) => (
                  <Select
                    value={field.value > 0 ? String(field.value) : ""}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue>
                        {() => taxTypes.find((t) => t.taxTypeKey === field.value)?.taxTypeName ?? "Select"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {taxTypes.map((t) => (
                        <SelectItem key={t.taxTypeKey} value={String(t.taxTypeKey)}>
                          {t.taxTypeName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.taxTypeId && <p className="text-xs text-destructive">{errors.taxTypeId.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label required>Code</Label>
              <Input {...register("taxCode")} placeholder="QA_VAT" className="font-mono uppercase" />
              {errors.taxCode && <p className="text-xs text-destructive">{errors.taxCode.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label required>Name</Label>
            <Input {...register("taxName")} placeholder="Qatar VAT" />
            {errors.taxName && <p className="text-xs text-destructive">{errors.taxName.message}</p>}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Country</Label>
              <Controller
                control={control}
                name="countryId"
                render={({ field }) => (
                  <SearchableCombobox
                    value={field.value ?? 0}
                    onChange={(v) => field.onChange(v === 0 ? null : v)}
                    options={countryOptions}
                    placeholder="Any country"
                  />
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Region</Label>
              <Controller
                control={control}
                name="regionId"
                render={({ field }) => (
                  <SearchableCombobox
                    value={field.value ?? 0}
                    onChange={(v) => field.onChange(v === 0 ? null : v)}
                    options={regionOptions}
                    placeholder="Any region"
                  />
                )}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label required>Calculation</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={calculationType === "PERCENTAGE" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setValue("calculationType", "PERCENTAGE")}
              >
                Percentage
              </Button>
              <Button
                type="button"
                variant={calculationType === "FIXED" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setValue("calculationType", "FIXED")}
              >
                Fixed amount
              </Button>
            </div>
          </div>

          {calculationType === "PERCENTAGE" ? (
            <div className="space-y-1.5">
              <Label required>Default rate (%)</Label>
              <Input type="number" min={0} step="0.01" {...register("defaultRate")} placeholder="5" />
              {errors.defaultRate && <p className="text-xs text-destructive">{errors.defaultRate.message}</p>}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label required>Default amount</Label>
                <Input type="number" min={0} step="0.01" {...register("defaultAmount")} placeholder="20" />
                {errors.defaultAmount && (
                  <p className="text-xs text-destructive">{errors.defaultAmount.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Controller
                  control={control}
                  name="currencyId"
                  render={({ field }) => (
                    <SearchableCombobox
                      value={field.value}
                      onChange={(v) => field.onChange(v)}
                      options={currencyOptions}
                      placeholder="Select currency…"
                    />
                  )}
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label required>Application basis</Label>
            <Controller
              control={control}
              name="applicationBasis"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue>
                      {() =>
                        TAX_APPLICATION_BASIS_OPTIONS.find((o) => o.code === field.value)?.label ?? "Select"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {TAX_APPLICATION_BASIS_OPTIONS.map((o) => (
                      <SelectItem key={o.code} value={o.code}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={watch("isInclusiveDefault")}
                onCheckedChange={(c) => setValue("isInclusiveDefault", c === true)}
              />
              Inclusive by default
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={watch("isCompound")} onCheckedChange={(c) => setValue("isCompound", c === true)} />
              Compound tax
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={watch("isActive")} onCheckedChange={(c) => setValue("isActive", c === true)} />
              Active
            </label>
          </div>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {tax ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TaxMasterList({ roleDef }: { roleDef: RoleDef }) {
  const sessionUser = useSessionStore((s) => s.user);
  const activeTenant = useTenantStore((s) => s.tenant);
  const tenantKey = sessionUser?.tenantKey ?? activeTenant.tenantKey ?? 0;
  const companyKey = resolveSessionCompanyKey(sessionUser) ?? 0;
  const actorKey = sessionUser?.userKey ?? 0;

  const canEdit = can(roleDef, "tax", "edit");
  const canCreate = can(roleDef, "tax", "create");
  const canDelete = can(roleDef, "tax", "delete");

  const [loading, setLoading] = useState(true);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [taxTypes, setTaxTypes] = useState<TaxType[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Tax | undefined>(undefined);

  async function refresh() {
    const rows = await listTaxes({ tenantId: tenantKey, companyId: companyKey });
    setTaxes(rows);
  }

  useEffect(() => {
    if (tenantKey <= 0 || companyKey <= 0 || !actorKey) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      ensureDefaultTaxTypes({ tenantId: tenantKey, companyId: companyKey, createdBy: actorKey }),
      listTaxes({ tenantId: tenantKey, companyId: companyKey }),
      listCountries({ activeOnly: true }),
      listRegions({ activeOnly: true }),
      listCurrencies({ activeOnly: true }),
    ])
      .then(([typeRows, taxRows, countryRows, regionRows, currencyRows]) => {
        if (cancelled) return;
        setTaxTypes(typeRows);
        setTaxes(taxRows);
        setCountries(countryRows);
        setRegions(regionRows);
        setCurrencies(currencyRows);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load taxes");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantKey, companyKey, actorKey]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return taxes;
    return taxes.filter(
      (t) => t.taxCode.toLowerCase().includes(term) || t.taxName.toLowerCase().includes(term)
    );
  }, [taxes, search]);

  async function toggleStatus(tax: Tax) {
    if (!actorKey) return;
    try {
      const saved = await setTaxActive(tax.taxKey, !tax.isActive, actorKey);
      setTaxes((prev) => prev.map((t) => (t.taxKey === saved.taxKey ? saved : t)));
      toast.success(saved.isActive ? "Tax activated" : "Tax deactivated");
    } catch (err) {
      toast.error(err instanceof TaxesApiError ? err.message : "Could not update status");
    }
  }

  async function removeTax(tax: Tax) {
    if (!canDelete) return;
    if (!window.confirm(`Delete tax "${tax.taxName}"?`)) return;
    try {
      await deleteTax(tax.taxKey);
      setTaxes((prev) => prev.filter((t) => t.taxKey !== tax.taxKey));
      toast.success("Tax deleted");
    } catch (err) {
      toast.error(err instanceof TaxesApiError ? err.message : "Could not delete");
    }
  }

  function rateLabel(tax: Tax) {
    if (tax.calculationType === "PERCENTAGE") return `${tax.defaultRate ?? 0}%`;
    return `${tax.currencyCode ?? ""} ${tax.defaultAmount ?? 0}`.trim();
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Tax"
        description="Tax definitions (VAT, tourism tax, service charge, …) used across contract taxes."
        actions={
          canCreate ? (
            <Button
              onClick={() => {
                setEditing(undefined);
                setDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Add tax
            </Button>
          ) : undefined
        }
      />

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search code or name…"
          className="ps-9"
        />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading taxes…</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Landmark}
          tone="muted"
          heading={taxes.length === 0 ? "No taxes yet" : "No matches"}
          description={
            taxes.length === 0
              ? "Add tax definitions — VAT, tourism tax, service charge, and more."
              : "Try a different search term."
          }
          action={
            taxes.length === 0 && canCreate ? (
              <Button
                onClick={() => {
                  setEditing(undefined);
                  setDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Add tax
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Rate / Amount</TableHead>
                <TableHead>Basis</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((tax) => (
                <TableRow key={tax.taxKey}>
                  <TableCell className="font-mono text-xs">{tax.taxCode}</TableCell>
                  <TableCell>{tax.taxName}</TableCell>
                  <TableCell>{tax.taxTypeName ?? "—"}</TableCell>
                  <TableCell>{tax.countryName ?? tax.regionName ?? "Any"}</TableCell>
                  <TableCell className="font-mono text-sm">{rateLabel(tax)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {TAX_APPLICATION_BASIS_OPTIONS.find((o) => o.code === tax.applicationBasis)?.label ??
                      tax.applicationBasis}
                  </TableCell>
                  <TableCell>
                    <Badge variant={tax.isActive ? "default" : "secondary"}>
                      {tax.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {(canEdit || canDelete) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canEdit && (
                            <DropdownMenuItem
                              onClick={() => {
                                setEditing(tax);
                                setDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {canEdit && (
                            <DropdownMenuItem onClick={() => void toggleStatus(tax)}>
                              {tax.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                              {tax.isActive ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <DropdownMenuItem variant="destructive" onClick={() => void removeTax(tax)}>
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <TaxDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        tax={editing}
        taxTypes={taxTypes}
        countries={countries}
        regions={regions}
        currencies={currencies}
        onSaved={() => void refresh()}
      />
    </div>
  );
}

export default function TaxMasterPage() {
  return <AccessGate module="tax">{(roleDef) => <TaxMasterList roleDef={roleDef} />}</AccessGate>;
}
