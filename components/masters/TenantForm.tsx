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
import { useSessionStore } from "@/lib/store/session.store";
import { useUsersStore } from "@/lib/store/users.store";
import {
  createTenant,
  updateTenant as updateTenantApi,
  TenantsApiError,
} from "@/lib/services/tenants.service";
import { useHydrateReferenceMasters, useCitiesForCountry } from "@/lib/hooks/useReferenceMasters";
import { useReferenceStore } from "@/lib/store/reference.store";
import type { CurrencyCode, Tenant } from "@/types";

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
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const tenants = useTenantsStore((s) => s.tenants);
  const upsertTenant = useTenantsStore((s) => s.upsertTenant);
  const countries = useReferenceStore((s) => s.countries);
  const currencies = useReferenceStore((s) => s.currencies);
  const { loading: referenceLoading, error: referenceError } = useHydrateReferenceMasters();
  const schema = useTenantSchema(tenants, tenant?.id);
  const isEdit = !!tenant;
  const actorKey = user
    ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0)
    : 0;

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
  const { cities: cityOptions, loading: citiesLoading } = useCitiesForCountry(countryValue || undefined);

  async function onSubmit(values: FormValues) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again before saving tenants.");
      return;
    }

    const write = {
      tenantCode: values.slug.trim(),
      tenantName: values.name.trim(),
      groupName: values.name.trim(),
      defaultCurrency: values.defaultCurrency as CurrencyCode,
      supportedCurrencies: tenant?.supportedCurrencies ?? [values.defaultCurrency as CurrencyCode],
      defaultLocale: tenant?.defaultLocale ?? "en",
      supportedLocales: tenant?.supportedLocales ?? ["en"],
      primaryColor: tenant?.branding.primaryColor ?? "#2563EB",
      logoUrl: tenant?.branding.logoUrl ?? "",
      address: {
        line1: values.addressLine1.trim(),
        line2: values.addressLine2?.trim() || undefined,
        country: values.country,
        city: values.city,
        zip: values.zip.trim(),
        timezone: values.timezone,
      },
      contact: { email: values.email.trim(), dialCode: values.dialCode, phone: values.phone.trim() },
      status: tenant?.status ?? ("active" as const),
    };

    try {
      if (isEdit && tenant) {
        const saved = await updateTenantApi(tenant.tenantKey, {
          ...write,
          modifiedBy: actorKey,
        });
        upsertTenant(saved);
        toast.success("Tenant updated");
        router.push(`/${role}/masters/tenant/${saved.id}`);
      } else {
        const created = await createTenant({
          ...write,
          createdBy: actorKey,
        });
        upsertTenant(created);
        toast.success("Tenant registered");
        router.push(`/${role}/masters/tenant/${created.id}`);
      }
    } catch (error) {
      const message = error instanceof TenantsApiError ? error.message : "Could not save tenant";
      toast.error(message);
    }
  }

  const previewBranding = {
    name: nameValue?.trim() || "Your organization",
    logoUrl: "",
    primaryColor: tenant?.branding.primaryColor ?? "#2563EB",
  };

  if (referenceLoading) {
    return <div className="text-sm text-muted-foreground">Loading country, city, and currency masters…</div>;
  }

  if (referenceError) {
    return <div className="text-sm text-destructive">{referenceError}</div>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px] lg:items-start">
      <Card>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Basic details</h3>

              <div className="space-y-2">
                <Label htmlFor="name" required>
                  Tenant name
                </Label>
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
                  <Label htmlFor="slug" required>
                    Tenant code
                  </Label>
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
                  <Label required>Currency</Label>
                  <Controller
                    control={control}
                    name="defaultCurrency"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={(value) => field.onChange(value ?? "")}>
                        <SelectTrigger className="h-10 w-full">
                          <Coins className="h-4 w-4 text-muted-foreground" />
                          <SelectValue>
                            {(value: string | null) => {
                              if (!value) return "Select currency";
                              const meta = currencies.find((c) => c.code === value);
                              return meta ? `${meta.code} — ${meta.name}` : value;
                            }}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {currencies.map((currency) => (
                            <SelectItem key={currency.id} value={currency.code}>
                              {currency.code} — {currency.name}
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
                <Label htmlFor="addressLine1" required>
                  Address line 1
                </Label>
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
                  <Label required>Country</Label>
                  <Controller
                    control={control}
                    name="country"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          const code = value ?? "";
                          field.onChange(code);
                          setValue("city", "");
                          const selected = countries.find((c) => c.code === code);
                          if (selected) setValue("dialCode", selected.dialCode);
                        }}
                      >
                        <SelectTrigger className="h-10 w-full">
                          <Globe2 className="h-4 w-4 text-muted-foreground" />
                          <SelectValue>
                            {(value: string | null) =>
                              value
                                ? (countries.find((c) => c.code === value)?.name ?? value)
                                : "Select country"
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {countries.map((c) => (
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
                  <Label required>City</Label>
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
                          <SelectValue
                            placeholder={
                              !countryValue
                                ? "Select a country first"
                                : citiesLoading
                                  ? "Loading cities…"
                                  : "Select city"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {cityOptions.map((city) => (
                            <SelectItem key={city.id} value={city.name}>
                              {city.name}
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
                  <Label htmlFor="zip" required>
                    Zip / postal code
                  </Label>
                  <Input id="zip" placeholder="e.g. 10006" aria-invalid={!!errors.zip} className="h-10" {...register("zip")} />
                  {errors.zip && <p className="text-sm text-destructive">{errors.zip.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label required>Timezone</Label>
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
                <Label htmlFor="email" required>
                  Email address
                </Label>
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
                <Label required>Phone number</Label>
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
                          {countries.map((c) => (
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
