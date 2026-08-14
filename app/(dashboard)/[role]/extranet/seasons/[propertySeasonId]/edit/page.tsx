"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarRange } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { PropertySeasonForm } from "@/components/masters/PropertySeasonForm";
import { getPropertySeason, PropertySeasonsApiError } from "@/lib/services/property-seasons.service";
import type { PropertySeason } from "@/types";

function EditPropertySeason() {
  const { role, propertySeasonId } = useParams<{ role: string; propertySeasonId: string }>();
  const [entry, setEntry] = useState<PropertySeason | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const id = Number(propertySeasonId);
    if (!Number.isFinite(id) || id <= 0) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getPropertySeason(id)
      .then((row) => {
        if (!cancelled) {
          setEntry(row);
          setNotFound(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setEntry(null);
          setNotFound(err instanceof PropertySeasonsApiError && err.status === 404);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [propertySeasonId]);

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  if (notFound || !entry) {
    return (
      <div className="p-6">
        <EmptyState
          icon={CalendarRange}
          tone="muted"
          heading="Season not found"
          description="This season may have been removed."
          action={
            <Button nativeButton={false} render={<Link href={`/${role}/extranet/seasons`} />}>
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
        title="Modify property season"
        description={`Update ${entry.seasonName}`}
        actions={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/${role}/extranet/seasons/${entry.propertySeasonKey}`} />}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to details
          </Button>
        }
      />
      <PropertySeasonForm entry={entry} />
    </div>
  );
}

export default function EditPropertySeasonPage() {
  return (
    <AccessGate module="seasons" action="edit">
      {() => <EditPropertySeason />}
    </AccessGate>
  );
}
