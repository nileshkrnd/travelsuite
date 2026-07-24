"use client";

import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import {
  Building2,
  Hash,
  Coins,
  MapPin,
  Globe2,
  Building,
  Clock,
  Mail,
  Phone,
  LogIn,
  UserPlus,
  Save,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TenantLogo } from "@/components/layout/TenantLogo";
import { useTenantsStore } from "@/lib/store/tenants.store";
import { DEFAULT_BRANDING } from "@/mock/data/tenants";
import { currencyMeta } from "@/mock/data/exchangeRates";
import { COUNTRIES, getCitiesForCountry, getCountry } from "@/config/countries";
import type { CurrencyCode, Tenant } from "@/types";

const CURRENCY_CODES = Object.keys(currencyMeta) as CurrencyCode[];
const TIMEZONES = Intl.supportedValuesOf("timeZone");

function useTenantSchema(tenants: Tenant[], currentId?: string) {
  return z.object({
    name: z.string().min(1, "Tenant name is required"),
    slug: z
      .string()
      .min(1, "Tenant code is required")
      .max(30, "Tenant code must be 30 characters or fewer")
      .refine(
        (value) => !tenants.some((t) => t.id !== currentId && t.slug.toLowerCase() === value.trim().toLowerCase()),
        "This tenant code is already in use"
      ),
    defaultCurrency: z.string().min(1, "Currency is required"),
    addressLine1: z.string().min(1, "Address line 1 is required"),
    addressLine2: z.string().optional(),
    country: z.string().min(1, "Country is required"),
    city: z.string().min(1, "City is required"),
    zip: z.string().min(1, "Zip / postal code is required"),
    timezone: z.string().min(1, "Timezone is required"),
    email: z.string().min(1, "Email is required").email("Enter a valid email address"),
    dialCode: z.string().min(1, "Country dial code is required"),
    phone: z.string().min(1, "Phone number is required"),
  });
}

type FormValues = z.infer<ReturnType<typeof useTenantSchema>>;

/** Shared Create/Modify form for the Tenant master — used by both the "new" and "edit" pages. */
export function TenantForm({ tenant }: { tenant?: Tenant }) {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();
  const tenants = useTenantsStore((s) => s.tenants);
  const addTenant = useTenantsStore((s) => s.addTenant);
  const updateTenant = useTenantsStore((s) => s.updateTenant);
  const schema = useTenantSchema(tenants, tenant?.id);
  const isEdit = !!tenant;

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      name: tenant?.branding.name ?? "",
      slug: tenant?.slug ?? "",
      defaultCurrency: tenant?.defaultCurrency ?? "USD",
      addressLine1: tenant?.address.line1 ?? "",
      addressLine2: tenant?.address.line2 ?? "",
      country: tenant?.address.country ?? "",
      city: tenant?.address.city ?? "",
      zip: tenant?.address.zip ?? "",
      timezone: tenant?.address.timezone ?? "",
      email: tenant?.contact.email ?? "",
      dialCode: tenant?.contact.dialCode ?? "",
      phone: tenant?.contact.phone ?? "",
    },
  });

  const nameValue = useWatch({ control, name: "name" });
  const slugValue = useWatch({ control, name: "slug" });
  const countryValue = useWatch({ control, name: "country" });
  const cityOptions = getCitiesForCountry(countryValue ?? "");

  async function onSubmit(values: FormValues) {
    const payload = {
      name: values.name.trim(),
      defaultCurrency: values.defaultCurrency as CurrencyCode,
      address: {
        line1: values.addressLine1.trim(),
        line2: values.addressLine2?.trim() || undefined,
        country: values.country,
        city: values.city,
        zip: values.zip.trim(),
        timezone: values.timezone,
      },
      contact: { email: values.email.trim(), dialCode: values.dialCode, phone: values.phone.trim() },
    };

    if (isEdit && tenant) {
      updateTenant(tenant.id, {
        branding: { ...tenant.branding, name: payload.name },
        defaultCurrency: payload.defaultCurrency,
        address: payload.address,
        contact: payload.contact,
      });
      toast.success("Tenant updated");
      router.push(`/${role}/masters/tenant/${tenant.id}`);
    } else {
      const created = addTenant({ slug: values.slug.trim(), ...payload });
      toast.success("Tenant registered");
      router.push(`/${role}/masters/tenant/${created.id}`);
    }
  }

  const previewBranding = {
    name: nameValue?.trim() || "Your organization",
    logoUrl: "",
    primaryColor: tenant?.branding.primaryColor ?? DEFAULT_BRANDING.primaryColor,
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px] lg:items-start">
      <Card>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Basic details</h3>

              <div className="space-y-2">
                <Label htmlFor="name">Tenant name</Label>
                <div className="relative">
                  <Building2 className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    autoFocus
                    placeholder="e.g. Horizon Travel Group"
                    aria-invalid={!!errors.name}
                    className="h-10 ps-9"
                    {...register("name")}
                  />
                </div>
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="slug">Tenant code</Label>
                  <div className="relative">
                    <Hash className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
                    <Input
                      id="slug"
                      placeholder="e.g. horizonTravel"
                      disabled={isEdit}
                      aria-invalid={!!errors.slug}
                      className="h-10 ps-9"
                      {...register("slug")}
                    />
                  </div>
                  {errors.slug && <p className="text-sm text-destructive">{errors.slug.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Controller
                    control={control}
                    name="defaultCurrency"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={(value) => field.onChange(value ?? "")}>
                        <SelectTrigger className="h-10 w-full">
                          <Coins className="h-4 w-4 text-muted-foreground" />
                          <SelectValue>
                            {(value: CurrencyCode | null) =>
                              value ? `${value} — ${currencyMeta[value].name}` : "Select currency"
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCY_CODES.map((code) => (
                            <SelectItem key={code} value={code}>
                              {code} — {currencyMeta[code].name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.defaultCurrency && (
                    <p className="text-sm text-destructive">{errors.defaultCurrency.message}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4 border-t border-border pt-6">
              <h3 className="text-sm font-semibold text-foreground">Address</h3>

              <div className="space-y-2">
                <Label htmlFor="addressLine1">Address line 1</Label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
                  <Input
                    id="addressLine1"
                    placeholder="Street address"
                    aria-invalid={!!errors.addressLine1}
                    className="h-10 ps-9"
                    {...register("addressLine1")}
                  />
                </div>
                {errors.addressLine1 && (
                  <p className="text-sm text-destructive">{errors.addressLine1.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="addressLine2">Address line 2</Label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
                  <Input
                    id="addressLine2"
                    placeholder="Suite, floor, building (optional)"
                    className="h-10 ps-9"
                    {...register("addressLine2")}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Controller
                    control={control}
                    name="country"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value ?? "");
                          setValue("city", "");
                        }}
                      >
                        <SelectTrigger className="h-10 w-full">
                          <Globe2 className="h-4 w-4 text-muted-foreground" />
                          <SelectValue>
                            {(value: string | null) => (value ? getCountry(value)?.name : "Select country")}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {COUNTRIES.map((c) => (
                            <SelectItem key={c.code} value={c.code}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.country && <p className="text-sm text-destructive">{errors.country.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label>City</Label>
                  <Controller
                    control={control}
                    name="city"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={(value) => field.onChange(value ?? "")}
                        disabled={!countryValue}
                      >
                        <SelectTrigger className="h-10 w-full">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <SelectValue placeholder={countryValue ? "Select city" : "Select a country first"} />
                        </SelectTrigger>
                        <SelectContent>
                          {cityOptions.map((city) => (
                            <SelectItem key={city} value={city}>
                              {city}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.city && <p className="text-sm text-destructive">{errors.city.message}</p>}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="zip">Zip / postal code</Label>
                  <Input id="zip" placeholder="e.g. 10006" aria-invalid={!!errors.zip} className="h-10" {...register("zip")} />
                  {errors.zip && <p className="text-sm text-destructive">{errors.zip.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Controller
                    control={control}
                    name="timezone"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={(value) => field.onChange(value ?? "")}>
                        <SelectTrigger className="h-10 w-full">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                        <SelectContent>
                          {TIMEZONES.map((tz) => (
                            <SelectItem key={tz} value={tz}>
                              {tz}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.timezone && <p className="text-sm text-destructive">{errors.timezone.message}</p>}
                </div>
              </div>
            </div>

            <div className="space-y-4 border-t border-border pt-6">
              <h3 className="text-sm font-semibold text-foreground">Contact</h3>

              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="hello@company.com"
                    aria-invalid={!!errors.email}
                    className="h-10 ps-9"
                    {...register("email")}
                  />
                </div>
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Phone number</Label>
                <div className="flex gap-2">
                  <Controller
                    control={control}
                    name="dialCode"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={(value) => field.onChange(value ?? "")}>
                        <SelectTrigger className="h-10 w-32 shrink-0">
                          <SelectValue placeholder="Code" />
                        </SelectTrigger>
                        <SelectContent>
                          {COUNTRIES.map((c) => (
                            <SelectItem key={c.code} value={c.dialCode}>
                              {c.dialCode} {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <div className="relative flex-1">
                    <Phone className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      placeholder="Phone number"
                      aria-invalid={!!errors.phone}
                      className="h-10 ps-9"
                      {...register("phone")}
                    />
                  </div>
                </div>
                {(errors.dialCode || errors.phone) && (
                  <p className="text-sm text-destructive">
                    {errors.dialCode?.message ?? errors.phone?.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 border-t border-border pt-6">
              <Button type="submit" disabled={isSubmitting}>
                {isEdit ? <Save className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                {isEdit ? "Save changes" : "Register tenant"}
              </Button>
              <Button
                type="button"
                variant="outline"
                nativeButton={false}
                render={
                  <Link href={isEdit ? `/${role}/masters/tenant/${tenant.id}` : `/${role}/masters/tenant`} />
                }
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-muted/40 lg:sticky lg:top-6">
        <CardContent className="space-y-4">
          <p className="text-xs font-medium text-muted-foreground">Preview</p>

          <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
            <TenantLogo branding={previewBranding} size="md" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{previewBranding.name}</p>
              <Badge variant="default" className="mt-0.5">
                active
              </Badge>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
            <LogIn className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Signs in at{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-foreground">
                /{slugValue?.trim() || "{code}"}/login
              </code>
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
