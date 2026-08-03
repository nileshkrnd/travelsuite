"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building, Pencil, ExternalLink, MapPin, Star } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getProperty, PropertiesApiError } from "@/lib/services/properties.service";
import { can } from "@/config/permissions";
import type { Property, RoleDef } from "@/types";

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 border-b border-border py-3 text-sm last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="col-span-2 break-words">{children ?? "—"}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
        <dl>{children}</dl>
      </CardContent>
    </Card>
  );
}

function displayName(p: Property) {
  return p.propertyDisplayName || p.propertyName || p.propertyCode;
}

function PropertyView({ roleDef }: { roleDef: RoleDef }) {
  const { role, propertyId } = useParams<{ role: string; propertyId: string }>();
  const id = Number(propertyId);
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canEdit = can(roleDef, "property", "edit");

  useEffect(() => {
    if (!Number.isFinite(id) || id <= 0) {
      setLoading(false);
      setError("Invalid property id");
      return;
    }
    let cancelled = false;
    setLoading(true);
    getProperty(id)
      .then((row) => {
        if (!cancelled) setProperty(row);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof PropertiesApiError ? err.message : "Failed to load property");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading property…</div>;
  }

  if (error || !property) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Building}
          tone="muted"
          heading="Property not found"
          description={error ?? "This property may have been removed."}
          action={
            <Button nativeButton={false} render={<Link href={`/${role}/masters/property`} />}>
              Back to list
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={displayName(property)}
        description={`${property.propertyCode}${property.cityName ? ` · ${property.cityName}` : ""}${property.countryName ? `, ${property.countryName}` : ""}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" nativeButton={false} render={<Link href={`/${role}/masters/property`} />}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            {canEdit && (
              <Button nativeButton={false} render={<Link href={`/${role}/masters/property/${property.propertyId}/edit`} />}>
                <Pencil className="h-4 w-4" />
                Modify
              </Button>
            )}
          </div>
        }
      />

      <div className="overflow-hidden rounded-xl bg-gradient-to-br from-[#001C35] via-[#0a3558] to-[#1a5a7a] p-6 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-white/70">{property.propertyCode}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">{displayName(property)}</h1>
            {property.shortDescription && (
              <p className="mt-2 max-w-2xl text-sm text-white/80">{property.shortDescription}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {property.propertyTypeNames.map((n) => (
                <Badge key={n} className="bg-white/15 text-white hover:bg-white/20">
                  {n}
                </Badge>
              ))}
              {property.propertyBrandName && (
                <Badge className="bg-white/15 text-white hover:bg-white/20">{property.propertyBrandName}</Badge>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant={property.isActive ? "default" : "secondary"}>{property.isActive ? "active" : "inactive"}</Badge>
            <div className="flex items-center gap-3 text-sm text-white/80">
              {property.starRating != null && (
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
                  {property.starRating}
                </span>
              )}
              {property.rating != null && <span>{property.rating.toFixed(2)}</span>}
              {property.isFeatured && <span>Featured</span>}
              {property.isPublished && <span>Published</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Identity">
          <DetailRow label="Property name">{property.propertyName}</DetailRow>
          <DetailRow label="Display name">{property.propertyDisplayName}</DetailRow>
          <DetailRow label="Code">{property.propertyCode}</DetailRow>
          <DetailRow label="Description">{property.description || "—"}</DetailRow>
          <DetailRow label="Internal remarks">{property.internalRemarks || "—"}</DetailRow>
        </Section>

        <Section title="Classification">
          <DetailRow label="Types">{property.propertyTypeNames.join(", ") || "—"}</DetailRow>
          <DetailRow label="Categories">{property.propertyCategoryNames.join(", ") || "—"}</DetailRow>
          <DetailRow label="Usage">{property.propertyUsageName}</DetailRow>
          <DetailRow label="Ownership">{property.ownershipTypeName}</DetailRow>
          <DetailRow label="Brand">{property.propertyBrandName}</DetailRow>
          <DetailRow label="Opening">{property.openingDate}</DetailRow>
          <DetailRow label="Closing">{property.closingDate}</DetailRow>
        </Section>

        <Section title="Address">
          <DetailRow label="Address 1">{property.addressLine1}</DetailRow>
          <DetailRow label="Address 2">{property.addressLine2}</DetailRow>
          <DetailRow label="Building">
            {[property.buildingName, property.buildingNumber].filter(Boolean).join(" · ") || "—"}
          </DetailRow>
          <DetailRow label="Street">
            {[property.streetNumber, property.streetName].filter(Boolean).join(" ") || "—"}
          </DetailRow>
          <DetailRow label="Zone">{property.zoneNumber}</DetailRow>
          <DetailRow label="Country">{property.countryName}</DetailRow>
          <DetailRow label="City">{property.cityName}</DetailRow>
          <DetailRow label="State ID">{property.stateId}</DetailRow>
          <DetailRow label="Area ID">{property.areaId}</DetailRow>
          <DetailRow label="Location ID">{property.locationId}</DetailRow>
          <DetailRow label="Postal / PO Box">
            {[property.postalCode, property.poBox].filter(Boolean).join(" / ") || "—"}
          </DetailRow>
          <DetailRow label="Landmark">{property.landmark}</DetailRow>
          <DetailRow label="Time zone ID">{property.timeZoneId}</DetailRow>
        </Section>

        <Section title="Map & coordinates">
          <DetailRow label="Latitude">{property.latitude}</DetailRow>
          <DetailRow label="Longitude">{property.longitude}</DetailRow>
          <DetailRow label="Plus code">{property.plusCode}</DetailRow>
          <DetailRow label="Google Place ID">{property.googlePlaceId}</DetailRow>
          <DetailRow label="Google Map">
            {property.googleMapUrl ? (
              <a
                href={property.googleMapUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                Open map <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : (
              "—"
            )}
          </DetailRow>
          {(property.latitude != null || property.longitude != null) && (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {property.latitude}, {property.longitude}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

export default function PropertyDetailsPage() {
  return <AccessGate module="property">{(roleDef) => <PropertyView roleDef={roleDef} />}</AccessGate>;
}
