"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Settings2, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSessionStore } from "@/lib/store/session.store";
import { useUsersStore } from "@/lib/store/users.store";
import { listDurationUnits } from "@/lib/services/duration-units.service";
import { listBookingModels } from "@/lib/services/booking-models.service";
import { listPricingModels } from "@/lib/services/pricing-models.service";
import {
  getServiceProductConfiguration,
  saveServiceProductConfiguration,
  ServiceProductConfigurationsApiError,
} from "@/lib/services/service-product-configurations.service";
import { can } from "@/config/permissions";
import type { BookingModel, DurationUnit, PricingModel, RoleDef, ServiceProduct } from "@/types";

const NONE_OPTION = "__none__";

interface FormValues {
  durationValue: string;
  durationUnitId: number | null;
  bookingModelId: number | null;
  pricingModelId: number | null;
  minimumPax: string;
  maximumPax: string;
  minimumAge: string;
  maximumAge: string;
  isInstantConfirmation: boolean;
  isRequestOnly: boolean;
  isDateRequired: boolean;
  isTimeRequired: boolean;
  isPickupRequired: boolean;
  isDropoffRequired: boolean;
  isScheduleRequired: boolean;
  isAvailabilityRequired: boolean;
  isItineraryRequired: boolean;
  isCancellationPolicyRequired: boolean;
}

const EMPTY_VALUES: FormValues = {
  durationValue: "",
  durationUnitId: null,
  bookingModelId: null,
  pricingModelId: null,
  minimumPax: "",
  maximumPax: "",
  minimumAge: "",
  maximumAge: "",
  isInstantConfirmation: false,
  isRequestOnly: false,
  isDateRequired: false,
  isTimeRequired: false,
  isPickupRequired: false,
  isDropoffRequired: false,
  isScheduleRequired: false,
  isAvailabilityRequired: false,
  isItineraryRequired: false,
  isCancellationPolicyRequired: false,
};

const BOOLEAN_FIELDS: { key: keyof FormValues; label: string }[] = [
  { key: "isInstantConfirmation", label: "Instant confirmation" },
  { key: "isRequestOnly", label: "Supplier confirmation required" },
  { key: "isDateRequired", label: "Booking date required" },
  { key: "isTimeRequired", label: "Booking time required" },
  { key: "isPickupRequired", label: "Pickup information required" },
  { key: "isDropoffRequired", label: "Drop-off information required" },
  { key: "isScheduleRequired", label: "Schedule required" },
  { key: "isAvailabilityRequired", label: "Availability required" },
  { key: "isItineraryRequired", label: "Itinerary required" },
  { key: "isCancellationPolicyRequired", label: "Cancellation policy required" },
];

export function ProductConfigurationTab({ product, roleDef }: { product: ServiceProduct; roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const [durationUnits, setDurationUnits] = useState<DurationUnit[]>([]);
  const [bookingModels, setBookingModels] = useState<BookingModel[]>([]);
  const [pricingModels, setPricingModels] = useState<PricingModel[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(true);

  const canEdit = can(roleDef, "serviceProductConfiguration", "edit");
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  const { control, register, reset, handleSubmit, formState: { isSubmitting } } = useForm<FormValues>({ defaultValues: EMPTY_VALUES });

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      listDurationUnits({ tenantId: product.tenantId, activeOnly: true }),
      listBookingModels({ tenantId: product.tenantId, activeOnly: true }),
      listPricingModels({ tenantId: product.tenantId, activeOnly: true }),
    ]).then(([unitRows, bookingRows, pricingRows]) => {
      if (cancelled) return;
      setDurationUnits(unitRows);
      setBookingModels(bookingRows);
      setPricingModels(pricingRows);
    });
    return () => {
      cancelled = true;
    };
  }, [product.tenantId]);

  useEffect(() => {
    let cancelled = false;
    setLoadingConfig(true);
    getServiceProductConfiguration(product.serviceProductId)
      .then((existing) => {
        if (cancelled) return;
        reset(
          existing
            ? {
                durationValue: existing.durationValue != null ? String(existing.durationValue) : "",
                durationUnitId: existing.durationUnitId,
                bookingModelId: existing.bookingModelId,
                pricingModelId: existing.pricingModelId,
                minimumPax: existing.minimumPax != null ? String(existing.minimumPax) : "",
                maximumPax: existing.maximumPax != null ? String(existing.maximumPax) : "",
                minimumAge: existing.minimumAge != null ? String(existing.minimumAge) : "",
                maximumAge: existing.maximumAge != null ? String(existing.maximumAge) : "",
                isInstantConfirmation: existing.isInstantConfirmation,
                isRequestOnly: existing.isRequestOnly,
                isDateRequired: existing.isDateRequired,
                isTimeRequired: existing.isTimeRequired,
                isPickupRequired: existing.isPickupRequired,
                isDropoffRequired: existing.isDropoffRequired,
                isScheduleRequired: existing.isScheduleRequired,
                isAvailabilityRequired: existing.isAvailabilityRequired,
                isItineraryRequired: existing.isItineraryRequired,
                isCancellationPolicyRequired: existing.isCancellationPolicyRequired,
              }
            : EMPTY_VALUES
        );
      })
      .catch((error) => {
        if (!cancelled) toast.error(error instanceof ServiceProductConfigurationsApiError ? error.message : "Failed to load configuration");
      })
      .finally(() => {
        if (!cancelled) setLoadingConfig(false);
      });
    return () => {
      cancelled = true;
    };
  }, [product.serviceProductId, reset]);

  async function onSubmit(values: FormValues) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      await saveServiceProductConfiguration({
        serviceProductId: product.serviceProductId,
        durationValue: values.durationValue === "" ? null : Number(values.durationValue),
        durationUnitId: values.durationUnitId,
        bookingModelId: values.bookingModelId,
        pricingModelId: values.pricingModelId,
        minimumPax: values.minimumPax === "" ? null : Number(values.minimumPax),
        maximumPax: values.maximumPax === "" ? null : Number(values.maximumPax),
        minimumAge: values.minimumAge === "" ? null : Number(values.minimumAge),
        maximumAge: values.maximumAge === "" ? null : Number(values.maximumAge),
        isInstantConfirmation: values.isInstantConfirmation,
        isRequestOnly: values.isRequestOnly,
        isDateRequired: values.isDateRequired,
        isTimeRequired: values.isTimeRequired,
        isPickupRequired: values.isPickupRequired,
        isDropoffRequired: values.isDropoffRequired,
        isScheduleRequired: values.isScheduleRequired,
        isAvailabilityRequired: values.isAvailabilityRequired,
        isItineraryRequired: values.isItineraryRequired,
        isCancellationPolicyRequired: values.isCancellationPolicyRequired,
        actorId: userKey,
      });
      toast.success("Configuration saved");
    } catch (error) {
      toast.error(error instanceof ServiceProductConfigurationsApiError ? error.message : "Could not save configuration");
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Settings2 className="h-4 w-4 text-muted-foreground" />
          {product.serviceProductName} configuration
        </div>

        {loadingConfig ? (
          <p className="text-sm text-muted-foreground">Loading configuration…</p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="durationValue">Duration value</Label>
                <Input id="durationValue" type="number" min={0} step="0.5" disabled={!canEdit} {...register("durationValue")} />
              </div>
              <div className="space-y-2">
                <Label>Duration unit</Label>
                <Controller
                  control={control}
                  name="durationUnitId"
                  render={({ field }) => (
                    <Select value={field.value == null ? NONE_OPTION : String(field.value)} onValueChange={(v) => field.onChange(!v || v === NONE_OPTION ? null : Number(v))} disabled={!canEdit}>
                      <SelectTrigger className="h-10 w-full min-w-0">
                        <SelectValue>
                          {(value: string | null) => {
                            if (!value || value === NONE_OPTION) return "None";
                            return durationUnits.find((u) => String(u.durationUnitId) === value)?.durationUnitName ?? "None";
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_OPTION}>None</SelectItem>
                        {durationUnits.map((u) => (
                          <SelectItem key={u.durationUnitId} value={String(u.durationUnitId)}>
                            {u.durationUnitName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Booking model</Label>
                <Controller
                  control={control}
                  name="bookingModelId"
                  render={({ field }) => (
                    <Select value={field.value == null ? NONE_OPTION : String(field.value)} onValueChange={(v) => field.onChange(!v || v === NONE_OPTION ? null : Number(v))} disabled={!canEdit}>
                      <SelectTrigger className="h-10 w-full min-w-0">
                        <SelectValue>
                          {(value: string | null) => {
                            if (!value || value === NONE_OPTION) return "None";
                            return bookingModels.find((m) => String(m.bookingModelId) === value)?.bookingModelName ?? "None";
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_OPTION}>None</SelectItem>
                        {bookingModels.map((m) => (
                          <SelectItem key={m.bookingModelId} value={String(m.bookingModelId)}>
                            {m.bookingModelName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Pricing model</Label>
                <Controller
                  control={control}
                  name="pricingModelId"
                  render={({ field }) => (
                    <Select value={field.value == null ? NONE_OPTION : String(field.value)} onValueChange={(v) => field.onChange(!v || v === NONE_OPTION ? null : Number(v))} disabled={!canEdit}>
                      <SelectTrigger className="h-10 w-full min-w-0">
                        <SelectValue>
                          {(value: string | null) => {
                            if (!value || value === NONE_OPTION) return "None";
                            return pricingModels.find((m) => String(m.pricingModelId) === value)?.pricingModelName ?? "None";
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_OPTION}>None</SelectItem>
                        {pricingModels.map((m) => (
                          <SelectItem key={m.pricingModelId} value={String(m.pricingModelId)}>
                            {m.pricingModelName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minimumPax">Minimum pax</Label>
                <Input id="minimumPax" type="number" min={0} disabled={!canEdit} {...register("minimumPax")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maximumPax">Maximum pax</Label>
                <Input id="maximumPax" type="number" min={0} disabled={!canEdit} {...register("maximumPax")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minimumAge">Minimum age</Label>
                <Input id="minimumAge" type="number" min={0} disabled={!canEdit} {...register("minimumAge")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maximumAge">Maximum age</Label>
                <Input id="maximumAge" type="number" min={0} disabled={!canEdit} {...register("maximumAge")} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {BOOLEAN_FIELDS.map((f) => (
                <Controller
                  key={f.key}
                  control={control}
                  name={f.key}
                  render={({ field }) => (
                    <label className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm">
                      <Checkbox checked={field.value as boolean} onCheckedChange={(v) => field.onChange(!!v)} disabled={!canEdit} />
                      {f.label}
                    </label>
                  )}
                />
              ))}
            </div>

            {canEdit && (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Save configuration
              </Button>
            )}
          </form>
        )}
      </CardContent>
    </Card>
  );
}
