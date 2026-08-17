"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableCombobox } from "@/components/shared/SearchableCombobox";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { resolveSessionCompanyKey } from "@/lib/session-company";
import { TAX_APPLICATION_BASIS_OPTIONS } from "@/lib/constants/tax-application-basis";
import { listTaxes } from "@/lib/services/taxes.service";
import { listCurrencies } from "@/lib/services/currencies.service";
import {
  listPropertyContractTaxes,
  createPropertyContractTax,
  updatePropertyContractTax,
  PropertyContractTaxApiError,
} from "@/lib/services/property-contract-taxes.service";
import type { Tax, Currency, PropertyContract, PropertyContractTax } from "@/types";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function sanitizeAmountInput(raw: string): string {
  let value = raw.replace(/[^0-9.]/g, "");
  const firstDot = value.indexOf(".");
  if (firstDot !== -1) {
    value = value.slice(0, firstDot + 1) + value.slice(firstDot + 1).replace(/\./g, "");
  }
  return value;
}

function isNegative(value: string | undefined): boolean {
  if (!value || value.trim() === "") return false;
  const n = Number(value);
  return !Number.isNaN(n) && n < 0;
}

const rowSchema = z
  .object({
    taxId: z.number().int().positive("Choose a tax"),
    taxName: z.string().trim().min(1, "Name is required").max(200),
    calculationType: z.enum(["PERCENTAGE", "FIXED"]),
    taxRate: z.string(),
    taxAmount: z.string(),
    currencyId: z.number().int().positive().nullable(),
    applicationBasis: z.string().min(1, "Choose a basis"),
    isInclusive: z.boolean(),
    isCompound: z.boolean(),
    sequenceNo: z.number().int().min(0),
    fromDate: z.string().min(1, "Required"),
    toDate: z.string(),
    isActive: z.boolean(),
    remarks: z.string(),
  })
  .refine((v) => v.calculationType !== "PERCENTAGE" || v.taxRate.trim() !== "", {
    message: "Rate is required",
    path: ["taxRate"],
  })
  .refine((v) => v.calculationType !== "PERCENTAGE" || !isNegative(v.taxRate), {
    message: "Rate cannot be negative",
    path: ["taxRate"],
  })
  .refine((v) => v.calculationType !== "FIXED" || v.taxAmount.trim() !== "", {
    message: "Amount is required",
    path: ["taxAmount"],
  })
  .refine((v) => v.calculationType !== "FIXED" || !isNegative(v.taxAmount), {
    message: "Amount cannot be negative",
    path: ["taxAmount"],
  })
  .refine((v) => !v.toDate || v.fromDate <= v.toDate, {
    message: "From ≤ to date",
    path: ["toDate"],
  });

const schema = z.object({
  rows: z.array(rowSchema).min(1, "Add at least one tax"),
});

type RowValues = z.infer<typeof rowSchema>;
type FormValues = z.infer<typeof schema>;

function blankRow(sequenceNo: number): RowValues {
  return {
    taxId: 0,
    taxName: "",
    calculationType: "PERCENTAGE",
    taxRate: "",
    taxAmount: "",
    currencyId: null,
    applicationBasis: "TOTAL",
    isInclusive: false,
    isCompound: false,
    sequenceNo,
    fromDate: todayIso(),
    toDate: "",
    isActive: true,
    remarks: "",
  };
}

function rowFromEntry(entry: PropertyContractTax): RowValues {
  return {
    taxId: entry.taxId,
    taxName: entry.taxName,
    calculationType: entry.calculationType,
    taxRate: entry.taxRate != null ? String(entry.taxRate) : "",
    taxAmount: entry.taxAmount != null ? String(entry.taxAmount) : "",
    currencyId: entry.currencyId,
    applicationBasis: entry.applicationBasis,
    isInclusive: entry.isInclusive,
    isCompound: entry.isCompound,
    sequenceNo: entry.sequenceNo,
    fromDate: entry.fromDate,
    toDate: entry.toDate ?? "",
    isActive: entry.isActive,
    remarks: entry.remarks ?? "",
  };
}

/** Create or edit contract taxes — spreadsheet-style multi-row entry when adding, single row when editing. */
export function PropertyContractTaxForm({
  lockedContract,
  entry,
}: {
  lockedContract: PropertyContract;
  entry?: PropertyContractTax;
}) {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();
  const sessionUser = useSessionStore((s) => s.user);
  const activeTenant = useTenantStore((s) => s.tenant);
  const tenantKey = sessionUser?.tenantKey ?? activeTenant.tenantKey ?? 0;
  const companyKey = resolveSessionCompanyKey(sessionUser) ?? 0;
  const actorKey = sessionUser?.userKey ?? 0;

  const returnHref = `/${role}/extranet/contracts/${lockedContract.propertyContractKey}?tab=taxes`;
  const isEdit = !!entry;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [existingEntries, setExistingEntries] = useState<PropertyContractTax[]>([]);

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { rows: [entry ? rowFromEntry(entry) : blankRow(1)] },
  });

  const rowArray = useFieldArray({ control, name: "rows" });
  const rows = watch("rows");

  useEffect(() => {
    if (tenantKey <= 0 || companyKey <= 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      listTaxes({ tenantId: tenantKey, companyId: companyKey, activeOnly: true }),
      listCurrencies({ activeOnly: true }),
      isEdit
        ? Promise.resolve([] as PropertyContractTax[])
        : listPropertyContractTaxes({ propertyContractId: lockedContract.propertyContractKey }),
    ])
      .then(([taxRows, currencyRows, contractTaxRows]) => {
        if (cancelled) return;
        setTaxes(taxRows);
        setCurrencies(currencyRows);
        setExistingEntries(contractTaxRows);
        if (!isEdit) {
          const nextSeq = contractTaxRows.reduce((max, r) => Math.max(max, r.sequenceNo), 0) + 1;
          setValue("rows.0.sequenceNo", nextSeq);
        }
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
  }, [tenantKey, companyKey, lockedContract.propertyContractKey, isEdit]);

  const taxOptions = useMemo(
    () => taxes.map((t) => ({ value: t.taxKey, label: t.taxName, sublabel: t.taxCode })),
    [taxes]
  );
  const currencyOptions = useMemo(
    () => currencies.map((c) => ({ value: c.currencyKey, label: `${c.name} (${c.code})` })),
    [currencies]
  );

  function selectTax(index: number, id: number | null) {
    setValue(`rows.${index}.taxId`, id ?? 0, { shouldValidate: true });
    const tax = taxes.find((t) => t.taxKey === id);
    if (tax && !isEdit) {
      setValue(`rows.${index}.taxName`, tax.taxName);
      setValue(`rows.${index}.calculationType`, tax.calculationType);
      setValue(`rows.${index}.taxRate`, tax.defaultRate != null ? String(tax.defaultRate) : "");
      setValue(`rows.${index}.taxAmount`, tax.defaultAmount != null ? String(tax.defaultAmount) : "");
      setValue(`rows.${index}.currencyId`, tax.currencyId);
      setValue(`rows.${index}.applicationBasis`, tax.applicationBasis);
      setValue(`rows.${index}.isInclusive`, tax.isInclusiveDefault);
      setValue(`rows.${index}.isCompound`, tax.isCompound);
    }
  }

  function addRow() {
    const maxSeq = rows.reduce((max, r) => Math.max(max, r.sequenceNo || 0), 0);
    rowArray.append(blankRow(maxSeq + 1));
  }

  async function onSubmit(values: FormValues) {
    if (tenantKey <= 0 || companyKey <= 0 || !actorKey) {
      toast.error("Missing tenant, company, or user context.");
      return;
    }

    // Strong duplicate guard: same tax cannot appear twice within this batch, nor
    // duplicate a tax already assigned to this contract.
    const existingTaxIds = new Set(existingEntries.map((e) => e.taxId));
    const seenInBatch = new Set<number>();
    const dupTaxNames: string[] = [];
    for (const row of values.rows) {
      if (existingTaxIds.has(row.taxId) || seenInBatch.has(row.taxId)) {
        const label = taxes.find((t) => t.taxKey === row.taxId)?.taxName ?? row.taxName;
        if (!dupTaxNames.includes(label)) dupTaxNames.push(label);
      }
      seenInBatch.add(row.taxId);
    }
    if (dupTaxNames.length > 0) {
      toast.error(`Already assigned to this contract: ${dupTaxNames.join(", ")}`);
      return;
    }

    setSaving(true);

    if (entry) {
      const row = values.rows[0]!;
      const payload = {
        tenantId: tenantKey,
        companyId: companyKey,
        propertyContractId: entry.propertyContractId,
        taxId: row.taxId,
        taxName: row.taxName.trim(),
        calculationType: row.calculationType,
        taxRate: row.calculationType === "PERCENTAGE" ? Number(row.taxRate) : null,
        taxAmount: row.calculationType === "FIXED" ? Number(row.taxAmount) : null,
        currencyId: row.currencyId,
        applicationBasis: row.applicationBasis,
        isInclusive: row.isInclusive,
        isCompound: row.isCompound,
        sequenceNo: row.sequenceNo,
        fromDate: row.fromDate,
        toDate: row.toDate || null,
        isActive: row.isActive,
        remarks: row.remarks.trim() || null,
      };
      try {
        await updatePropertyContractTax(entry.propertyContractTaxKey, { ...payload, modifiedBy: actorKey });
        toast.success("Contract tax saved");
        router.push(returnHref);
      } catch (error) {
        toast.error(error instanceof PropertyContractTaxApiError ? error.message : "Could not save contract tax");
      } finally {
        setSaving(false);
      }
      return;
    }

    let saved = 0;
    const failed: string[] = [];
    for (const row of values.rows) {
      const label = taxes.find((t) => t.taxKey === row.taxId)?.taxName ?? row.taxName;
      try {
        await createPropertyContractTax({
          tenantId: tenantKey,
          companyId: companyKey,
          propertyContractId: lockedContract.propertyContractKey,
          taxId: row.taxId,
          taxName: row.taxName.trim(),
          calculationType: row.calculationType,
          taxRate: row.calculationType === "PERCENTAGE" ? Number(row.taxRate) : null,
          taxAmount: row.calculationType === "FIXED" ? Number(row.taxAmount) : null,
          currencyId: row.currencyId,
          applicationBasis: row.applicationBasis,
          isInclusive: row.isInclusive,
          isCompound: row.isCompound,
          sequenceNo: row.sequenceNo,
          fromDate: row.fromDate,
          toDate: row.toDate || null,
          isActive: row.isActive,
          remarks: row.remarks.trim() || null,
          createdBy: actorKey,
        });
        saved += 1;
      } catch (err) {
        const message = err instanceof PropertyContractTaxApiError ? err.message : "save failed";
        failed.push(`${label} (${message})`);
      }
    }
    setSaving(false);

    if (saved > 0) {
      toast.success(`${saved} tax${saved === 1 ? "" : "es"} added`);
    }
    if (failed.length > 0) {
      toast.error(`Could not add: ${failed.join(", ")}`);
    } else {
      router.push(returnHref);
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
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-full space-y-6">
      <div className="space-y-1 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Contract</p>
        <p className="text-base font-semibold text-foreground">{lockedContract.contractName}</p>
        <p className="text-muted-foreground">{lockedContract.contractNumber}</p>
      </div>

      <div className="space-y-3">
        {rowArray.fields.map((field, index) => {
          const rowErrors = errors.rows?.[index];
          const calcType = rows[index]?.calculationType ?? "PERCENTAGE";
          return (
            <div key={field.id} className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
              {/* Line 1: identity */}
              <div className="flex flex-nowrap items-end gap-2">
                <span className="shrink-0 pb-2 text-xs text-muted-foreground">#{index + 1}</span>
                <div className="min-w-0 flex-1 space-y-1">
                  <span className="text-[10px] font-medium uppercase text-muted-foreground">
                    Tax<span className="text-destructive"> *</span>
                  </span>
                  <Controller
                    control={control}
                    name={`rows.${index}.taxId`}
                    render={({ field: f }) => (
                      <SearchableCombobox
                        value={f.value > 0 ? f.value : null}
                        onChange={(v) => selectTax(index, v)}
                        options={taxOptions}
                        placeholder="Select tax…"
                        emptyLabel="No taxes configured yet — add one under Masters → Tax."
                      />
                    )}
                  />
                  {rowErrors?.taxId && (
                    <p className="text-xs text-destructive">{rowErrors.taxId.message}</p>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <span className="text-[10px] font-medium uppercase text-muted-foreground">Display name</span>
                  <Input
                    {...register(`rows.${index}.taxName`)}
                    placeholder="e.g. VAT"
                    className="h-9 w-full min-w-0"
                  />
                  {rowErrors?.taxName && (
                    <p className="text-xs text-destructive">{rowErrors.taxName.message}</p>
                  )}
                </div>
                <div className="w-24 shrink-0 space-y-1 overflow-hidden">
                  <span className="text-[10px] font-medium uppercase text-muted-foreground">Calc</span>
                  <Controller
                    control={control}
                    name={`rows.${index}.calculationType`}
                    render={({ field: f }) => (
                      <Select value={f.value} onValueChange={f.onChange}>
                        <SelectTrigger className="h-9 w-full min-w-0 overflow-hidden px-2 text-xs">
                          <SelectValue className="truncate">
                            {() => (f.value === "PERCENTAGE" ? "Percentage" : "Fixed")}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                          <SelectItem value="FIXED">Fixed</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="w-20 shrink-0 space-y-1">
                  <span className="text-[10px] font-medium uppercase text-muted-foreground">Rate/Amt</span>
                  <Controller
                    control={control}
                    name={calcType === "PERCENTAGE" ? `rows.${index}.taxRate` : `rows.${index}.taxAmount`}
                    render={({ field: f }) => (
                      <Input
                        type="text"
                        inputMode="decimal"
                        className={`h-9 w-full min-w-0 px-2 text-right font-mono tabular-nums ${
                          isNegative(f.value as string) ? "border-destructive text-destructive" : ""
                        }`}
                        placeholder={calcType === "PERCENTAGE" ? "5" : "20"}
                        value={f.value as string}
                        onChange={(e) => f.onChange(sanitizeAmountInput(e.target.value))}
                      />
                    )}
                  />
                  {calcType === "PERCENTAGE"
                    ? rowErrors?.taxRate && (
                        <p className="text-xs text-destructive">{rowErrors.taxRate.message}</p>
                      )
                    : rowErrors?.taxAmount && (
                        <p className="text-xs text-destructive">{rowErrors.taxAmount.message}</p>
                      )}
                </div>
                <div className="w-28 shrink-0 space-y-1">
                  <span className="text-[10px] font-medium uppercase text-muted-foreground">Currency</span>
                  <Controller
                    control={control}
                    name={`rows.${index}.currencyId`}
                    render={({ field: f }) => (
                      <SearchableCombobox
                        value={f.value}
                        onChange={(v) => f.onChange(v)}
                        options={currencyOptions}
                        placeholder="Currency…"
                        disabled={calcType !== "FIXED"}
                      />
                    )}
                  />
                </div>
                {!isEdit && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="mb-0.5 shrink-0"
                    disabled={rowArray.fields.length <= 1}
                    onClick={() => rowArray.remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Line 2: basis, sequence, flags, dates, remarks */}
              <div className="flex flex-nowrap items-end gap-2">
                <div className="w-32 shrink-0 space-y-1 overflow-hidden">
                  <span className="text-[10px] font-medium uppercase text-muted-foreground">Basis</span>
                  <Controller
                    control={control}
                    name={`rows.${index}.applicationBasis`}
                    render={({ field: f }) => (
                      <Select value={f.value} onValueChange={f.onChange}>
                        <SelectTrigger className="h-9 w-full min-w-0 overflow-hidden px-2 text-xs">
                          <SelectValue placeholder="Select" className="truncate">
                            {() =>
                              TAX_APPLICATION_BASIS_OPTIONS.find((o) => o.code === f.value)?.label ?? "Select"
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
                <div className="w-14 shrink-0 space-y-1">
                  <span className="text-[10px] font-medium uppercase text-muted-foreground">Seq</span>
                  <Input
                    type="number"
                    min={0}
                    className="h-9 w-full min-w-0 px-2"
                    {...register(`rows.${index}.sequenceNo`, { valueAsNumber: true })}
                  />
                </div>
                <div className="shrink-0 space-y-1">
                  <span className="text-[10px] font-medium uppercase text-muted-foreground">Incl.</span>
                  <div className="flex h-9 items-center">
                    <Controller
                      control={control}
                      name={`rows.${index}.isInclusive`}
                      render={({ field: f }) => (
                        <Checkbox checked={f.value} onCheckedChange={(c) => f.onChange(c === true)} />
                      )}
                    />
                  </div>
                </div>
                <div className="shrink-0 space-y-1">
                  <span className="text-[10px] font-medium uppercase text-muted-foreground">Comp.</span>
                  <div className="flex h-9 items-center">
                    <Controller
                      control={control}
                      name={`rows.${index}.isCompound`}
                      render={({ field: f }) => (
                        <Checkbox checked={f.value} onCheckedChange={(c) => f.onChange(c === true)} />
                      )}
                    />
                  </div>
                </div>
                <div className="w-32 shrink-0 space-y-1">
                  <span className="text-[10px] font-medium uppercase text-muted-foreground">From</span>
                  <Input
                    type="date"
                    className="h-9 w-full min-w-0"
                    {...register(`rows.${index}.fromDate`)}
                  />
                  {rowErrors?.fromDate && (
                    <p className="text-xs text-destructive">{rowErrors.fromDate.message}</p>
                  )}
                </div>
                <div className="w-32 shrink-0 space-y-1">
                  <span className="text-[10px] font-medium uppercase text-muted-foreground">To</span>
                  <Input
                    type="date"
                    min={rows[index]?.fromDate || undefined}
                    className="h-9 w-full min-w-0"
                    {...register(`rows.${index}.toDate`)}
                  />
                  {rowErrors?.toDate && (
                    <p className="text-xs text-destructive">{rowErrors.toDate.message}</p>
                  )}
                </div>
                <div className="shrink-0 space-y-1">
                  <span className="text-[10px] font-medium uppercase text-muted-foreground">Active</span>
                  <div className="flex h-9 items-center">
                    <Controller
                      control={control}
                      name={`rows.${index}.isActive`}
                      render={({ field: f }) => (
                        <Checkbox checked={f.value} onCheckedChange={(c) => f.onChange(c === true)} />
                      )}
                    />
                  </div>
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <span className="text-[10px] font-medium uppercase text-muted-foreground">Remarks</span>
                  <Input
                    className="h-9 w-full min-w-0"
                    {...register(`rows.${index}.remarks`)}
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!isEdit && (
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="h-4 w-4" />
          Add row
        </Button>
      )}

      <div className="flex flex-wrap gap-2 border-t pt-4">
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isEdit ? "Save changes" : rows.length > 1 ? `Add ${rows.length} taxes` : "Add contract tax"}
        </Button>
        <Button type="button" variant="outline" nativeButton={false} render={<Link href={returnHref} />}>
          <X className="h-4 w-4" />
          Cancel
        </Button>
      </div>
    </form>
  );
}
