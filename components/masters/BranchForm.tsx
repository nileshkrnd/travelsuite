"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import {
  GitBranch,
  Building2,
  Mail,
  Phone,
  UserPlus,
  Save,
  X,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Check,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { useBranchesStore } from "@/lib/store/branches.store";
import { listCountries } from "@/lib/services/countries.service";
import { listCities } from "@/lib/services/cities.service";
import { listCompanies } from "@/lib/services/db-companies.service";
import { listBranchTypes } from "@/lib/services/branch-types.service";
import { createBranch, listBranches, updateBranch, BranchesApiError } from "@/lib/services/db-branches.service";
import { contrastForeground } from "@/lib/color";
import { cn, initials } from "@/lib/utils";
import type { Branch, BranchType, City, Company, Country } from "@/types";

const phoneRegex = /^[0-9+\-\s()]{5,20}$/;
const zipRegex = /^[A-Za-z0-9][A-Za-z0-9\s-]{0,9}$/;

const schema = z.object({
  branchName: z.string().trim().min(1, "Branch name is required").max(100),
  branchTypeId: z.number().int().positive("Branch type is required"),
  companyId: z.number().int().positive("Company is required"),
  address1: z.string().trim().min(1, "Address 1 is required").max(200),
  address2: z.string().trim().max(200).optional().or(z.literal("")),
  countryId: z.number().int().positive("Country is required"),
  cityId: z.number().int().positive("City is required"),
  zipCode: z.string().trim().min(1, "Zip code is required").max(10).regex(zipRegex, "Enter a valid zip / postal code"),
  contactPerson: z.string().trim().min(1, "Contact person is required").max(200),
  emailAddress: z.string().trim().min(1, "Email is required").email("Enter a valid email address").max(100),
  countryDialCode: z
    .string()
    .trim()
    .min(1, "Dial code is required")
    .max(5)
    .regex(/^\+?[0-9]{1,4}$/, "Select a dial code from Country Master"),
  phoneNumber: z.string().trim().min(1, "Phone number is required").regex(phoneRegex, "Enter a valid phone number"),
  faxNumber: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || phoneRegex.test(v), "Enter a valid fax number"),
});

type FormValues = z.infer<typeof schema>;

function emptyFormValues(): FormValues {
  return {
    branchName: "",
    branchTypeId: 0,
    companyId: 0,
    address1: "",
    address2: "",
    countryId: 0,
    cityId: 0,
    zipCode: "",
    contactPerson: "",
    emailAddress: "",
    countryDialCode: "",
    phoneNumber: "",
    faxNumber: "",
  };
}

function formValuesFromBranch(branch: Branch): FormValues {
  return {
    branchName: branch.name,
    branchTypeId: branch.branchTypeId,
    companyId: branch.companyKey,
    address1: branch.address1,
    address2: branch.address2 ?? "",
    countryId: branch.countryId,
    cityId: branch.cityId,
    zipCode: branch.zipCode,
    contactPerson: branch.contactPerson,
    emailAddress: branch.emailAddress,
    countryDialCode: branch.countryDialCode,
    phoneNumber: branch.phoneNumber,
    faxNumber: branch.faxNumber ?? "",
  };
}

function resolveDialCode(raw: string | undefined, countries: Country[], countryId?: number): string {
  if (countryId) {
    const byCountry = countries.find((c) => c.countryKey === countryId);
    if (byCountry?.dialCode) return byCountry.dialCode.slice(0, 5);
  }
  if (!raw) return "";
  const exact = countries.find((c) => c.dialCode === raw);
  if (exact) return exact.dialCode.slice(0, 5);
  const withPlus = raw.startsWith("+") ? raw : `+${raw}`;
  const match = countries.find((c) => c.dialCode === withPlus);
  if (match) return match.dialCode.slice(0, 5);
  return withPlus.slice(0, 5);
}

/** Shared Create/Modify form for the Branch master — used by both the "new" and "edit" pages. */
export function BranchForm({ branch }: { branch?: Branch }) {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();
  const sessionUser = useSessionStore((s) => s.user);
  const activeTenant = useTenantStore((s) => s.tenant);
  const accentColor = useTenantStore((s) => s.tenant.branding.primaryColor);
  const upsertBranch = useBranchesStore((s) => s.upsertBranch);
  const isEdit = !!branch;
  const actorKey = sessionUser?.userKey ?? 0;
  const tenantKey = sessionUser?.tenantKey ?? activeTenant.tenantKey ?? 0;

  const [countries, setCountries] = useState<Country[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [branchTypes, setBranchTypes] = useState<BranchType[]>([]);
  const [tenantCompanies, setTenantCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  /** Create flow: pick company first, then enter branch details. */
  const [createStep, setCreateStep] = useState<"company" | "details">(isEdit ? "details" : "company");

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    // Avoid RHF controlled `values` — it resets country/city on every parent re-render.
    defaultValues: branch ? formValuesFromBranch(branch) : emptyFormValues(),
  });

  const editBranchKey = branch?.branchKey ?? 0;
  useEffect(() => {
    // Hydrate only when opening a different edit record — never wipe create form mid-edit.
    if (editBranchKey > 0 && branch) {
      reset(formValuesFromBranch(branch));
    }
  }, [editBranchKey, branch, reset]);

  const nameValue = useWatch({ control, name: "branchName" });
  const countryId = useWatch({ control, name: "countryId" });
  const cityId = useWatch({ control, name: "cityId" });
  const companyId = useWatch({ control, name: "companyId" });
  const previewName = nameValue?.trim() || "Branch name";
  const [citiesLoading, setCitiesLoading] = useState(false);

  const dialOptions = useMemo(() => {
    const map = new Map<string, Country>();
    for (const c of countries) {
      if (c.dialCode && !map.has(c.dialCode)) map.set(c.dialCode, c);
    }
    return [...map.values()].sort((a, b) => a.dialCode.localeCompare(b.dialCode));
  }, [countries]);

  useEffect(() => {
    void listCountries({ activeOnly: true }).then(setCountries);
  }, []);

  useEffect(() => {
    if (!companyId || tenantKey <= 0) {
      setBranchTypes([]);
      return;
    }
    let cancelled = false;
    listBranchTypes({ tenantId: tenantKey, companyId, activeOnly: true })
      .then((rows) => {
        if (!cancelled) setBranchTypes(rows);
      })
      .catch(() => {
        if (!cancelled) setBranchTypes([]);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, tenantKey]);

  useEffect(() => {
    if (tenantKey <= 0) {
      setTenantCompanies([]);
      setCompaniesLoading(false);
      return;
    }
    let cancelled = false;
    setCompaniesLoading(true);
    listCompanies({ tenantId: tenantKey, activeOnly: true })
      .then((rows) => {
        if (!cancelled) setTenantCompanies(rows);
      })
      .catch(() => {
        if (!cancelled) setTenantCompanies([]);
      })
      .finally(() => {
        if (!cancelled) setCompaniesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantKey]);

  useEffect(() => {
    if (tenantKey <= 0) {
      setBranches([]);
      return;
    }
    let cancelled = false;
    listBranches({ tenantId: tenantKey })
      .then((rows) => {
        if (!cancelled) setBranches(rows);
      })
      .catch(() => {
        if (!cancelled) setBranches([]);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantKey]);

  useEffect(() => {
    if (!countries.length) return;
    const current = branch?.countryDialCode;
    const resolved = resolveDialCode(current, countries, branch?.countryId);
    if (resolved) setValue("countryDialCode", resolved, { shouldValidate: false });
  }, [countries, branch?.countryDialCode, branch?.countryId, setValue]);

  useEffect(() => {
    if (!countryId) {
      setCities([]);
      setCitiesLoading(false);
      return;
    }
    let cancelled = false;
    setCitiesLoading(true);
    listCities({ countryId, activeOnly: true })
      .then((rows) => {
        if (cancelled) return;
        setCities(rows);
        // Drop stale city if it no longer belongs to this country.
        const currentCityId = getValues("cityId");
        if (currentCityId && !rows.some((c) => c.cityKey === currentCityId)) {
          setValue("cityId", 0, { shouldValidate: false });
        }
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
    // getValues/setValue are stable from RHF; re-running on their identity causes flicker.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reload when country changes
  }, [countryId]);

  async function onSubmit(values: FormValues) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }

    const masterDial = resolveDialCode(values.countryDialCode, countries, values.countryId);
    if (!countries.some((c) => c.dialCode === masterDial)) {
      toast.error("Dial code must come from Country Master");
      return;
    }

    const duplicate = branches.some(
      (b) =>
        b.companyKey === values.companyId &&
        b.name.toLowerCase() === values.branchName.trim().toLowerCase() &&
        (!isEdit || b.id !== branch?.id)
    );
    if (duplicate) {
      toast.error("This branch name already exists for the selected company");
      return;
    }

    const payload = {
      branchTypeId: values.branchTypeId,
      branchName: values.branchName.trim(),
      companyId: values.companyId,
      address1: values.address1.trim(),
      address2: values.address2?.trim() ?? "",
      countryId: values.countryId,
      cityId: values.cityId,
      zipCode: values.zipCode.trim(),
      contactPerson: values.contactPerson.trim(),
      emailAddress: values.emailAddress.trim(),
      countryDialCode: masterDial.slice(0, 5),
      phoneNumber: values.phoneNumber.trim(),
      faxNumber: values.faxNumber?.trim() || null,
    };

    try {
      if (isEdit && branch) {
        const saved = await updateBranch(branch.branchKey, {
          ...payload,
          isActive: branch.isActive,
          modifiedBy: actorKey,
        });
        upsertBranch(saved);
        toast.success("Branch updated");
        router.push(`/${role}/masters/branch/${saved.id}`);
      } else {
        const created = await createBranch({ ...payload, createdBy: actorKey });
        upsertBranch(created);
        toast.success("Branch created");
        router.push(`/${role}/masters/branch/${created.id}`);
      }
    } catch (error) {
      toast.error(error instanceof BranchesApiError ? error.message : "Could not save branch");
    }
  }

  const selectedCompany = tenantCompanies.find((c) => c.companyKey === companyId) ?? null;

  function proceedWithCompany() {
    if (!companyId || companyId <= 0) {
      toast.error("Select a company to continue");
      return;
    }
    setValue("branchTypeId", 0, { shouldValidate: false });
    setCreateStep("details");
  }

  function changeCompany() {
    setValue("branchTypeId", 0, { shouldValidate: false });
    setCreateStep("company");
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

  if (tenantCompanies.length === 0) {
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
                Branches belong to a company. Create a company, then come back to add a branch.
              </p>
            </div>
          </div>
          <Button
            nativeButton={false}
            render={<Link href={`/${role}/masters/company/new`} />}
          >
            <Building2 className="h-4 w-4" />
            Create company
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!isEdit && createStep === "company") {
    return (
      <Card className="max-w-2xl">
        <CardContent className="space-y-5 pt-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-base font-semibold">Select company</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose the company this branch belongs to, then continue to enter branch details.
              </p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {tenantCompanies.map((c) => {
              const selected = companyId === c.companyKey;
              return (
                <button
                  key={c.companyKey}
                  type="button"
                  onClick={() => {
                    setValue("companyId", c.companyKey, { shouldValidate: true, shouldDirty: true });
                    setValue("branchTypeId", 0, { shouldValidate: false });
                  }}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border px-3.5 py-3 text-start transition-colors",
                    selected
                      ? "border-primary bg-primary/[0.04] ring-1 ring-primary/30"
                      : "border-border bg-background hover:border-primary/40 hover:bg-muted/40"
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold",
                      selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {selected ? <Check className="h-4 w-4" /> : initials(c.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.name}</p>
                    {c.code ? (
                      <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">{c.code}</p>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button type="button" disabled={!companyId} onClick={proceedWithCompany}>
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              nativeButton={false}
              render={<Link href={`/${role}/masters/branch`} />}
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,300px)] lg:items-start">
      <Card className="min-w-0 overflow-x-clip">
        <CardContent className="min-w-0">
          <form onSubmit={handleSubmit(onSubmit)} className="min-w-0 space-y-5" noValidate>
            {!isEdit && selectedCompany && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-3.5 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Company
                    </p>
                    <p className="truncate text-sm font-semibold">{selectedCompany.name}</p>
                    {selectedCompany.code ? (
                      <p className="truncate font-mono text-xs text-muted-foreground">
                        {selectedCompany.code}
                      </p>
                    ) : null}
                  </div>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={changeCompany}>
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Change company
                </Button>
              </div>
            )}

            {isEdit && (
              <div className="space-y-2">
                <Label required>Company</Label>
                <Controller
                  control={control}
                  name="companyId"
                  render={({ field }) => (
                    <Select
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(v) => {
                        field.onChange(Number(v));
                        setValue("branchTypeId", 0, { shouldValidate: true });
                      }}
                    >
                      <SelectTrigger className="h-10 w-full max-w-full min-w-0" aria-invalid={!!errors.companyId}>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <SelectValue>
                          {(value: string | null) =>
                            value
                              ? (tenantCompanies.find((c) => String(c.companyKey) === value)?.name ?? value)
                              : "Select company"
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {tenantCompanies.map((c) => (
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
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="branchName" required>
                  Branch name
                </Label>
                <div className="relative">
                  <GitBranch className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
                  <Input
                    id="branchName"
                    autoFocus
                    aria-invalid={!!errors.branchName}
                    className="h-10 ps-9"
                    {...register("branchName")}
                  />
                </div>
                {errors.branchName && <p className="text-sm text-destructive">{errors.branchName.message}</p>}
              </div>

              <div className="space-y-2">
                <Label required>Branch type</Label>
                <Controller
                  control={control}
                  name="branchTypeId"
                  render={({ field }) => (
                    <Select
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(v) => field.onChange(Number(v))}
                      disabled={!companyId || branchTypes.length === 0}
                    >
                      <SelectTrigger className="h-10 w-full max-w-full min-w-0" aria-invalid={!!errors.branchTypeId}>
                        <SelectValue>
                          {(value: string | null) => {
                            if (!value) {
                              return branchTypes.length === 0
                                ? "No branch types for this company"
                                : "Select branch type";
                            }
                            return (
                              branchTypes.find((t) => String(t.branchTypeId) === value)?.branchTypeName ??
                              value
                            );
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {branchTypes.map((t) => (
                          <SelectItem key={t.branchTypeId} value={String(t.branchTypeId)}>
                            {t.branchTypeName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.branchTypeId && <p className="text-sm text-destructive">{errors.branchTypeId.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address1" required>
                Address 1
              </Label>
              <Input id="address1" aria-invalid={!!errors.address1} {...register("address1")} />
              {errors.address1 && <p className="text-sm text-destructive">{errors.address1.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="address2">Address 2</Label>
              <Input id="address2" {...register("address2")} placeholder="Optional" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="branch-country" required>
                  Country
                </Label>
                <Controller
                  control={control}
                  name="countryId"
                  render={({ field }) => (
                    <select
                      id="branch-country"
                      className="flex h-10 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive"
                      aria-invalid={!!errors.countryId}
                      value={field.value > 0 ? String(field.value) : ""}
                      onChange={(e) => {
                        const id = Number(e.target.value);
                        field.onChange(Number.isFinite(id) && id > 0 ? id : 0);
                        setValue("cityId", 0, { shouldValidate: false });
                        const selected = countries.find((c) => c.countryKey === id);
                        if (selected?.dialCode) {
                          setValue("countryDialCode", selected.dialCode.slice(0, 5), { shouldValidate: true });
                        }
                      }}
                    >
                      <option value="">Select country</option>
                      {countries.map((c) => (
                        <option key={c.id} value={String(c.countryKey)}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}
                />
                {errors.countryId && <p className="text-sm text-destructive">{errors.countryId.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch-city" required>
                  City
                </Label>
                <Controller
                  control={control}
                  name="cityId"
                  render={({ field }) => (
                    <select
                      id="branch-city"
                      className="flex h-10 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive"
                      aria-invalid={!!errors.cityId}
                      disabled={!countryId || citiesLoading || cities.length === 0}
                      value={field.value > 0 ? String(field.value) : ""}
                      onChange={(e) => {
                        const id = Number(e.target.value);
                        field.onChange(Number.isFinite(id) && id > 0 ? id : 0);
                      }}
                    >
                      <option value="">
                        {!countryId
                          ? "Select a country first"
                          : citiesLoading
                            ? "Loading cities…"
                            : cities.length === 0
                              ? "No cities for this country"
                              : "Select city"}
                      </option>
                      {cities.map((c) => (
                        <option key={c.id} value={String(c.cityKey)}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}
                />
                {errors.cityId && <p className="text-sm text-destructive">{errors.cityId.message}</p>}
                {countryId > 0 && cityId > 0 && !cities.some((c) => c.cityKey === cityId) && !citiesLoading && (
                  <p className="text-xs text-muted-foreground">Selected city is not in the list — pick again.</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="zipCode" required>
                Zip code
              </Label>
              <Input id="zipCode" aria-invalid={!!errors.zipCode} {...register("zipCode")} />
              {errors.zipCode && <p className="text-sm text-destructive">{errors.zipCode.message}</p>}
            </div>

            <div className="space-y-2">
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:gap-2">
                <div className="w-full shrink-0 space-y-2 sm:w-[8.5rem]">
                  <Label required>Dial code</Label>
                  <Controller
                    control={control}
                    name="countryDialCode"
                    render={({ field }) => (
                      <Select value={field.value || ""} onValueChange={(v) => field.onChange(v ?? "")}>
                        <SelectTrigger className="h-10 w-full" aria-invalid={!!errors.countryDialCode}>
                          <SelectValue>{(value: string | null) => value || "Code"}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {dialOptions.map((c) => (
                            <SelectItem key={c.dialCode} value={c.dialCode}>
                              {c.dialCode} · {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <Label htmlFor="phoneNumber" required>
                    Phone number
                  </Label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phoneNumber"
                      className="h-10 ps-9"
                      aria-invalid={!!errors.phoneNumber}
                      {...register("phoneNumber")}
                    />
                  </div>
                </div>
              </div>
              {(errors.countryDialCode || errors.phoneNumber) && (
                <p className="text-sm text-destructive">
                  {errors.countryDialCode?.message ?? errors.phoneNumber?.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">Dial codes come from Country Master (auto-fills when country changes)</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contactPerson" required>
                  Contact person
                </Label>
                <Input id="contactPerson" aria-invalid={!!errors.contactPerson} {...register("contactPerson")} />
                {errors.contactPerson && (
                  <p className="text-sm text-destructive">{errors.contactPerson.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="faxNumber">Fax number</Label>
                <Input id="faxNumber" aria-invalid={!!errors.faxNumber} {...register("faxNumber")} placeholder="Optional" />
                {errors.faxNumber && <p className="text-sm text-destructive">{errors.faxNumber.message}</p>}
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="emailAddress" required>
                  Email address
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
                  <Input
                    id="emailAddress"
                    type="email"
                    className="h-10 ps-9"
                    aria-invalid={!!errors.emailAddress}
                    {...register("emailAddress")}
                  />
                </div>
                {errors.emailAddress && (
                  <p className="text-sm text-destructive">{errors.emailAddress.message}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button type="submit" disabled={isSubmitting}>
                {isEdit ? <Save className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                {isEdit ? "Save changes" : "Create branch"}
              </Button>
              <Button
                type="button"
                variant="outline"
                nativeButton={false}
                render={
                  <Link href={isEdit ? `/${role}/masters/branch/${branch.id}` : `/${role}/masters/branch`} />
                }
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="min-w-0 overflow-x-clip bg-muted/40 lg:sticky lg:top-6">
        <CardContent className="min-w-0 space-y-4">
          <p className="text-xs font-medium text-muted-foreground">Preview</p>
          <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold"
              style={{ backgroundColor: accentColor, color: contrastForeground(accentColor) }}
              aria-hidden
            >
              {initials(previewName)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{previewName}</p>
              {selectedCompany ? (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{selectedCompany.name}</p>
              ) : null}
              <Badge variant="default" className="mt-0.5">
                {branch?.status ?? "active"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
