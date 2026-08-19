"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Settings2, Loader2, Tags } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore, isPlatformMode } from "@/lib/store/tenant.store";
import { useUsersStore } from "@/lib/store/users.store";
import { listServiceTypes, ServiceTypesApiError } from "@/lib/services/service-types.service";
import {
  listServiceTypeConfigurations,
  saveServiceTypeConfiguration,
  ServiceTypeConfigurationsApiError,
  type ServiceTypeConfigurationFlags,
} from "@/lib/services/service-type-configurations.service";
import { can } from "@/config/permissions";
import { SUPER_ADMIN_ROLE_ID } from "@/mock/data/roles";
import type { RoleDef, ServiceType } from "@/types";

const FLAG_FIELDS: { key: keyof ServiceTypeConfigurationFlags; label: string; hint: string }[] = [
  { key: "isDurationApplicable", label: "Duration", hint: "Product has a duration (e.g. 2 hours, 3 nights)" },
  { key: "isBookingModelApplicable", label: "Booking model", hint: "Product is booked by date, time slot, request, …" },
  { key: "isPricingModelApplicable", label: "Pricing model", hint: "Product is priced per person, per vehicle, flat, …" },
  { key: "isPaxApplicable", label: "Pax count", hint: "Product tracks number of travelers" },
  { key: "isAgeApplicable", label: "Age bands", hint: "Product has adult/child/infant age rules" },
  { key: "isPickupApplicable", label: "Pickup", hint: "Product has a pickup location/point" },
  { key: "isDropoffApplicable", label: "Drop-off", hint: "Product has a drop-off location/point" },
  { key: "isScheduleApplicable", label: "Schedule", hint: "Product runs on a fixed schedule (departures, slots)" },
  { key: "isAvailabilityApplicable", label: "Availability", hint: "Product has a bookable-seats / allotment concept" },
  { key: "isItineraryApplicable", label: "Itinerary", hint: "Product has a multi-stop itinerary" },
  { key: "isCancellationApplicable", label: "Cancellation policy", hint: "Product supports a cancellation policy" },
  { key: "isOnlineSellable", label: "Online sellable", hint: "Product can be sold through the online booking engine" },
];

type FormValues = Record<keyof ServiceTypeConfigurationFlags, boolean>;

const EMPTY_VALUES: FormValues = FLAG_FIELDS.reduce((acc, f) => {
  acc[f.key] = false;
  return acc;
}, {} as FormValues);

function ServiceTypeConfigurationView({ roleDef }: { roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const activeTenantId = useTenantStore((s) => s.tenantId);
  const activeTenant = useTenantStore((s) => s.tenant);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [serviceTypeFilter, setServiceTypeFilter] = useState<number | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);

  const isSuperAdmin = roleDef.id === SUPER_ADMIN_ROLE_ID;
  const platformMode = isSuperAdmin && isPlatformMode(activeTenantId);
  const scopeTenantId = platformMode ? 0 : (user?.tenantKey ?? activeTenant.tenantKey ?? 0);

  const canEdit = can(roleDef, "serviceTypeConfiguration", "edit");
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  const selectedServiceType = serviceTypes.find((t) => t.serviceTypeId === serviceTypeFilter);

  const {
    control,
    reset,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormValues>({ defaultValues: EMPTY_VALUES });

  async function loadServiceTypes() {
    if (scopeTenantId <= 0) {
      setServiceTypes([]);
      setLoadingTypes(false);
      setLoadError(platformMode ? "Select a tenant workspace to manage configuration." : "Missing tenant scope.");
      return;
    }
    setLoadingTypes(true);
    setLoadError(null);
    try {
      const typeRows = await listServiceTypes({ tenantId: scopeTenantId, activeOnly: true });
      setServiceTypes(typeRows);
      setServiceTypeFilter((current) =>
        current && typeRows.some((t) => t.serviceTypeId === current) ? current : (typeRows[0]?.serviceTypeId ?? null)
      );
    } catch (error) {
      setLoadError(error instanceof ServiceTypesApiError ? error.message : "Failed to load service types");
      setServiceTypes([]);
    } finally {
      setLoadingTypes(false);
    }
  }

  useEffect(() => {
    void loadServiceTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeTenantId]);

  useEffect(() => {
    if (!serviceTypeFilter || scopeTenantId <= 0) {
      reset(EMPTY_VALUES);
      return;
    }
    let cancelled = false;
    setLoadingConfig(true);
    listServiceTypeConfigurations({ tenantId: scopeTenantId, serviceTypeId: serviceTypeFilter })
      .then((rows) => {
        if (cancelled) return;
        const existing = rows[0];
        reset(
          existing
            ? FLAG_FIELDS.reduce((acc, f) => {
                acc[f.key] = existing[f.key];
                return acc;
              }, {} as FormValues)
            : EMPTY_VALUES
        );
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(
            error instanceof ServiceTypeConfigurationsApiError ? error.message : "Failed to load configuration"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingConfig(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceTypeFilter, scopeTenantId]);

  async function onSubmit(values: FormValues) {
    if (!selectedServiceType) return;
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      await saveServiceTypeConfiguration({
        ...values,
        serviceTypeId: selectedServiceType.serviceTypeId,
        tenantId: scopeTenantId,
        companyId: selectedServiceType.companyId,
        actorId: userKey,
      });
      toast.success("Configuration saved");
    } catch (error) {
      toast.error(
        error instanceof ServiceTypeConfigurationsApiError ? error.message : "Could not save configuration"
      );
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Service Type Configuration"
        description="Which optional product attributes apply to each service type — duration, pricing model, pickup/drop-off, and more."
      />

      {loadError && <p className="text-sm text-destructive">{loadError}</p>}
      {loadingTypes && <p className="text-sm text-muted-foreground">Loading service types…</p>}
      {!loadingTypes && scopeTenantId > 0 && serviceTypes.length === 0 && (
        <EmptyState
          icon={Tags}
          tone="muted"
          heading="No service types yet"
          description="Create a service type first under Admin → Product → Service Type."
          size="compact"
        />
      )}

      {!loadingTypes && serviceTypes.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select
            value={serviceTypeFilter ? String(serviceTypeFilter) : ""}
            onValueChange={(v) => setServiceTypeFilter(v ? Number(v) : null)}
          >
            <SelectTrigger className="w-64">
              <SelectValue>
                {(value: string | null) => {
                  if (!value) return "Select service type";
                  return serviceTypes.find((t) => String(t.serviceTypeId) === value)?.serviceTypeName ?? value;
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {serviceTypes.map((t) => (
                <SelectItem key={t.serviceTypeId} value={String(t.serviceTypeId)}>
                  {t.serviceTypeName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {selectedServiceType && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              {selectedServiceType.serviceTypeName} attributes
            </div>

            {loadingConfig ? (
              <p className="text-sm text-muted-foreground">Loading configuration…</p>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {FLAG_FIELDS.map((f) => (
                    <Controller
                      key={f.key}
                      control={control}
                      name={f.key}
                      render={({ field }) => (
                        <label className="flex items-start gap-2 rounded-lg border border-border p-3 text-sm">
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(v) => field.onChange(!!v)}
                            disabled={!canEdit}
                          />
                          <span>
                            <span className="block font-medium text-foreground">{f.label}</span>
                            <span className="block text-xs text-muted-foreground">{f.hint}</span>
                          </span>
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
      )}
    </div>
  );
}

export default function ServiceTypeConfigurationMasterPage() {
  return (
    <AccessGate module="serviceTypeConfiguration">
      {(roleDef) => <ServiceTypeConfigurationView roleDef={roleDef} />}
    </AccessGate>
  );
}
