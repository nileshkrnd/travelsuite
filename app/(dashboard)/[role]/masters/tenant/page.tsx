"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Check, Palette } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTenantStore } from "@/lib/store/tenant.store";
import { currencyMeta } from "@/mock/data/exchangeRates";
import { LOCALE_LABELS } from "@/config/i18n/locales";
import { THEME_PRESETS } from "@/config/themePresets";
import { cn } from "@/lib/utils";
import type { CurrencyCode } from "@/types";

const schema = z.object({
  name: z.string().min(1, "Tenant name is required"),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Enter a valid hex color, e.g. #2563EB"),
  defaultCurrency: z.string().min(1),
  defaultLocale: z.string().min(1),
});
type FormValues = z.infer<typeof schema>;

function TenantForm() {
  const tenant = useTenantStore((s) => s.tenant);
  const updateTenant = useTenantStore((s) => s.updateTenant);
  const [showCustom, setShowCustom] = useState(
    () => !THEME_PRESETS.some((p) => p.primaryColor.toLowerCase() === tenant.branding.primaryColor.toLowerCase())
  );

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: tenant.branding.name,
      primaryColor: tenant.branding.primaryColor,
      defaultCurrency: tenant.defaultCurrency,
      defaultLocale: tenant.defaultLocale,
    },
  });

  async function onSubmit(values: FormValues) {
    updateTenant({
      branding: { ...tenant.branding, name: values.name, primaryColor: values.primaryColor },
      defaultCurrency: values.defaultCurrency as CurrencyCode,
      defaultLocale: values.defaultLocale,
    });
    toast.success("Tenant profile updated");
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Tenant" description="Your organization's master profile — branding and defaults." />
      <Card className="max-w-xl">
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tenant name</Label>
              <Input id="name" {...register("name")} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Theme</Label>
              <Controller
                control={control}
                name="primaryColor"
                render={({ field }) => (
                  <div className="flex flex-wrap items-center gap-2">
                    {THEME_PRESETS.map((preset) => {
                      const active = !showCustom && field.value.toLowerCase() === preset.primaryColor.toLowerCase();
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          title={preset.name}
                          aria-label={preset.name}
                          onClick={() => {
                            field.onChange(preset.primaryColor);
                            setShowCustom(false);
                          }}
                          className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-background transition-all",
                            active ? "ring-foreground" : "ring-transparent hover:ring-border"
                          )}
                          style={{ backgroundColor: preset.primaryColor }}
                        >
                          {active && <Check className="h-4 w-4 text-white drop-shadow" />}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      title="Custom color"
                      aria-label="Custom color"
                      onClick={() => setShowCustom(true)}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full border-2 border-dashed text-muted-foreground ring-2 ring-offset-2 ring-offset-background transition-all",
                        showCustom ? "border-foreground text-foreground ring-foreground" : "ring-transparent hover:ring-border"
                      )}
                    >
                      <Palette className="h-4 w-4" />
                    </button>
                  </div>
                )}
              />

              {showCustom && (
                <div className="flex items-center gap-2 pt-1">
                  <Controller
                    control={control}
                    name="primaryColor"
                    render={({ field }) => (
                      <input
                        type="color"
                        value={field.value}
                        onChange={field.onChange}
                        className="h-8 w-12 shrink-0 cursor-pointer rounded border border-input bg-transparent p-0.5"
                        aria-label="Custom brand color picker"
                      />
                    )}
                  />
                  <Input id="primaryColor" className="h-8 flex-1" {...register("primaryColor")} />
                </div>
              )}
              {errors.primaryColor && <p className="text-sm text-destructive">{errors.primaryColor.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Default currency</Label>
                <Controller
                  control={control}
                  name="defaultCurrency"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {tenant.supportedCurrencies.map((code) => (
                          <SelectItem key={code} value={code}>
                            {code} — {currencyMeta[code].name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Default language</Label>
                <Controller
                  control={control}
                  name="defaultLocale"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {tenant.supportedLocales.map((code) => (
                          <SelectItem key={code} value={code}>
                            {LOCALE_LABELS[code] ?? code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <Button type="submit" disabled={isSubmitting}>
              Save changes
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function TenantMasterPage() {
  return <AccessGate module="tenantProfile">{() => <TenantForm />}</AccessGate>;
}
