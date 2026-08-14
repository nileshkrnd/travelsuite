"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BedDouble, BedSingle, ImageIcon, Mountain, Pencil, Power, PowerOff } from "lucide-react";
import { toast } from "sonner";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { PropertyRoomBedsPanel } from "@/components/masters/PropertyRoomBedsPanel";
import { PropertyRoomViewsPanel } from "@/components/masters/PropertyRoomViewsPanel";
import { PropertyRoomExtraBedsPanel } from "@/components/masters/PropertyRoomExtraBedsPanel";
import { PropertyRoomMediaPanel } from "@/components/masters/PropertyRoomMediaPanel";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSessionStore } from "@/lib/store/session.store";
import {
  getPropertyRoom,
  setPropertyRoomActive,
  PropertyRoomsApiError,
} from "@/lib/services/property-rooms.service";
import { can } from "@/config/permissions";
import type { PropertyRoom, RoleDef } from "@/types";

const TAB_VALUES = ["details", "beds", "views", "extra-beds", "media"] as const;
type TabValue = (typeof TAB_VALUES)[number];

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 border-b border-border py-3 text-sm last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="col-span-2">{children}</dd>
    </div>
  );
}

function PropertyRoomView({ roleDef }: { roleDef: RoleDef }) {
  const { role, propertyRoomId } = useParams<{ role: string; propertyRoomId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionUser = useSessionStore((s) => s.user);
  const actorKey = sessionUser?.userKey ?? 0;
  const [entry, setEntry] = useState<PropertyRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const canEdit = can(roleDef, "propertyRooms", "edit");
  const canCreate = can(roleDef, "propertyRooms", "create");
  const canDelete = can(roleDef, "propertyRooms", "delete");

  const tabParam = searchParams.get("tab");
  const activeTab: TabValue = TAB_VALUES.includes(tabParam as TabValue) ? (tabParam as TabValue) : "details";

  useEffect(() => {
    const id = Number(propertyRoomId);
    if (!Number.isFinite(id) || id <= 0) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getPropertyRoom(id)
      .then((row) => {
        if (!cancelled) {
          setEntry(row);
          setNotFound(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setEntry(null);
          setNotFound(err instanceof PropertyRoomsApiError && err.status === 404);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [propertyRoomId]);

  function setTab(next: string | null) {
    if (!next) return;
    const base = `/${role}/extranet/rooms/${propertyRoomId}`;
    router.replace(next === "details" ? base : `${base}?tab=${next}`);
  }

  async function toggleStatus() {
    if (!entry || !actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      const saved = await setPropertyRoomActive(entry.propertyRoomKey, !entry.isActive, actorKey);
      setEntry(saved);
      toast.success(saved.isActive ? "Room activated" : "Room deactivated");
    } catch (error) {
      toast.error(error instanceof PropertyRoomsApiError ? error.message : "Could not update status");
    }
  }

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading room…</div>;
  }

  if (notFound || !entry) {
    return (
      <div className="p-6">
        <EmptyState
          icon={BedDouble}
          tone="muted"
          heading="Room not found"
          description="This room may have been removed."
          action={
            <Button nativeButton={false} render={<Link href={`/${role}/extranet/rooms`} />}>
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
        title={entry.roomName}
        description="Property room details, bed configuration, views, and extra bed policies."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" nativeButton={false} render={<Link href={`/${role}/extranet/rooms`} />}>
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
                render={<Link href={`/${role}/extranet/rooms/${entry.propertyRoomKey}/edit`} />}
              >
                <Pencil className="h-4 w-4" />
                Modify
              </Button>
            )}
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setTab}>
        <div className="rounded-xl border border-border bg-muted/40 p-1.5">
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1.5 bg-transparent p-0 group-data-horizontal/tabs:h-auto">
            <TabsTrigger value="details" className="gap-1.5 rounded-lg px-3 py-2 text-sm font-medium">
              <BedDouble className="h-4 w-4" />
              Details
            </TabsTrigger>
            <TabsTrigger value="beds" className="gap-1.5 rounded-lg px-3 py-2 text-sm font-medium">
              <BedSingle className="h-4 w-4" />
              Beds
            </TabsTrigger>
            <TabsTrigger value="views" className="gap-1.5 rounded-lg px-3 py-2 text-sm font-medium">
              <Mountain className="h-4 w-4" />
              Views
            </TabsTrigger>
            <TabsTrigger value="extra-beds" className="gap-1.5 rounded-lg px-3 py-2 text-sm font-medium">
              <BedDouble className="h-4 w-4" />
              Extra Beds
            </TabsTrigger>
            <TabsTrigger value="media" className="gap-1.5 rounded-lg px-3 py-2 text-sm font-medium">
              <ImageIcon className="h-4 w-4" />
              Media
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="details" className="mt-4">
          <Card className="max-w-2xl">
            <CardContent>
              <div className="mb-4">
                <p className="text-base font-semibold text-foreground">{entry.roomName}</p>
                <p className="text-sm text-muted-foreground">
                  {entry.roomCode}
                  {entry.roomTypeName ? ` — ${entry.roomTypeName}` : ""}
                </p>
              </div>
              <dl>
                {entry.propertyName ? <DetailRow label="Property">{entry.propertyName}</DetailRow> : null}
                <DetailRow label="Room type code">{entry.roomCode}</DetailRow>
                <DetailRow label="Room type name">{entry.roomName}</DetailRow>
                <DetailRow label="Global room type">
                  {entry.roomTypeName ?? "—"}
                  {entry.roomTypeCode ? ` (${entry.roomTypeCode})` : ""}
                </DetailRow>
                <DetailRow label="Description">{entry.description?.trim() ? entry.description : "—"}</DetailRow>
                <DetailRow label="Max adult">{entry.maxAdult}</DetailRow>
                <DetailRow label="Max child">{entry.maxChild}</DetailRow>
                <DetailRow label="Max occupancy">{entry.maxOccupancy}</DetailRow>
                <DetailRow label="Room size">
                  {entry.roomSize != null
                    ? `${entry.roomSize}${entry.roomSizeUnitCode ? ` ${entry.roomSizeUnitCode}` : ""}`
                    : "—"}
                </DetailRow>
                <DetailRow label="Smoking type">{entry.smokingTypeName ?? "—"}</DetailRow>
                <DetailRow label="View type">{entry.viewTypeName ?? "—"}</DetailRow>
                <DetailRow label="Extra bed allowed">{entry.extraBedAllowed ? "Yes" : "No"}</DetailRow>
                <DetailRow label="Max extra bed">{entry.maxExtraBed}</DetailRow>
                <DetailRow label="Display order">{entry.displayOrder}</DetailRow>
                <DetailRow label="Status">
                  <Badge variant={entry.isActive ? "default" : "secondary"}>
                    {entry.isActive ? "active" : "inactive"}
                  </Badge>
                </DetailRow>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="beds" className="mt-4">
          <PropertyRoomBedsPanel room={entry} canEdit={canEdit} canCreate={canCreate} canDelete={canDelete} />
        </TabsContent>

        <TabsContent value="views" className="mt-4">
          <PropertyRoomViewsPanel room={entry} canEdit={canEdit} canCreate={canCreate} canDelete={canDelete} />
        </TabsContent>

        <TabsContent value="extra-beds" className="mt-4">
          <PropertyRoomExtraBedsPanel room={entry} canEdit={canEdit} canCreate={canCreate} canDelete={canDelete} />
        </TabsContent>

        <TabsContent value="media" className="mt-4">
          <PropertyRoomMediaPanel room={entry} canEdit={canEdit} canCreate={canCreate} canDelete={canDelete} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function PropertyRoomDetailPage() {
  return (
    <AccessGate module="propertyRooms">
      {(roleDef) => (
        <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
          <PropertyRoomView roleDef={roleDef} />
        </Suspense>
      )}
    </AccessGate>
  );
}
