"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Package } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore, isPlatformMode } from "@/lib/store/tenant.store";
import { listServiceTypes, ServiceTypesApiError } from "@/lib/services/service-types.service";
import { listServiceProducts, ServiceProductsApiError } from "@/lib/services/service-products.service";
import { ProductBookingQuestionTab } from "@/components/masters/product-tabs/ProductBookingQuestionTab";
import { SUPER_ADMIN_ROLE_ID } from "@/mock/data/roles";
import type { RoleDef, ServiceProduct, ServiceType } from "@/types";

function View({ roleDef }: { roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const activeTenantId = useTenantStore((s) => s.tenantId);
  const activeTenant = useTenantStore((s) => s.tenant);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [products, setProducts] = useState<ServiceProduct[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [serviceTypeFilter, setServiceTypeFilter] = useState<number | null>(null);
  const [productFilter, setProductFilter] = useState<number | null>(null);

  const isSuperAdmin = roleDef.id === SUPER_ADMIN_ROLE_ID;
  const platformMode = isSuperAdmin && isPlatformMode(activeTenantId);
  const scopeTenantId = platformMode ? 0 : (user?.tenantKey ?? activeTenant.tenantKey ?? 0);
  const selectedProduct = products.find((p) => p.serviceProductId === productFilter);

  useEffect(() => {
    if (scopeTenantId <= 0) {
      setServiceTypes([]);
      setLoadingTypes(false);
      setLoadError(platformMode ? "Select a tenant workspace to manage booking questions." : "Missing tenant scope.");
      return;
    }
    setLoadingTypes(true);
    setLoadError(null);
    listServiceTypes({ tenantId: scopeTenantId, activeOnly: true })
      .then((rows) => {
        setServiceTypes(rows);
        setServiceTypeFilter((current) => (current && rows.some((t) => t.serviceTypeId === current) ? current : (rows[0]?.serviceTypeId ?? null)));
      })
      .catch((error) => {
        setLoadError(error instanceof ServiceTypesApiError ? error.message : "Failed to load service types");
        setServiceTypes([]);
      })
      .finally(() => setLoadingTypes(false));
  }, [scopeTenantId, platformMode]);

  useEffect(() => {
    if (!serviceTypeFilter || scopeTenantId <= 0) {
      setProducts([]);
      setProductFilter(null);
      return;
    }
    let cancelled = false;
    setLoadingProducts(true);
    listServiceProducts({ tenantId: scopeTenantId, serviceTypeId: serviceTypeFilter, activeOnly: true })
      .then((rows) => {
        if (cancelled) return;
        setProducts(rows);
        setProductFilter((current) => (current && rows.some((p) => p.serviceProductId === current) ? current : (rows[0]?.serviceProductId ?? null)));
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

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Service Product Booking Questions"
        description="Dynamic booking-time questions, with conditional visibility rules, for a specific product."
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
                {(value: string | null) => (!value ? "Select service type" : serviceTypes.find((t) => String(t.serviceTypeId) === value)?.serviceTypeName ?? value)}
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
                  {(value: string | null) => (!value ? "Select product" : products.find((p) => String(p.serviceProductId) === value)?.serviceProductName ?? value)}
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

      {selectedProduct && <ProductBookingQuestionTab product={selectedProduct} roleDef={roleDef} />}
    </div>
  );
}

export default function ServiceProductBookingQuestionMasterPage() {
  return <AccessGate module="serviceProductBookingQuestion">{(roleDef) => <View roleDef={roleDef} />}</AccessGate>;
}
