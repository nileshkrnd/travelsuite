"use client";

import { useEffect, useState } from "react";
import { Building2, MapPin, Pencil, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { ExtranetPropertyPicker } from "@/components/shared/ExtranetPropertyPicker";
import type { Property } from "@/types";

/**
 * List-page scope: pick location → property before continuing with extranet actions.
 * Once a property is chosen it collapses to a compact "currently scoped" bar — reused across
 * Extranet pages (Contracts/Rooms/Seasons) via the shared `useExtranetPropertyScopeStore`, so the
 * user only walks through Country/State/City/Area/Property once per session.
 */
export function ExtranetPropertyScope({
  tenantId,
  propertyId,
  propertyLabel,
  locationLabel,
  onPropertyChange,
  initialCountryId,
  initialStateId,
  initialCityId,
  initialAreaId,
  children,
  emptyHeading = "Select a property to continue",
  emptyDescription = "Filter by country and city, then choose the property for this extranet action.",
}: {
  tenantId: number;
  propertyId: number | null;
  propertyLabel?: string | null;
  /** Optional "Country · City" subtitle shown next to the property name in the compact bar. */
  locationLabel?: string | null;
  onPropertyChange: (propertyId: number | null, property: Property | null) => void;
  initialCountryId?: number | null;
  initialStateId?: number | null;
  initialCityId?: number | null;
  initialAreaId?: number | null;
  children: React.ReactNode;
  emptyHeading?: string;
  emptyDescription?: string;
}) {
  const [editing, setEditing] = useState(!propertyId || propertyId <= 0);

  useEffect(() => {
    if (!propertyId || propertyId <= 0) setEditing(true);
  }, [propertyId]);

  function handleChange(id: number | null, property: Property | null) {
    onPropertyChange(id, property);
    if (id && id > 0) setEditing(false);
  }

  const isScoped = !editing && !!propertyId && propertyId > 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className={isScoped ? "py-4" : "space-y-4 pt-6"}>
          {isScoped ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Building2 className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Scoped property</p>
                  <p className="truncate text-sm font-medium">{propertyLabel ?? `Property #${propertyId}`}</p>
                  {locationLabel && (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {locationLabel}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
                  <Pencil className="h-3.5 w-3.5" />
                  Change property
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => onPropertyChange(null, null)}>
                  <X className="h-3.5 w-3.5" />
                  Clear
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold">Property</h2>
                  <p className="text-sm text-muted-foreground">
                    Select the property once — it stays applied across Contracts, Rooms and Seasons until you
                    change or clear it.
                  </p>
                </div>
                {propertyId && propertyId > 0 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                )}
              </div>
              <ExtranetPropertyPicker
                tenantId={tenantId}
                value={propertyId}
                onChange={handleChange}
                selectedLabel={propertyLabel}
                initialCountryId={initialCountryId}
                initialStateId={initialStateId}
                initialCityId={initialCityId}
                initialAreaId={initialAreaId}
                compact
              />
            </>
          )}
        </CardContent>
      </Card>

      {propertyId && propertyId > 0 ? (
        children
      ) : (
        <EmptyState
          icon={Building2}
          tone="muted"
          heading={emptyHeading}
          description={emptyDescription}
          size="compact"
        />
      )}
    </div>
  );
}
