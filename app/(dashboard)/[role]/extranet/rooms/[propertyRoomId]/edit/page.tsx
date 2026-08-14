"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BedDouble } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { PropertyRoomForm } from "@/components/masters/PropertyRoomForm";
import { getPropertyRoom, PropertyRoomsApiError } from "@/lib/services/property-rooms.service";
import type { PropertyRoom } from "@/types";

function EditPropertyRoom() {
  const { role, propertyRoomId } = useParams<{ role: string; propertyRoomId: string }>();
  const [entry, setEntry] = useState<PropertyRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
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
    <div className="min-w-0 space-y-6 overflow-x-clip p-6">
      <PageHeader
        title="Modify property room"
        description={`Update ${entry.roomName}`}
        actions={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/${role}/extranet/rooms/${entry.propertyRoomKey}`} />}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to details
          </Button>
        }
      />
      <PropertyRoomForm entry={entry} />
    </div>
  );
}

export default function EditPropertyRoomPage() {
  return (
    <AccessGate module="propertyRooms" action="edit">
      {() => <EditPropertyRoom />}
    </AccessGate>
  );
}
