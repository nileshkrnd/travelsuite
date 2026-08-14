"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { ExtranetPropertyScope } from "@/components/shared/ExtranetPropertyScope";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { useExtranetPropertyScopeStore } from "@/lib/store/extranet-property-scope.store";
import type { Property, RoleDef } from "@/types";

function SelectPropertyPage({ roleDef }: { roleDef: RoleDef }) {
  const searchParams = useSearchParams();
  const sessionUser = useSessionStore((s) => s.user);
  const activeTenant = useTenantStore((s) => s.tenant);
  const tenantKey = sessionUser?.tenantKey ?? activeTenant.tenantKey ?? 0;
  const role = roleDef.slug;

  const scope = useExtranetPropertyScopeStore();
  const propertyId = scope.propertyId;
  const propertyLabel = scope.propertyLabel;

  useEffect(() => {
    if (scope.propertyId) return;
    const urlPropertyId = Number(searchParams.get("propertyId") ?? 0);
    if (Number.isFinite(urlPropertyId) && urlPropertyId > 0) {
      scope.setProperty({ propertyId: urlPropertyId, propertyLabel: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectProperty(id: number | null, property: Property | null) {
    scope.setProperty({
      propertyId: id,
      propertyLabel: property
        ? property.propertyDisplayName || property.propertyName || property.propertyCode
        : null,
      countryId: property?.countryId ?? null,
      stateId: property?.stateId ?? null,
      cityId: property?.cityId ?? null,
      areaId: property?.areaId ?? null,
    });
  }

  const shortcuts = [
    { label: "Property Season", href: `/${role}/extranet/seasons` },
    { label: "Property Room", href: `/${role}/extranet/rooms` },
    { label: "Contracts", href: `/${role}/extranet/contracts` },
    { label: "Rates", href: `/${role}/extranet/rates` },
    { label: "Inventory", href: `/${role}/extranet/inventory` },
  ];

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        icon={Building2}
        title="Select Property"
        description="Choose the property you want to manage across Extranet — seasons, rooms, contracts, rates, and inventory."
      />

      <ExtranetPropertyScope
        tenantId={tenantKey}
        propertyId={propertyId}
        propertyLabel={propertyLabel}
        onPropertyChange={selectProperty}
        emptyHeading="Select a property to continue"
        emptyDescription="Filter by location, then pick the hotel or property for your extranet session."
      >
        {propertyId && propertyId > 0 ? (
          <Card>
            <CardContent className="space-y-4 pt-6">
              <p className="text-sm text-muted-foreground">
                Property scope is saved for this session. Open any Extranet screen below — it will use{" "}
                <span className="font-medium text-foreground">{propertyLabel ?? `Property #${propertyId}`}</span>.
              </p>
              <div className="flex flex-wrap gap-2">
                {shortcuts.map((item) => (
                  <Button
                    key={item.href}
                    variant="outline"
                    size="sm"
                    nativeButton={false}
                    render={
                      <Link
                        href={
                          propertyId > 0 ? `${item.href}?propertyId=${propertyId}` : item.href
                        }
                      />
                    }
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </ExtranetPropertyScope>
    </div>
  );
}

export default function ExtranetSelectPropertyPage() {
  return (
    <AccessGate module="extranetSelectProperty">
      {(roleDef) => (
        <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
          <SelectPropertyPage roleDef={roleDef} />
        </Suspense>
      )}
    </AccessGate>
  );
}
