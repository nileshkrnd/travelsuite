"use client";

import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Building2, Hash, UserPlus, Save, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSessionStore } from "@/lib/store/session.store";
import { useCompaniesStore } from "@/lib/store/companies.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { listCountries } from "@/lib/services/countries.service";
import { listCities } from "@/lib/services/cities.service";
import { listCurrencies } from "@/lib/services/currencies.service";
import { createCompany, updateCompany, CompaniesApiError } from "@/lib/services/db-companies.service";
import { contrastForeground } from "@/lib/color";
import { initials } from "@/lib/utils";
import type { City, Company, Country, Currency } from "@/types";

const schema = z.object({
  companyName: z.string().min(1, "Company name is required").max(200),
  companyCode: z.string().min(1, "Company code is required").max(20),
  address1: z.string().min(1, "Address is required").max(200),
  address2: z.string().max(200).optional(),
  countryId: z.number().int().positive("Select a country"),
  cityId: z.number().int().positive("Select a city"),
  currencyId: z.number().int().positive("Select a currency"),
  zipCode: z.string().min(1, "Zip code is required").max(50),
  countryDialCode: z.string().min(1, "Dial code is required").max(5),
  contactNumber: z.string().max(20).optional(),
  fax: z.string().max(50).optional(),
  contactPerson: z.string().max(200).optional(),
  emailAddress: z
    .string()
    .optional()
    .refine((v) => !v || z.string().email().safeParse(v).success, "Enter a valid email"),
  isRoundOff: z.boolean(),
  noOfSignificantDigits: z.number().int().min(0).max(10),
  isDisplayNumberInThousands: z.boolean(),
  companyLogo: z.string().max(100).optional(),
  companyFavIcon: z.string().max(100).optional(),
  companyGroupId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

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

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
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
      companyGroupId: company?.companyGroupId != null ? String(company.companyGroupId) : "",
    },
  });

  const nameValue = useWatch({ control, name: "companyName" });
  const countryId = useWatch({ control, name: "countryId" });
  const previewName = nameValue?.trim() || "Your company";

  useEffect(() => {
    void Promise.all([listCountries({ activeOnly: true }), listCurrencies({ activeOnly: true })]).then(
      ([countryRows, currencyRows]) => {
        setCountries(countryRows);
        setCurrencies(currencyRows);
        if (!company && currencyRows[0] && !company) {
          // defaults applied via form values only when keys are 0
        }
      }
    );
  }, [company]);

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

  // Prefill dial code from country when creating
  useEffect(() => {
    if (isEdit || !countryId) return;
    const country = countries.find((c) => c.countryKey === countryId);
    if (country?.dialCode) setValue("countryDialCode", country.dialCode.replace(/^\+/, "").slice(0, 5));
  }, [countryId, countries, isEdit, setValue]);

  async function onSubmit(values: FormValues) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    if (tenantKey <= 0) {
      toast.error("Select a tenant workspace before creating companies.");
      return;
    }

    const groupRaw = values.companyGroupId?.trim();
    const companyGroupId = groupRaw ? Number(groupRaw) : null;
    if (groupRaw && Number.isNaN(companyGroupId)) {
      toast.error("Company group id must be a number");
      return;
    }

    const payload = {
      companyGroupId,
      companyCode: values.companyCode.trim(),
      companyName: values.companyName.trim(),
      address1: values.address1.trim(),
      address2: values.address2?.trim() ?? "",
      countryId: values.countryId,
      cityId: values.cityId,
      currencyId: values.currencyId,
      zipCode: values.zipCode.trim(),
      countryDialCode: values.countryDialCode.trim(),
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
    <div className="grid gap-6 lg:grid-cols-[1fr_300px] lg:items-start">
      <Card>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company name</Label>
                <div className="relative">
                  <Building2 className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
                  <Input id="companyName" autoFocus className="h-10 ps-9" {...register("companyName")} />
                </div>
                {errors.companyName && <p className="text-sm text-destructive">{errors.companyName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyCode">Company code</Label>
                <div className="relative">
                  <Hash className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
                  <Input
                    id="companyCode"
                    className="h-10 ps-9"
                    disabled={isEdit}
                    {...register("companyCode")}
                  />
                </div>
                {errors.companyCode && <p className="text-sm text-destructive">{errors.companyCode.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address1">Address 1</Label>
              <Input id="address1" {...register("address1")} />
              {errors.address1 && <p className="text-sm text-destructive">{errors.address1.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="address2">Address 2</Label>
              <Input id="address2" {...register("address2")} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Country</Label>
                <Controller
                  control={control}
                  name="countryId"
                  render={({ field }) => (
                    <Select
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(v) => {
                        field.onChange(Number(v));
                        setValue("cityId", 0);
                      }}
                    >
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue />
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
                <Label>City</Label>
                <Controller
                  control={control}
                  name="cityId"
                  render={({ field }) => (
                    <Select
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(v) => field.onChange(Number(v))}
                      disabled={cities.length === 0}
                    >
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue />
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

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Currency</Label>
                <Controller
                  control={control}
                  name="currencyId"
                  render={({ field }) => (
                    <Select
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue />
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
                <Label htmlFor="zipCode">Zip code</Label>
                <Input id="zipCode" {...register("zipCode")} />
                {errors.zipCode && <p className="text-sm text-destructive">{errors.zipCode.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="countryDialCode">Country dial code</Label>
                <Input id="countryDialCode" {...register("countryDialCode")} />
                {errors.countryDialCode && (
                  <p className="text-sm text-destructive">{errors.countryDialCode.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contactNumber">Contact number</Label>
                <Input id="contactNumber" {...register("contactNumber")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fax">Fax</Label>
                <Input id="fax" {...register("fax")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPerson">Contact person</Label>
                <Input id="contactPerson" {...register("contactPerson")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emailAddress">Email</Label>
                <Input id="emailAddress" type="email" {...register("emailAddress")} />
                {errors.emailAddress && (
                  <p className="text-sm text-destructive">{errors.emailAddress.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="noOfSignificantDigits">Significant digits</Label>
                <Input
                  id="noOfSignificantDigits"
                  type="number"
                  {...register("noOfSignificantDigits", { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyGroupId">Company group id</Label>
                <Input id="companyGroupId" {...register("companyGroupId")} placeholder="Optional" />
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
              <div className="space-y-2">
                <Label htmlFor="companyLogo">Company logo (path)</Label>
                <Input id="companyLogo" {...register("companyLogo")} placeholder="/brand/logo.png" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyFavIcon">Company favicon (path)</Label>
                <Input id="companyFavIcon" {...register("companyFavIcon")} placeholder="/brand/favicon.png" />
              </div>
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

      <Card className="bg-muted/40">
        <CardContent className="space-y-4">
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
