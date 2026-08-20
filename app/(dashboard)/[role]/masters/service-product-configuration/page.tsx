"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Settings2, Loader2, Package } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore, isPlatformMode } from "@/lib/store/tenant.store";
import { useUsersStore } from "@/lib/store/users.store";
import { listServiceTypes, ServiceTypesApiError } from "@/lib/services/service-types.service";
import { listServiceProducts, ServiceProductsApiError } from "@/lib/services/service-products.service";
import { listDurationUnits } from "@/lib/services/duration-units.service";
import { listBookingModels } from "@/lib/services/booking-models.service";
import { listPricingModels } from "@/lib/services/pricing-models.service";
import {
  getServiceProductConfiguration,
  saveServiceProductConfiguration,
  ServiceProductConfigurationsApiError,
} from "@/lib/services/service-product-configurations.service";
import { can } from "@/config/permissions";
import { SUPER_ADMIN_ROLE_ID } from "@/mock/data/roles";
import type { BookingModel, DurationUnit, PricingModel, RoleDef, ServiceProduct, ServiceType } from "@/types";

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

function ServiceProductConfigurationView({ roleDef }: { roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const activeTenantId = useTenantStore((s) => s.tenantId);
  const activeTenant = useTenantStore((s) => s.tenant);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [products, setProducts] = useState<ServiceProduct[]>([]);
  const [durationUnits, setDurationUnits] = useState<DurationUnit[]>([]);
  const [bookingModels, setBookingModels] = useState<BookingModel[]>([]);
  const [pricingModels, setPricingModels] = useState<PricingModel[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [serviceTypeFilter, setServiceTypeFilter] = useState<number | null>(null);
  const [productFilter, setProductFilter] = useState<number | null>(null);

  const isSuperAdmin = roleDef.id === SUPER_ADMIN_ROLE_ID;
  const platformMode = isSuperAdmin && isPlatformMode(activeTenantId);
  const scopeTenantId = platformMode ? 0 : (user?.tenantKey ?? activeTenant.tenantKey ?? 0);

  const canEdit = can(roleDef, "serviceProductConfiguration", "edit");
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  const selectedProduct = products.find((p) => p.serviceProductId === productFilter);

  const { control, register, reset, handleSubmit, formState: { isSubmitting } } = useForm<FormValues>({ defaultValues: EMPTY_VALUES });

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
      const [typeRows, unitRows, bookingRows, pricingRows, allProducts] = await Promise.all([
        listServiceTypes({ tenantId: scopeTenantId, activeOnly: true }),
        listDurationUnits({ tenantId: scopeTenantId, activeOnly: true }),
        listBookingModels({ tenantId: scopeTenantId, activeOnly: true }),
        listPricingModels({ tenantId: scopeTenantId, activeOnly: true }),
        listServiceProducts({ tenantId: scopeTenantId }),
      ]);
      setServiceTypes(typeRows);
      setDurationUnits(unitRows);
      setBookingModels(bookingRows);
      setPricingModels(pricingRows);
      const typeProductCounts = new Map<number, number>();
      for (const p of allProducts) {
        typeProductCounts.set(p.serviceTypeId, (typeProductCounts.get(p.serviceTypeId) ?? 0) + 1);
      }
      setServiceTypeFilter((current) => {
        if (current && typeRows.some((t) => t.serviceTypeId === current)) return current;
        const withData = typeRows.find((t) => (typeProductCounts.get(t.serviceTypeId) ?? 0) > 0);
        return withData?.serviceTypeId ?? typeRows[0]?.serviceTypeId ?? null;
      });
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
      setProducts([]);
      setProductFilter(null);
      return;
    }
    let cancelled = false;
    setLoadingProducts(true);
    listServiceProducts({ tenantId: scopeTenantId, serviceTypeId: serviceTypeFilter, activeOnly: true })
      .then((productRows) => {
        if (cancelled) return;
        setProducts(productRows);
        setProductFilter((current) =>
          current && productRows.some((p) => p.serviceProductId === current) ? current : (productRows[0]?.serviceProductId ?? null)
        );
      })
      .catch((error) => {
        if (!cancelled) toast.error(error instanceof ServiceProductsApiError ? error.message : "Failed to load products");
      })
      .finally(() => {
        if (!cancelled) setLoadingProducts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [serviceTypeFilter, scopeTenantId]);

  useEffect(() => {
    if (!productFilter) {
      reset(EMPTY_VALUES);
      return;
    }
    let cancelled = false;
    setLoadingConfig(true);
    getServiceProductConfiguration(productFilter)
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
  }, [productFilter, reset]);

  async function onSubmit(values: FormValues) {
    if (!selectedProduct) return;
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      await saveServiceProductConfiguration({
        serviceProductId: selectedProduct.serviceProductId,
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
    <div className="space-y-6 p-6">
      <PageHeader
        title="Service Product Configuration"
        description="Duration, booking model, pricing model, pax/age limits, and requirement flags for a specific product."
      />

      {loadError && <p className="text-sm text-destructive">{loadError}</p>}
      {loadingTypes && <p className="text-sm text-muted-foreground">Loading service types…</p>}
      {!loadingTypes && scopeTenantId > 0 && serviceTypes.length === 0 && (
        <EmptyState icon={Package} tone="muted" heading="No service types yet" description="Create a service type first under Admin → Product → Service Type." size="compact" />
      )}

      {!loadingTypes && serviceTypes.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select value={serviceTypeFilter ? String(serviceTypeFilter) : ""} onValueChange={(v) => setServiceTypeFilter(v ? Number(v) : null)}>
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

          {loadingProducts ? (
            <p className="text-sm text-muted-foreground">Loading products…</p>
          ) : products.length === 0 ? (
            <p className="text-sm text-muted-foreground">No products under this service type yet.</p>
          ) : (
            <Select value={productFilter ? String(productFilter) : ""} onValueChange={(v) => setProductFilter(v ? Number(v) : null)}>
              <SelectTrigger className="w-64">
                <SelectValue>
                  {(value: string | null) => {
                    if (!value) return "Select product";
                    return products.find((p) => String(p.serviceProductId) === value)?.serviceProductName ?? value;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.serviceProductId} value={String(p.serviceProductId)}>
                    {p.serviceProductName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {selectedProduct && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              {selectedProduct.serviceProductName} configuration
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
      )}
    </div>
  );
}

export default function ServiceProductConfigurationMasterPage() {
  return (
    <AccessGate module="serviceProductConfiguration">
      {(roleDef) => <ServiceProductConfigurationView roleDef={roleDef} />}
    </AccessGate>
  );
}
