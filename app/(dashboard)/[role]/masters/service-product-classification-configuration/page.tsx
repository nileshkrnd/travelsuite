"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Settings2, Loader2, ListTree } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore, isPlatformMode } from "@/lib/store/tenant.store";
import { useUsersStore } from "@/lib/store/users.store";
import { listServiceTypes, ServiceTypesApiError } from "@/lib/services/service-types.service";
import {
  listServiceProductClassifications,
  ServiceProductClassificationsApiError,
} from "@/lib/services/service-product-classifications.service";
import {
  listServiceTypeConfigurations,
  ServiceTypeConfigurationsApiError,
} from "@/lib/services/service-type-configurations.service";
import {
  listServiceProductClassificationConfigurations,
  saveServiceProductClassificationConfiguration,
  ServiceProductClassificationConfigurationsApiError,
  type ServiceProductClassificationConfigurationFlags,
} from "@/lib/services/service-product-classification-configurations.service";
import { can } from "@/config/permissions";
import { SUPER_ADMIN_ROLE_ID } from "@/mock/data/roles";
import type { RoleDef, ServiceProductClassification, ServiceType } from "@/types";

const FLAG_FIELDS: { key: keyof ServiceProductClassificationConfigurationFlags; label: string; hint: string }[] = [
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

type TriState = "inherit" | "yes" | "no";
type FormValues = Record<keyof ServiceProductClassificationConfigurationFlags, TriState>;

const EMPTY_VALUES: FormValues = FLAG_FIELDS.reduce((acc, f) => {
  acc[f.key] = "inherit";
  return acc;
}, {} as FormValues);

function toTriState(value: boolean | null | undefined): TriState {
  if (value === true) return "yes";
  if (value === false) return "no";
  return "inherit";
}

function fromTriState(value: TriState): boolean | null {
  if (value === "yes") return true;
  if (value === "no") return false;
  return null;
}

function ServiceProductClassificationConfigurationView({ roleDef }: { roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const activeTenantId = useTenantStore((s) => s.tenantId);
  const activeTenant = useTenantStore((s) => s.tenant);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [classifications, setClassifications] = useState<ServiceProductClassification[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [loadingClassifications, setLoadingClassifications] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [serviceTypeFilter, setServiceTypeFilter] = useState<number | null>(null);
  const [classificationFilter, setClassificationFilter] = useState<number | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [inheritedValues, setInheritedValues] = useState<Record<string, boolean> | null>(null);

  const isSuperAdmin = roleDef.id === SUPER_ADMIN_ROLE_ID;
  const platformMode = isSuperAdmin && isPlatformMode(activeTenantId);
  const scopeTenantId = platformMode ? 0 : (user?.tenantKey ?? activeTenant.tenantKey ?? 0);

  const canEdit = can(roleDef, "serviceProductClassificationConfiguration", "edit");
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  const selectedServiceType = serviceTypes.find((t) => t.serviceTypeId === serviceTypeFilter);
  const selectedClassification = classifications.find((c) => c.serviceProductClassificationId === classificationFilter);

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
      setClassifications([]);
      setClassificationFilter(null);
      return;
    }
    let cancelled = false;
    setLoadingClassifications(true);
    Promise.all([
      listServiceProductClassifications({ tenantId: scopeTenantId, serviceTypeId: serviceTypeFilter, activeOnly: true }),
      listServiceTypeConfigurations({ tenantId: scopeTenantId, serviceTypeId: serviceTypeFilter }),
    ])
      .then(([classificationRows, typeConfigRows]) => {
        if (cancelled) return;
        setClassifications(classificationRows);
        setClassificationFilter((current) =>
          current && classificationRows.some((c) => c.serviceProductClassificationId === current)
            ? current
            : (classificationRows[0]?.serviceProductClassificationId ?? null)
        );
        const typeConfig = typeConfigRows[0];
        setInheritedValues(
          typeConfig
            ? FLAG_FIELDS.reduce((acc, f) => {
                acc[f.key] = typeConfig[f.key];
                return acc;
              }, {} as Record<string, boolean>)
            : null
        );
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(
            error instanceof ServiceProductClassificationsApiError || error instanceof ServiceTypeConfigurationsApiError
              ? error.message
              : "Failed to load classifications"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingClassifications(false);
      });
    return () => {
      cancelled = true;
    };
  }, [serviceTypeFilter, scopeTenantId]);

  useEffect(() => {
    if (!classificationFilter || scopeTenantId <= 0) {
      reset(EMPTY_VALUES);
      return;
    }
    let cancelled = false;
    setLoadingConfig(true);
    listServiceProductClassificationConfigurations({ tenantId: scopeTenantId, serviceProductClassificationId: classificationFilter })
      .then((rows) => {
        if (cancelled) return;
        const existing = rows[0];
        reset(
          existing
            ? FLAG_FIELDS.reduce((acc, f) => {
                acc[f.key] = toTriState(existing[f.key]);
                return acc;
              }, {} as FormValues)
            : EMPTY_VALUES
        );
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(
            error instanceof ServiceProductClassificationConfigurationsApiError
              ? error.message
              : "Failed to load configuration"
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
  }, [classificationFilter, scopeTenantId]);

  async function onSubmit(values: FormValues) {
    if (!selectedClassification) return;
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    const flags = FLAG_FIELDS.reduce((acc, f) => {
      acc[f.key] = fromTriState(values[f.key]);
      return acc;
    }, {} as ServiceProductClassificationConfigurationFlags);
    try {
      await saveServiceProductClassificationConfiguration({
        ...flags,
        serviceProductClassificationId: selectedClassification.serviceProductClassificationId,
        tenantId: scopeTenantId,
        companyId: selectedClassification.companyId,
        actorId: userKey,
      });
      toast.success("Configuration saved");
    } catch (error) {
      toast.error(
        error instanceof ServiceProductClassificationConfigurationsApiError
          ? error.message
          : "Could not save configuration"
      );
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Service Product Classification Configuration"
        description="Override which optional product attributes apply for a classification — leave a flag on Inherit to use the Service Type's default."
      />

      {loadError && <p className="text-sm text-destructive">{loadError}</p>}
      {loadingTypes && <p className="text-sm text-muted-foreground">Loading service types…</p>}
      {!loadingTypes && scopeTenantId > 0 && serviceTypes.length === 0 && (
        <EmptyState
          icon={ListTree}
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
            <SelectTrigger className="w-56">
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

          {loadingClassifications ? (
            <p className="text-sm text-muted-foreground">Loading classifications…</p>
          ) : classifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No classifications under {selectedServiceType?.serviceTypeName ?? "this service type"} yet.
            </p>
          ) : (
            <Select
              value={classificationFilter ? String(classificationFilter) : ""}
              onValueChange={(v) => setClassificationFilter(v ? Number(v) : null)}
            >
              <SelectTrigger className="w-64">
                <SelectValue>
                  {(value: string | null) => {
                    if (!value) return "Select classification";
                    return (
                      classifications.find((c) => String(c.serviceProductClassificationId) === value)
                        ?.classificationName ?? value
                    );
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {classifications.map((c) => (
                  <SelectItem key={c.serviceProductClassificationId} value={String(c.serviceProductClassificationId)}>
                    {c.classificationName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {selectedClassification && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              {selectedClassification.classificationName} overrides
            </div>

            {loadingConfig ? (
              <p className="text-sm text-muted-foreground">Loading configuration…</p>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {FLAG_FIELDS.map((f) => {
                    const inherited = inheritedValues?.[f.key];
                    const inheritLabel =
                      inherited === undefined ? "Inherit (Type default)" : `Inherit (Type: ${inherited ? "Yes" : "No"})`;
                    return (
                      <div key={f.key} className="space-y-1.5 rounded-lg border border-border p-3">
                        <p className="text-sm font-medium text-foreground">{f.label}</p>
                        <p className="text-xs text-muted-foreground">{f.hint}</p>
                        <Controller
                          control={control}
                          name={f.key}
                          render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange} disabled={!canEdit}>
                              <SelectTrigger className="h-9 w-full min-w-0">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="inherit">{inheritLabel}</SelectItem>
                                <SelectItem value="yes">Yes</SelectItem>
                                <SelectItem value="no">No</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                    );
                  })}
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

export default function ServiceProductClassificationConfigurationMasterPage() {
  return (
    <AccessGate module="serviceProductClassificationConfiguration">
      {(roleDef) => <ServiceProductClassificationConfigurationView roleDef={roleDef} />}
    </AccessGate>
  );
}
