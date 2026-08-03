"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { PropertyForm } from "@/components/masters/PropertyForm";
import { getProperty, PropertiesApiError } from "@/lib/services/properties.service";
import type { Property } from "@/types";

function EditProperty() {
  const { role, propertyId } = useParams<{ role: string; propertyId: string }>();
  const id = Number(propertyId);
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(id) || id <= 0) {
      setLoading(false);
      setError("Invalid property id");
      return;
    }
    let cancelled = false;
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
    <div className="min-w-0 space-y-6 overflow-x-clip p-6">
      <PageHeader
        title="Modify property"
        description={`Update ${property.propertyDisplayName || property.propertyName || property.propertyCode}`}
        actions={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/${role}/masters/property/${property.propertyId}`} />}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to details
          </Button>
        }
      />
      <PropertyForm property={property} />
    </div>
  );
}

export default function EditPropertyPage() {
  return (
    <AccessGate module="property" action="edit">
      {() => <EditProperty />}
    </AccessGate>
  );
}
