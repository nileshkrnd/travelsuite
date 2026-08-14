"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Undo2 } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { ExtranetPropertyScope } from "@/components/shared/ExtranetPropertyScope";
import { PropertyContractCancellationPoliciesList } from "@/components/masters/PropertyContractCancellationPoliciesList";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { useExtranetPropertyScopeStore } from "@/lib/store/extranet-property-scope.store";
import { can } from "@/config/permissions";
import type { Property, RoleDef } from "@/types";

function PropertyCancellationPoliciesPage({ roleDef }: { roleDef: RoleDef }) {
  const searchParams = useSearchParams();
  const sessionUser = useSessionStore((s) => s.user);
  const activeTenant = useTenantStore((s) => s.tenant);
  const tenantKey = sessionUser?.tenantKey ?? activeTenant.tenantKey ?? 0;

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

  const canEdit = can(roleDef, "contracts", "edit");
  const canCreate = can(roleDef, "contracts", "create");
  const canDelete = can(roleDef, "contracts", "delete");

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
        icon={Undo2}
        title="Cancellation"
        description="Penalty windows by days before arrival across supplier contracts for the selected property."
      />

      <ExtranetPropertyScope
        tenantId={tenantKey}
        propertyId={propertyId}
        propertyLabel={propertyLabel}
        onPropertyChange={selectProperty}
        emptyHeading="Select a property to view cancellation policies"
        emptyDescription="Choose the property whose cancellation policies you want to review or manage."
      >
        {propertyId && propertyId > 0 ? (
          <PropertyContractCancellationPoliciesList
            tenantId={tenantKey}
            propertyId={propertyId}
            canEdit={canEdit}
            canCreate={canCreate}
            canDelete={canDelete}
          />
        ) : null}
      </ExtranetPropertyScope>
    </div>
  );
}

export default function ExtranetCancellationPoliciesPage() {
  return (
    <AccessGate module="cancellationPolicies">
      {(roleDef) => (
        <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
          <PropertyCancellationPoliciesPage roleDef={roleDef} />
        </Suspense>
      )}
    </AccessGate>
  );
}
