"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { CalendarRange, Loader2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Section } from "@/components/masters/PropertyFormSection";
import { ExtranetPropertyPicker } from "@/components/shared/ExtranetPropertyPicker";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { useExtranetPropertyScopeStore } from "@/lib/store/extranet-property-scope.store";
import { resolveSessionCompanyKey } from "@/lib/session-company";
import {
  createPropertySeason,
  updatePropertySeason,
  PropertySeasonsApiError,
} from "@/lib/services/property-seasons.service";
import type { PropertySeason } from "@/types";

const SEASON_CODE_PRESETS = ["LOW", "HIGH", "PEAK"] as const;

const schema = z.object({
  propertyId: z.number().int().positive("Property is required"),
  seasonCode: z.string().trim().min(1, "Season code is required").max(50),
  seasonName: z.string().trim().min(1, "Season name is required").max(100),
  displayOrder: z.number().int(),
  isActive: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

function emptyValues(propertyId = 0): FormValues {
  return {
    propertyId,
    seasonCode: "",
    seasonName: "",
    displayOrder: 0,
    isActive: true,
  };
}

function valuesFromEntry(entry: PropertySeason): FormValues {
  return {
    propertyId: entry.propertyId,
    seasonCode: entry.seasonCode,
    seasonName: entry.seasonName,
    displayOrder: entry.displayOrder,
    isActive: entry.isActive,
  };
}

/** Shared Create / Modify form for a property season (Low / High / Peak, …). */
export function PropertySeasonForm({ entry }: { entry?: PropertySeason }) {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionUser = useSessionStore((s) => s.user);
  const activeTenant = useTenantStore((s) => s.tenant);
  const tenantKey = sessionUser?.tenantKey ?? activeTenant.tenantKey ?? 0;
  const companyKey = resolveSessionCompanyKey(sessionUser) ?? 0;
  const actorKey = sessionUser?.userKey ?? 0;
  const isEdit = !!entry;
  const scope = useExtranetPropertyScopeStore();
  const urlPropertyId = Number(searchParams.get("propertyId") ?? 0);
  const presetPropertyId =
    Number.isFinite(urlPropertyId) && urlPropertyId > 0 ? urlPropertyId : (scope.propertyId ?? 0);
  const presetPropertyLabel =
    !isEdit && presetPropertyId > 0 && scope.propertyId === presetPropertyId ? scope.propertyLabel : null;
  const [selectedPropertyLabel, setSelectedPropertyLabel] = useState<string | null>(presetPropertyLabel);
  const [propertyLocked, setPropertyLocked] = useState(!isEdit && !!presetPropertyLabel);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: entry
      ? valuesFromEntry(entry)
      : emptyValues(Number.isFinite(presetPropertyId) && presetPropertyId > 0 ? presetPropertyId : 0),
  });

  const seasonCode = watch("seasonCode");
  const seasonName = watch("seasonName");
  const propertyId = watch("propertyId");

  function applyPreset(code: (typeof SEASON_CODE_PRESETS)[number]) {
    setValue("seasonCode", code, { shouldValidate: true });
    const names: Record<(typeof SEASON_CODE_PRESETS)[number], string> = {
      LOW: "Low Season",
      HIGH: "High Season",
      PEAK: "Peak Season",
    };
    if (!seasonName?.trim()) {
      setValue("seasonName", names[code], { shouldValidate: true });
    }
  }

  async function onSubmit(values: FormValues) {
    if (!actorKey || tenantKey <= 0 || companyKey <= 0) {
      toast.error("Missing session context — sign in again.");
      return;
    }
    const payload = {
      tenantId: tenantKey,
      companyId: companyKey,
      propertyId: values.propertyId,
      seasonCode: values.seasonCode.trim().toUpperCase(),
      seasonName: values.seasonName.trim(),
      displayOrder: values.displayOrder,
      isActive: values.isActive,
    };
    try {
      if (isEdit && entry) {
        const saved = await updatePropertySeason(entry.propertySeasonKey, {
          ...payload,
          modifiedBy: actorKey,
        });
        toast.success("Season updated");
        router.push(`/${role}/extranet/seasons/${saved.propertySeasonKey}`);
      } else {
        const saved = await createPropertySeason({ ...payload, createdBy: actorKey });
        toast.success("Season created");
        router.push(`/${role}/extranet/seasons/${saved.propertySeasonKey}`);
      }
    } catch (error) {
      toast.error(error instanceof PropertySeasonsApiError ? error.message : "Could not save season");
    }
  }

  const listHref =
    propertyId > 0
      ? `/${role}/extranet/seasons?propertyId=${propertyId}`
      : `/${role}/extranet/seasons`;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-6">
      <Section
        icon={CalendarRange}
        title="Season details"
        description="Select the property, then define Low / High / Peak (or custom) seasons."
      >
        <Controller
          name="propertyId"
          control={control}
          render={({ field }) => (
            <>
              <ExtranetPropertyPicker
                tenantId={tenantKey}
                value={field.value > 0 ? field.value : null}
                onChange={(id, property) => {
                  field.onChange(id ?? 0);
                  const label = property
                    ? property.propertyDisplayName || property.propertyName || property.propertyCode
                    : null;
                  setSelectedPropertyLabel(label);
                  if (!isEdit) {
                    scope.setProperty({
                      propertyId: id,
                      propertyLabel: label,
                      countryId: property?.countryId ?? null,
                      stateId: property?.stateId ?? null,
                      cityId: property?.cityId ?? null,
                      areaId: property?.areaId ?? null,
                    });
                  }
                }}
                disabled={isEdit || propertyLocked}
                selectedLabel={
                  entry ? entry.propertyName || entry.propertyCode || `Property #${entry.propertyId}` : selectedPropertyLabel
                }
                initialCountryId={scope.countryId}
                initialStateId={scope.stateId}
                initialCityId={scope.cityId}
                initialAreaId={scope.areaId}
                error={errors.propertyId?.message}
              />
              {!isEdit && propertyLocked && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setPropertyLocked(false)}>
                  Change property
                </Button>
              )}
            </>
          )}
        />

        <div className="space-y-2">
          <Label htmlFor="seasonCode" required>
            Season code
          </Label>
          <div className="flex flex-wrap gap-2">
            {SEASON_CODE_PRESETS.map((code) => (
              <Button
                key={code}
                type="button"
                size="sm"
                variant={seasonCode?.toUpperCase() === code ? "default" : "outline"}
                onClick={() => applyPreset(code)}
              >
                {code}
              </Button>
            ))}
          </div>
          <Input
            id="seasonCode"
            placeholder="LOW / HIGH / PEAK"
            aria-invalid={!!errors.seasonCode}
            {...register("seasonCode")}
          />
          {errors.seasonCode && <p className="text-sm text-destructive">{errors.seasonCode.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="seasonName" required>
            Season name
          </Label>
          <Input
            id="seasonName"
            placeholder="Low Season"
            aria-invalid={!!errors.seasonName}
            {...register("seasonName")}
          />
          {errors.seasonName && <p className="text-sm text-destructive">{errors.seasonName.message}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="displayOrder">Display order</Label>
            <Input id="displayOrder" type="number" {...register("displayOrder", { valueAsNumber: true })} />
            {errors.displayOrder && <p className="text-sm text-destructive">{errors.displayOrder.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ? "active" : "inactive"}
                  onValueChange={(v) => field.onChange(v === "active")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
      </Section>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isEdit ? "Save changes" : "Create season"}
        </Button>
        <Button
          type="button"
          variant="outline"
          nativeButton={false}
          render={
            <Link
              href={
                isEdit && entry ? `/${role}/extranet/seasons/${entry.propertySeasonKey}` : listHref
              }
            />
          }
        >
          <X className="h-4 w-4" />
          Cancel
        </Button>
      </div>
    </form>
  );
}
