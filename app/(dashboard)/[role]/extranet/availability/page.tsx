"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarCheck } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { ExtranetPropertyScope } from "@/components/shared/ExtranetPropertyScope";
import { AvailabilityCalendar } from "@/components/masters/AvailabilityCalendar";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { useExtranetPropertyScopeStore } from "@/lib/store/extranet-property-scope.store";
import { resolveSessionCompanyKey } from "@/lib/session-company";
import { can } from "@/config/permissions";
import type { Property, RoleDef } from "@/types";

function AvailabilityCalendarPage({ roleDef }: { roleDef: RoleDef }) {
  const searchParams = useSearchParams();
  const sessionUser = useSessionStore((s) => s.user);
  const activeTenant = useTenantStore((s) => s.tenant);
  const tenantKey = sessionUser?.tenantKey ?? activeTenant.tenantKey ?? 0;
  const actorKey = sessionUser?.userKey ?? 0;
  const companyKey = resolveSessionCompanyKey(sessionUser) ?? 0;

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

  const canEdit = can(roleDef, "extranetAvailability", "edit");

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
        icon={CalendarCheck}
        title="Availability Calendar"
        description="Channel-manager style ARI calendar: allotment, rate, min/max LOS, stop sell, and no check-in / no check-out by room and day. Use Bulk change for a date or range."
      />

      <ExtranetPropertyScope
        tenantId={tenantKey}
        propertyId={propertyId}
        propertyLabel={propertyLabel}
        onPropertyChange={selectProperty}
        emptyHeading="Select a property to view availability"
        emptyDescription="Choose the property whose room inventory you want to manage on the calendar."
      >
        {propertyId && propertyId > 0 && companyKey > 0 ? (
          <AvailabilityCalendar
            tenantId={tenantKey}
            companyId={companyKey}
            propertyId={propertyId}
            actorKey={actorKey}
            canEdit={canEdit}
          />
        ) : propertyId && propertyId > 0 ? (
          <p className="text-sm text-muted-foreground">
            Select a company context to save availability updates.
          </p>
        ) : null}
      </ExtranetPropertyScope>
    </div>
  );
}

export default function ExtranetAvailabilityPage() {
  return (
    <AccessGate module="extranetAvailability">
      {(roleDef) => (
        <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
          <AvailabilityCalendarPage roleDef={roleDef} />
        </Suspense>
      )}
    </AccessGate>
  );
}
