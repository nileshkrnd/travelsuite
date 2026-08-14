"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarRange, Pencil, Power, PowerOff } from "lucide-react";
import { toast } from "sonner";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSessionStore } from "@/lib/store/session.store";
import {
  getPropertySeason,
  setPropertySeasonActive,
  PropertySeasonsApiError,
} from "@/lib/services/property-seasons.service";
import { can } from "@/config/permissions";
import type { PropertySeason, RoleDef } from "@/types";

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 border-b border-border py-3 text-sm last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="col-span-2">{children}</dd>
    </div>
  );
}

function PropertySeasonView({ roleDef }: { roleDef: RoleDef }) {
  const { role, propertySeasonId } = useParams<{ role: string; propertySeasonId: string }>();
  const sessionUser = useSessionStore((s) => s.user);
  const actorKey = sessionUser?.userKey ?? 0;
  const [entry, setEntry] = useState<PropertySeason | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const canEdit = can(roleDef, "seasons", "edit");

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

  async function toggleStatus() {
    if (!entry || !actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      const saved = await setPropertySeasonActive(entry.propertySeasonKey, !entry.isActive, actorKey);
      setEntry(saved);
      toast.success(saved.isActive ? "Season activated" : "Season deactivated");
    } catch (error) {
      toast.error(error instanceof PropertySeasonsApiError ? error.message : "Could not update status");
    }
  }

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading season…</div>;
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
    <div className="space-y-6 p-6">
      <PageHeader
        title={entry.seasonName}
        description="Property season details."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" nativeButton={false} render={<Link href={`/${role}/extranet/seasons`} />}>
              <ArrowLeft className="h-4 w-4" />
              Back to list
            </Button>
            {canEdit && (
              <Button variant="outline" onClick={() => void toggleStatus()}>
                {entry.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                {entry.isActive ? "Deactivate" : "Reactivate"}
              </Button>
            )}
            {canEdit && (
              <Button
                nativeButton={false}
                render={<Link href={`/${role}/extranet/seasons/${entry.propertySeasonKey}/edit`} />}
              >
                <Pencil className="h-4 w-4" />
                Modify
              </Button>
            )}
          </div>
        }
      />

      <Card className="max-w-2xl">
        <CardContent>
          <div className="mb-4">
            <p className="text-base font-semibold text-foreground">{entry.seasonName}</p>
            <p className="text-sm text-muted-foreground">
              {entry.propertyName ?? `Property ${entry.propertyId}`} — {entry.seasonCode}
            </p>
          </div>
          <dl>
            <DetailRow label="Property">{entry.propertyName ?? "—"}</DetailRow>
            <DetailRow label="Season code">{entry.seasonCode}</DetailRow>
            <DetailRow label="Season name">{entry.seasonName}</DetailRow>
            <DetailRow label="Display order">{entry.displayOrder}</DetailRow>
            <DetailRow label="Status">
              <Badge variant={entry.isActive ? "default" : "secondary"}>
                {entry.isActive ? "active" : "inactive"}
              </Badge>
            </DetailRow>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PropertySeasonDetailPage() {
  return <AccessGate module="seasons">{(roleDef) => <PropertySeasonView roleDef={roleDef} />}</AccessGate>;
}
