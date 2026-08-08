"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Store, MapPin, Landmark, Globe2, Save, X, Loader2, Building2, ShieldCheck, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Section } from "@/components/masters/PropertyFormSection";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { useSuppliersStore } from "@/lib/store/suppliers.store";
import { listCompanies } from "@/lib/services/db-companies.service";
import { listCountries } from "@/lib/services/countries.service";
import { listStates } from "@/lib/services/states.service";
import { listCities } from "@/lib/services/cities.service";
import { listCurrencies } from "@/lib/services/currencies.service";
import { listSupplierTypes } from "@/lib/services/supplier-types.service";
import { createSupplier, updateSupplier, SuppliersApiError } from "@/lib/services/suppliers.service";
import { resolveSessionCompanyKey, shouldLockSessionCompany } from "@/lib/session-company";
import { cn } from "@/lib/utils";
import type { City, Company, Country, Currency, State, Supplier, SupplierTypeMaster } from "@/types";

const NONE = "__none__";

const TIME_ZONES = [
  { id: 1, label: "UTC — Coordinated Universal Time" },
  { id: 2, label: "GMT — London" },
  { id: 3, label: "CET — Central Europe" },
  { id: 4, label: "EET — Eastern Europe (Cairo, Istanbul)" },
  { id: 5, label: "AST — Gulf Standard Time (Doha, Dubai, Abu Dhabi)" },
  { id: 6, label: "IST — India Standard Time" },
  { id: 7, label: "ICT — Indochina Time (Bangkok, Jakarta)" },
  { id: 8, label: "SGT — Singapore / Hong Kong / China" },
  { id: 9, label: "JST — Japan / Korea" },
  { id: 10, label: "AEST — Australia Eastern" },
  { id: 11, label: "EST — US Eastern" },
  { id: 12, label: "CST — US Central" },
  { id: 13, label: "MST — US Mountain" },
  { id: 14, label: "PST — US Pacific" },
];

function optionalId() {
  return z.preprocess(
    (v) => (v === "" || v === NONE || v === 0 || v == null ? null : Number(v)),
    z.number().int().positive().nullable()
  );
}

const schema = z.object({
  companyId: z.number().int().positive("Company is required"),
  supplierName: z.string().trim().min(1, "Supplier name is required").max(200),
  supplierLegalName: z.string().trim().min(1, "Legal name is required").max(250),
  supplierTypeId: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number().int().positive("Supplier type is required")
  ),
  registrationNumber: z.string().trim().max(100).optional().or(z.literal("")),
  taxVatNumber: z.string().trim().max(100).optional().or(z.literal("")),
  countryId: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number().int().positive("Country is required")
  ),
  stateId: optionalId(),
  cityId: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number().int().positive("City is required")
  ),
  address: z.string().trim().min(1, "Address is required").max(20000),
  postalCode: z.string().trim().max(20).optional().or(z.literal("")),
  website: z.string().trim().max(250).optional().or(z.literal("")),
  currencyId: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number().int().positive("Currency is required")
  ),
  timeZoneId: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number().int().positive("Time zone is required")
  ),
  requiresExtranetAccess: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

function emptyValues(companyId?: number): FormValues {
  return {
    companyId: companyId ?? 0,
    supplierName: "",
    supplierLegalName: "",
    supplierTypeId: 0,
    registrationNumber: "",
    taxVatNumber: "",
    countryId: 0,
    stateId: null,
    cityId: 0,
    address: "",
    postalCode: "",
    website: "",
    currencyId: 0,
    timeZoneId: 0,
    requiresExtranetAccess: false,
  };
}

function valuesFromSupplier(s: Supplier): FormValues {
  return {
    companyId: s.companyKey,
    supplierName: s.name,
    supplierLegalName: s.legalName,
    supplierTypeId: s.supplierTypeId,
    registrationNumber: s.registrationNumber ?? "",
    taxVatNumber: s.taxVatNumber ?? "",
    countryId: s.countryId,
    stateId: s.stateId,
    cityId: s.cityId,
    address: s.address,
    postalCode: s.postalCode ?? "",
    website: s.website ?? "",
    currencyId: s.currencyId,
    timeZoneId: s.timeZoneId,
    requiresExtranetAccess: s.requiresExtranetAccess,
  };
}

/** Shared Create / Modify form for the Supplier master. */
export function SupplierForm({ supplier }: { supplier?: Supplier }) {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();
  const sessionUser = useSessionStore((s) => s.user);
  const activeTenant = useTenantStore((s) => s.tenant);
  const upsertSupplier = useSuppliersStore((s) => s.upsertSupplier);
  const isEdit = !!supplier;
  const actorKey = sessionUser?.userKey ?? 0;
  const tenantKey = sessionUser?.tenantKey ?? activeTenant.tenantKey ?? 0;

  const [companies, setCompanies] = useState<Company[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [supplierTypes, setSupplierTypes] = useState<SupplierTypeMaster[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [statesLoading, setStatesLoading] = useState(false);
  const [citiesLoading, setCitiesLoading] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    mode: "onBlur",
    defaultValues: supplier ? valuesFromSupplier(supplier) : emptyValues(),
  });

  const editSupplierKey = supplier?.supplierKey ?? 0;
  useEffect(() => {
    if (editSupplierKey > 0 && supplier) {
      setValue("companyId", supplier.companyKey, { shouldValidate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-hydrate when switching edit targets
  }, [editSupplierKey]);

  const nameValue = useWatch({ control, name: "supplierName" });
  const typeIdWatch = useWatch({ control, name: "supplierTypeId" });
  const countryId = useWatch({ control, name: "countryId" });
  const companyId = useWatch({ control, name: "companyId" });
  const extranetWatch = useWatch({ control, name: "requiresExtranetAccess" });
  const previewName = nameValue?.trim() || "New supplier";

  useEffect(() => {
    void (async () => {
      try {
        const [typeRows, countryRows, currencyRows] = await Promise.all([
          listSupplierTypes({ activeOnly: true }),
          listCountries({ activeOnly: true }),
          listCurrencies({ activeOnly: true }),
        ]);
        setSupplierTypes(typeRows);
        setCountries(countryRows);
        setCurrencies(currencyRows);
      } catch {
        toast.error("Failed to load reference data");
      }
    })();
  }, []);

  useEffect(() => {
    if (tenantKey <= 0) {
      setCompanies([]);
      setCompaniesLoading(false);
      return;
    }
    let cancelled = false;
    setCompaniesLoading(true);
    listCompanies({ tenantId: tenantKey, activeOnly: true })
      .then((rows) => {
        if (cancelled) return;
        const scoped = rows.filter((c) => c.companyKey > 0);
        setCompanies(scoped);
        if (!isEdit) {
          const { locked, companyId: lockedId } = shouldLockSessionCompany(sessionUser, scoped);
          const resolved =
            resolveSessionCompanyKey(sessionUser) ??
            lockedId ??
            (scoped.length === 1 ? scoped[0]!.companyKey : 0);
          if (resolved > 0) setValue("companyId", resolved, { shouldValidate: false });
          void locked;
        }
      })
      .catch(() => {
        if (!cancelled) setCompanies([]);
      })
      .finally(() => {
        if (!cancelled) setCompaniesLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resolve once per tenant, not per keystroke
  }, [tenantKey, isEdit]);

  useEffect(() => {
    if (!countryId) {
      setStates([]);
      setCities([]);
      return;
    }
    let cancelled = false;
    setStatesLoading(true);
    setCitiesLoading(true);
    Promise.all([
      listStates({ countryId, activeOnly: true }),
      listCities({ countryId, activeOnly: true }),
    ])
      .then(([stateRows, cityRows]) => {
        if (cancelled) return;
        setStates(stateRows);
        setCities(cityRows);
        const currentState = getValues("stateId");
        if (currentState && !stateRows.some((s) => s.stateKey === currentState)) {
          setValue("stateId", null, { shouldValidate: false });
        }
        const currentCity = getValues("cityId");
        if (currentCity && !cityRows.some((c) => c.cityKey === currentCity)) {
          setValue("cityId", 0, { shouldValidate: false });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStates([]);
          setCities([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setStatesLoading(false);
          setCitiesLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reload when country changes
  }, [countryId]);

  const previewType = useMemo(
    () => supplierTypes.find((t) => t.typeKey === typeIdWatch)?.name,
    [supplierTypes, typeIdWatch]
  );
  const selectedCompany = companies.find((c) => c.companyKey === companyId);

  async function onSubmit(values: FormValues) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    if (tenantKey <= 0) {
      toast.error("Missing tenant context — sign in again.");
      return;
    }

    const payload = {
      tenantId: tenantKey,
      companyId: values.companyId,
      supplierName: values.supplierName.trim(),
      supplierLegalName: values.supplierLegalName.trim(),
      supplierTypeId: values.supplierTypeId,
      registrationNumber: values.registrationNumber?.trim() || null,
      taxVatNumber: values.taxVatNumber?.trim() || null,
      countryId: values.countryId,
      stateId: values.stateId,
      cityId: values.cityId,
      address: values.address.trim(),
      postalCode: values.postalCode?.trim() || null,
      website: values.website?.trim() || null,
      currencyId: values.currencyId,
      timeZoneId: values.timeZoneId,
      requiresExtranetAccess: values.requiresExtranetAccess,
    };

    try {
      if (isEdit && supplier) {
        const saved = await updateSupplier(supplier.supplierKey, {
          ...payload,
          isActive: supplier.isActive,
          modifiedBy: actorKey,
        });
        upsertSupplier(saved);
        toast.success("Supplier updated");
        router.push(`/${role}/masters/supplier/${saved.supplierKey}`);
      } else {
        const saved = await createSupplier({ ...payload, createdBy: actorKey });
        upsertSupplier(saved);
        toast.success("Supplier created", { description: `Supplier code ${saved.code}` });
        router.push(`/${role}/masters/supplier/${saved.supplierKey}`);
      }
    } catch (error) {
      toast.error(error instanceof SuppliersApiError ? error.message : "Could not save supplier");
    }
  }

  if (companiesLoading) {
    return (
      <Card className="max-w-xl">
        <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading companies…
        </CardContent>
      </Card>
    );
  }

  if (companies.length === 0) {
    return (
      <Card className="max-w-xl">
        <CardContent className="space-y-4 py-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">Add a company first</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Suppliers belong to a company. Create a company, then come back to register a supplier.
              </p>
            </div>
          </div>
          <Button nativeButton={false} render={<Link href={`/${role}/masters/company/new`} />}>
            <Building2 className="h-4 w-4" />
            Create company
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,300px)] lg:items-start"
      noValidate
    >
      <div className="min-w-0 space-y-5">
        <Section icon={Store} title="Identity" description="Core supplier identifiers and classification.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label required>Company</Label>
              <Controller
                control={control}
                name="companyId"
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <SelectTrigger className="h-10 w-full" aria-invalid={!!errors.companyId}>
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <SelectValue>
                        {(value: string | null) =>
                          value ? (companies.find((c) => String(c.companyKey) === value)?.name ?? value) : "Select company"
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map((c) => (
                        <SelectItem key={c.id} value={String(c.companyKey)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.companyId && <p className="text-sm text-destructive">{errors.companyId.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplierCode">Supplier code</Label>
              <Input
                id="supplierCode"
                className="h-10 font-mono"
                disabled
                value={supplier?.code ?? "Auto-generated on save"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplierName" required>
                Supplier name (trading)
              </Label>
              <Input
                id="supplierName"
                className="h-10"
                aria-invalid={!!errors.supplierName}
                {...register("supplierName")}
              />
              {errors.supplierName && <p className="text-sm text-destructive">{errors.supplierName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplierLegalName" required>
                Legal name
              </Label>
              <Input
                id="supplierLegalName"
                className="h-10"
                aria-invalid={!!errors.supplierLegalName}
                {...register("supplierLegalName")}
              />
              {errors.supplierLegalName && (
                <p className="text-sm text-destructive">{errors.supplierLegalName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label required>Supplier type</Label>
              <Controller
                control={control}
                name="supplierTypeId"
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <SelectTrigger className="h-10 w-full" aria-invalid={!!errors.supplierTypeId}>
                      <SelectValue>
                        {(value: string | null) => {
                          if (!value) return "Select type";
                          return supplierTypes.find((t) => String(t.typeKey) === value)?.name ?? value;
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {supplierTypes.map((t) => (
                        <SelectItem key={t.id} value={String(t.typeKey)}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.supplierTypeId && <p className="text-sm text-destructive">Select a supplier type</p>}
            </div>
          </div>
        </Section>

        <Section icon={Landmark} title="Registration & tax" description="Legal registration and tax identifiers.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="registrationNumber">Registration number</Label>
              <Input id="registrationNumber" className="h-10" {...register("registrationNumber")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxVatNumber">Tax / VAT number</Label>
              <Input id="taxVatNumber" className="h-10" {...register("taxVatNumber")} />
            </div>
          </div>
        </Section>

        <Section icon={MapPin} title="Address" description="Registered address for this supplier.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label required>Country</Label>
              <Controller
                control={control}
                name="countryId"
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(v) => {
                      field.onChange(Number(v));
                      setValue("stateId", null, { shouldValidate: false });
                      setValue("cityId", 0, { shouldValidate: false });
                    }}
                  >
                    <SelectTrigger className="h-10 w-full" aria-invalid={!!errors.countryId}>
                      <SelectValue>
                        {(value: string | null) => {
                          if (!value) return "Select country";
                          return countries.find((c) => String(c.countryKey) === value)?.name ?? value;
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((c) => (
                        <SelectItem key={c.id} value={String(c.countryKey)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.countryId && <p className="text-sm text-destructive">{errors.countryId.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>State / province</Label>
              <Controller
                control={control}
                name="stateId"
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : NONE}
                    onValueChange={(v) => field.onChange(v === NONE ? null : Number(v))}
                    disabled={!countryId || statesLoading}
                  >
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue>
                        {(value: string | null) => {
                          if (!value || value === NONE) return statesLoading ? "Loading…" : "Optional";
                          return states.find((s) => String(s.stateKey) === value)?.name ?? value;
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>None</SelectItem>
                      {states.map((s) => (
                        <SelectItem key={s.id} value={String(s.stateKey)}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label required>City</Label>
              <Controller
                control={control}
                name="cityId"
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(v) => field.onChange(Number(v))}
                    disabled={!countryId || citiesLoading}
                  >
                    <SelectTrigger className="h-10 w-full" aria-invalid={!!errors.cityId}>
                      <SelectValue>
                        {(value: string | null) => {
                          if (!value) return citiesLoading ? "Loading…" : "Select city";
                          return cities.find((c) => String(c.cityKey) === value)?.name ?? value;
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((c) => (
                        <SelectItem key={c.id} value={String(c.cityKey)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.cityId && <p className="text-sm text-destructive">{errors.cityId.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="postalCode">Postal code</Label>
              <Input id="postalCode" className="h-10" {...register("postalCode")} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address" required>
                Address
              </Label>
              <Textarea id="address" rows={3} aria-invalid={!!errors.address} {...register("address")} />
              {errors.address && <p className="text-sm text-destructive">{errors.address.message}</p>}
            </div>
          </div>
        </Section>

        <Section icon={Globe2} title="Preferences" description="Website, currency, and time zone.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="website">Website</Label>
              <Input id="website" className="h-10" placeholder="https://" {...register("website")} />
            </div>
            <div className="space-y-2">
              <Label required>Currency</Label>
              <Controller
                control={control}
                name="currencyId"
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <SelectTrigger className="h-10 w-full" aria-invalid={!!errors.currencyId}>
                      <SelectValue>
                        {(value: string | null) => {
                          if (!value) return "Select currency";
                          return currencies.find((c) => String(c.currencyKey) === value)?.code ?? value;
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((c) => (
                        <SelectItem key={c.id} value={String(c.currencyKey)}>
                          {c.code} — {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.currencyId && <p className="text-sm text-destructive">{errors.currencyId.message}</p>}
            </div>
            <div className="space-y-2">
              <Label required>Time zone</Label>
              <Controller
                control={control}
                name="timeZoneId"
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <SelectTrigger className="h-10 w-full" aria-invalid={!!errors.timeZoneId}>
                      <SelectValue>
                        {(value: string | null) => {
                          if (!value) return "Select time zone";
                          return TIME_ZONES.find((t) => String(t.id) === value)?.label ?? value;
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_ZONES.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.timeZoneId && <p className="text-sm text-destructive">{errors.timeZoneId.message}</p>}
            </div>
          </div>
        </Section>

        <Section
          icon={ShieldCheck}
          title="Extranet access"
          description="Does this supplier require Extranet Access?"
        >
          <Controller
            control={control}
            name="requiresExtranetAccess"
            render={({ field }) => (
              <div className="flex gap-2">
                {[
                  { value: false, label: "No" },
                  { value: true, label: "Yes" },
                ].map((opt) => {
                  const selected = field.value === opt.value;
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => field.onChange(opt.value)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                        selected
                          ? "border-primary bg-primary/[0.06] text-primary ring-1 ring-primary/30"
                          : "border-border bg-background text-muted-foreground hover:border-primary/40"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded-full border",
                          selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
                        )}
                      >
                        {selected && <Check className="h-2.5 w-2.5" />}
                      </span>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}
          />
        </Section>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEdit ? "Save changes" : "Create supplier"}
          </Button>
          <Button
            type="button"
            variant="outline"
            nativeButton={false}
            render={
              <Link
                href={
                  isEdit ? `/${role}/masters/supplier/${supplier.supplierKey}` : `/${role}/masters/supplier`
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
          <div className="flex h-28 items-end bg-gradient-to-br from-[#001C35] via-[#0a3558] to-[#1a5a7a] p-4 text-white">
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold">{previewName}</p>
              <p className="truncate text-sm text-white/75">{previewType ?? "Select a supplier type"}</p>
            </div>
          </div>
          <CardContent className="space-y-3 pt-4">
            <div className="flex flex-wrap gap-1.5">
              {previewType && <Badge variant="secondary">{previewType}</Badge>}
              {selectedCompany && <Badge variant="outline">{selectedCompany.name}</Badge>}
              <Badge variant={extranetWatch ? "default" : "secondary"}>
                {extranetWatch ? "Extranet enabled" : "No extranet access"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Supplier code is generated automatically when this supplier is created.
            </p>
          </CardContent>
        </Card>
      </aside>
    </form>
  );
}
