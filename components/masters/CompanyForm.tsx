"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Building2, Hash, Phone, UserPlus, Save, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUploadField } from "@/components/masters/ImageUploadField";
import { useSessionStore } from "@/lib/store/session.store";
import { useCompaniesStore } from "@/lib/store/companies.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { listCountries } from "@/lib/services/countries.service";
import { listCities } from "@/lib/services/cities.service";
import { listCurrencies } from "@/lib/services/currencies.service";
import {
  createCompany,
  listCompanies,
  updateCompany,
  CompaniesApiError,
} from "@/lib/services/db-companies.service";
import { contrastForeground } from "@/lib/color";
import { initials } from "@/lib/utils";
import type { City, Company, Country, Currency } from "@/types";

const NONE_GROUP = "0";

const phoneRegex = /^[0-9+\-\s()]{5,20}$/;
const codeRegex = /^[A-Za-z0-9][A-Za-z0-9_-]{0,19}$/;
const zipRegex = /^[A-Za-z0-9][A-Za-z0-9\s-]{0,49}$/;

const schema = z.object({
  companyName: z
    .string()
    .trim()
    .min(2, "Company name is required (min 2 characters)")
    .max(200, "Company name must be at most 200 characters"),
  companyCode: z
    .string()
    .trim()
    .min(1, "Company code is required")
    .max(20, "Company code must be at most 20 characters")
    .regex(codeRegex, "Use letters, numbers, underscore or hyphen only"),
  address1: z.string().trim().min(1, "Address 1 is required").max(200),
  address2: z.string().trim().max(200).optional().or(z.literal("")),
  countryId: z.number().int().positive("Country is required"),
  cityId: z.number().int().positive("City is required"),
  currencyId: z.number().int().positive("Currency is required"),
  zipCode: z
    .string()
    .trim()
    .min(1, "Zip code is required")
    .max(50)
    .regex(zipRegex, "Enter a valid zip / postal code"),
  countryDialCode: z
    .string()
    .trim()
    .min(1, "Dial code is required")
    .max(5, "Dial code must be at most 5 characters")
    .regex(/^\+?[0-9]{1,4}$/, "Select a dial code from Country Master"),
  contactNumber: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || phoneRegex.test(v), "Enter a valid contact number (5–20 digits/symbols)"),
  fax: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || phoneRegex.test(v), "Enter a valid fax number"),
  contactPerson: z.string().trim().max(200).optional().or(z.literal("")),
  emailAddress: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || z.string().email().safeParse(v).success, "Enter a valid email address"),
  isRoundOff: z.boolean(),
  noOfSignificantDigits: z.number().int("Must be a whole number").min(0, "Min 0").max(10, "Max 10"),
  isDisplayNumberInThousands: z.boolean(),
  companyLogo: z.string().max(100).optional().or(z.literal("")),
  companyFavIcon: z.string().max(100).optional().or(z.literal("")),
  /** Numeric CompanyID of parent/group company; 0 = none. */
  companyGroupId: z.number().int().min(0),
});

type FormValues = z.infer<typeof schema>;

/** Map stored dial (with/without +) onto Country Master dialCode. */
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

export function CompanyForm({ company }: { company?: Company }) {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();
  const sessionUser = useSessionStore((s) => s.user);
  const upsertCompany = useCompaniesStore((s) => s.upsertCompany);
  const activeTenant = useTenantStore((s) => s.tenant);
  const accentColor = useTenantStore((s) => s.tenant.branding.primaryColor);
  const isEdit = !!company;
  const actorKey = sessionUser?.userKey ?? 0;
  const tenantKey = sessionUser?.tenantKey ?? activeTenant.tenantKey ?? 0;

  const [countries, setCountries] = useState<Country[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [tenantCompanies, setTenantCompanies] = useState<Company[]>([]);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    values: {
      companyName: company?.name ?? "",
      companyCode: company?.code ?? "",
      address1: company?.address1 ?? "",
      address2: company?.address2 ?? "",
      countryId: company?.countryId ?? 0,
      cityId: company?.cityId ?? 0,
      currencyId: company?.currencyId ?? 0,
      zipCode: company?.zipCode ?? "",
      countryDialCode: company?.countryDialCode ?? "",
      contactNumber: company?.contactNumber ?? "",
      fax: company?.fax ?? "",
      contactPerson: company?.contactPerson ?? "",
      emailAddress: company?.emailAddress ?? "",
      isRoundOff: company?.isRoundOff ?? false,
      noOfSignificantDigits: company?.noOfSignificantDigits ?? 2,
      isDisplayNumberInThousands: company?.isDisplayNumberInThousands ?? false,
      companyLogo: company?.companyLogo ?? "",
      companyFavIcon: company?.companyFavIcon ?? "",
      companyGroupId: company?.companyGroupId ?? 0,
    },
  });

  const nameValue = useWatch({ control, name: "companyName" });
  const countryId = useWatch({ control, name: "countryId" });
  const logoValue = useWatch({ control, name: "companyLogo" });
  const previewName = nameValue?.trim() || "Your company";

  /** Unique dial codes from Country Master (first country wins for label). */
  const dialOptions = useMemo(() => {
    const map = new Map<string, Country>();
    for (const c of countries) {
      if (c.dialCode && !map.has(c.dialCode)) map.set(c.dialCode, c);
    }
    return [...map.values()].sort((a, b) => a.dialCode.localeCompare(b.dialCode));
  }, [countries]);

  /** Other companies in this tenant — selectable as Group Company (exclude self). */
  const groupCompanyOptions = useMemo(
    () =>
      tenantCompanies
        .filter((c) => c.isActive && (!company || c.companyKey !== company.companyKey))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [tenantCompanies, company]
  );

  useEffect(() => {
    void Promise.all([listCountries({ activeOnly: true }), listCurrencies({ activeOnly: true })]).then(
      ([countryRows, currencyRows]) => {
        setCountries(countryRows);
        setCurrencies(currencyRows);
      }
    );
  }, []);

  useEffect(() => {
    if (tenantKey <= 0) {
      setTenantCompanies([]);
      return;
    }
    let cancelled = false;
    listCompanies({ tenantId: tenantKey, activeOnly: true })
      .then((rows) => {
        if (!cancelled) setTenantCompanies(rows);
      })
      .catch(() => {
        if (!cancelled) setTenantCompanies([]);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantKey]);

  // Normalize dial code once Country Master is loaded (e.g. "971" → "+971")
  useEffect(() => {
    if (!countries.length) return;
    const current = company?.countryDialCode;
    const resolved = resolveDialCode(current, countries, company?.countryId);
    if (resolved) setValue("countryDialCode", resolved, { shouldValidate: false });
  }, [countries, company?.countryDialCode, company?.countryId, setValue]);

  useEffect(() => {
    if (!countryId) {
      setCities([]);
      return;
    }
    let cancelled = false;
    listCities({ countryId, activeOnly: true })
      .then((rows) => {
        if (!cancelled) setCities(rows);
      })
      .catch(() => {
        if (!cancelled) setCities([]);
      });
    return () => {
      cancelled = true;
    };
  }, [countryId]);

  async function onSubmit(values: FormValues) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    if (tenantKey <= 0) {
      toast.error("Select a tenant workspace before creating companies.");
      return;
    }

    const masterDial = resolveDialCode(values.countryDialCode, countries, values.countryId);
    if (!countries.some((c) => c.dialCode === masterDial)) {
      toast.error("Dial code must come from Country Master");
      return;
    }

    const payload = {
      companyGroupId: values.companyGroupId > 0 ? values.companyGroupId : null,
      companyCode: values.companyCode.trim(),
      companyName: values.companyName.trim(),
      address1: values.address1.trim(),
      address2: values.address2?.trim() ?? "",
      countryId: values.countryId,
      cityId: values.cityId,
      currencyId: values.currencyId,
      zipCode: values.zipCode.trim(),
      countryDialCode: masterDial.slice(0, 5),
      contactNumber: values.contactNumber?.trim() || null,
      fax: values.fax?.trim() || null,
      contactPerson: values.contactPerson?.trim() || null,
      emailAddress: values.emailAddress?.trim() || null,
      isRoundOff: values.isRoundOff,
      noOfSignificantDigits: values.noOfSignificantDigits,
      isDisplayNumberInThousands: values.isDisplayNumberInThousands,
      companyLogo: values.companyLogo?.trim() ?? "",
      companyFavIcon: values.companyFavIcon?.trim() ?? "",
    };

    try {
      if (isEdit && company) {
        const saved = await updateCompany(company.companyKey, {
          ...payload,
          isActive: company.isActive,
          modifiedBy: actorKey,
        });
        upsertCompany(saved);
        toast.success("Company updated");
        router.push(`/${role}/masters/company/${saved.id}`);
      } else {
        const created = await createCompany({
          ...payload,
          tenantId: tenantKey,
          createdBy: actorKey,
        });
        upsertCompany(created);
        toast.success("Company created");
        router.push(`/${role}/masters/company/${created.id}`);
      }
    } catch (error) {
      toast.error(error instanceof CompaniesApiError ? error.message : "Could not save company");
    }
  }

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,300px)] lg:items-start">
      <Card className="min-w-0 overflow-x-clip">
        <CardContent className="min-w-0">
          <form onSubmit={handleSubmit(onSubmit)} className="min-w-0 space-y-5" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="companyName" required>
                  Company name
                </Label>
                <div className="relative">
                  <Building2 className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
                  <Input
                    id="companyName"
                    autoFocus
                    aria-invalid={!!errors.companyName}
                    className="h-10 ps-9"
                    {...register("companyName")}
                  />
                </div>
                {errors.companyName && <p className="text-sm text-destructive">{errors.companyName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyCode" required>
                  Company code
                </Label>
                <div className="relative">
                  <Hash className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
                  <Input
                    id="companyCode"
                    className="h-10 ps-9"
                    disabled={isEdit}
                    aria-invalid={!!errors.companyCode}
                    {...register("companyCode")}
                  />
                </div>
                {errors.companyCode && <p className="text-sm text-destructive">{errors.companyCode.message}</p>}
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
                <Label required>Country</Label>
                <Controller
                  control={control}
                  name="countryId"
                  render={({ field }) => (
                    <Select
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(v) => {
                        const id = Number(v);
                        field.onChange(id);
                        setValue("cityId", 0, { shouldValidate: true });
                        const selected = countries.find((c) => c.countryKey === id);
                        if (selected?.dialCode) {
                          setValue("countryDialCode", selected.dialCode.slice(0, 5), {
                            shouldValidate: true,
                          });
                        }
                      }}
                    >
                      <SelectTrigger className="h-10 w-full max-w-full min-w-0" aria-invalid={!!errors.countryId}>
                        <SelectValue>
                          {(value: string | null) =>
                            value
                              ? (countries.find((c) => String(c.countryKey) === value)?.name ?? value)
                              : "Select country"
                          }
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
                <Label required>City</Label>
                <Controller
                  control={control}
                  name="cityId"
                  render={({ field }) => (
                    <Select
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(v) => field.onChange(Number(v))}
                      disabled={!countryId || cities.length === 0}
                    >
                      <SelectTrigger className="h-10 w-full max-w-full min-w-0" aria-invalid={!!errors.cityId}>
                        <SelectValue>
                          {(value: string | null) => {
                            if (!value) {
                              return !countryId ? "Select a country first" : "Select city";
                            }
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
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
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
                      <SelectTrigger className="h-10 w-full max-w-full min-w-0" aria-invalid={!!errors.currencyId}>
                        <SelectValue>
                          {(value: string | null) => {
                            if (!value) return "Select currency";
                            const c = currencies.find((x) => String(x.currencyKey) === value);
                            return c ? `${c.code} — ${c.name}` : value;
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
                <Label htmlFor="zipCode" required>
                  Zip code
                </Label>
                <Input id="zipCode" aria-invalid={!!errors.zipCode} {...register("zipCode")} />
                {errors.zipCode && <p className="text-sm text-destructive">{errors.zipCode.message}</p>}
              </div>
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
                        <SelectTrigger
                          className="h-10 w-full"
                          aria-invalid={!!errors.countryDialCode}
                        >
                          <SelectValue>
                            {(value: string | null) => value || "Code"}
                          </SelectValue>
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
                  <Label htmlFor="contactNumber">Contact number</Label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
                    <Input
                      id="contactNumber"
                      className="h-10 ps-9"
                      placeholder="Optional"
                      aria-invalid={!!errors.contactNumber}
                      {...register("contactNumber")}
                    />
                  </div>
                </div>
              </div>
              {(errors.countryDialCode || errors.contactNumber) && (
                <p className="text-sm text-destructive">
                  {errors.countryDialCode?.message ?? errors.contactNumber?.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">Dial codes come from Country Master (auto-fills when country changes)</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fax">Fax</Label>
                <Input id="fax" aria-invalid={!!errors.fax} {...register("fax")} placeholder="Optional" />
                {errors.fax && <p className="text-sm text-destructive">{errors.fax.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPerson">Contact person</Label>
                <Input id="contactPerson" {...register("contactPerson")} placeholder="Optional" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="emailAddress">Email</Label>
                <Input
                  id="emailAddress"
                  type="email"
                  aria-invalid={!!errors.emailAddress}
                  {...register("emailAddress")}
                  placeholder="Optional"
                />
                {errors.emailAddress && (
                  <p className="text-sm text-destructive">{errors.emailAddress.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="noOfSignificantDigits" required>
                  Significant digits
                </Label>
                <Input
                  id="noOfSignificantDigits"
                  type="number"
                  min={0}
                  max={10}
                  aria-invalid={!!errors.noOfSignificantDigits}
                  {...register("noOfSignificantDigits", { valueAsNumber: true })}
                />
                {errors.noOfSignificantDigits && (
                  <p className="text-sm text-destructive">{errors.noOfSignificantDigits.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Group company</Label>
                <Controller
                  control={control}
                  name="companyGroupId"
                  render={({ field }) => (
                    <Select
                      value={field.value > 0 ? String(field.value) : NONE_GROUP}
                      onValueChange={(v) => field.onChange(v && v !== NONE_GROUP ? Number(v) : 0)}
                    >
                      <SelectTrigger className="h-10 w-full max-w-full min-w-0" aria-invalid={!!errors.companyGroupId}>
                        <SelectValue>
                          {(value: string | null) => {
                            if (!value || value === NONE_GROUP) return "None (optional)";
                            return (
                              groupCompanyOptions.find((c) => String(c.companyKey) === value)?.name ??
                              tenantCompanies.find((c) => String(c.companyKey) === value)?.name ??
                              value
                            );
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_GROUP}>None (optional)</SelectItem>
                        {groupCompanyOptions.map((c) => (
                          <SelectItem key={c.id} value={String(c.companyKey)}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.companyGroupId && (
                  <p className="text-sm text-destructive">{errors.companyGroupId.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Companies from the current tenant (numeric CompanyID saved)
                </p>
              </div>
              <div className="space-y-2 pt-7">
                <Controller
                  control={control}
                  name="isRoundOff"
                  render={({ field }) => (
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                      Round off
                    </label>
                  )}
                />
                <Controller
                  control={control}
                  name="isDisplayNumberInThousands"
                  render={({ field }) => (
                    <label className="mt-2 flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                      Display in thousands
                    </label>
                  )}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Controller
                control={control}
                name="companyLogo"
                render={({ field }) => (
                  <ImageUploadField
                    id="companyLogo"
                    label="Company logo"
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.companyLogo?.message}
                    hint="Optional · PNG, JPG, WEBP, SVG · max 512 KB"
                  />
                )}
              />
              <Controller
                control={control}
                name="companyFavIcon"
                render={({ field }) => (
                  <ImageUploadField
                    id="companyFavIcon"
                    label="Company favicon"
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.companyFavIcon?.message}
                    hint="Optional · PNG, ICO, SVG · max 512 KB"
                  />
                )}
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button type="submit" disabled={isSubmitting}>
                {isEdit ? <Save className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                {isEdit ? "Save changes" : "Create company"}
              </Button>
              <Button
                type="button"
                variant="outline"
                nativeButton={false}
                render={
                  <Link href={isEdit ? `/${role}/masters/company/${company.id}` : `/${role}/masters/company`} />
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
            {logoValue ? (
              <img
                src={logoValue}
                alt=""
                className="h-9 w-9 shrink-0 rounded-lg border border-border object-contain"
              />
            ) : (
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold"
                style={{ backgroundColor: accentColor, color: contrastForeground(accentColor) }}
                aria-hidden
              >
                {initials(previewName)}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{previewName}</p>
              <Badge variant="default" className="mt-0.5">
                {company?.status ?? "active"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
