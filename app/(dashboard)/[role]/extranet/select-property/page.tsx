"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { ExtranetPropertyScope } from "@/components/shared/ExtranetPropertyScope";
import { PropertyReadinessDashboard } from "@/components/masters/PropertyReadinessDashboard";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { useExtranetPropertyScopeStore } from "@/lib/store/extranet-property-scope.store";
import { resolveSessionCompanyKey } from "@/lib/session-company";
import type { Property, RoleDef } from "@/types";

function SelectPropertyPage({ roleDef }: { roleDef: RoleDef }) {
  const searchParams = useSearchParams();
  const sessionUser = useSessionStore((s) => s.user);
  const activeTenant = useTenantStore((s) => s.tenant);
  const tenantKey = sessionUser?.tenantKey ?? activeTenant.tenantKey ?? 0;
  const companyKey = resolveSessionCompanyKey(sessionUser) ?? 0;
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

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Property Setup"
        description="Select a property, then follow the checklist below to make it commercially live with contract pricing."
      />

      <ExtranetPropertyScope
        tenantId={tenantKey}
        propertyId={propertyId}
        propertyLabel={propertyLabel}
        onPropertyChange={selectProperty}
        emptyHeading="Select a property to continue"
        emptyDescription="Filter by location, then pick the hotel or property for your extranet session."
      >
        {propertyId && propertyId > 0 && (
          <PropertyReadinessDashboard
            propertyId={propertyId}
            tenantId={tenantKey}
            companyId={companyKey}
            role={role}
          />
        )}
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
