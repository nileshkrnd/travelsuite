"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { PropertyRoomForm } from "@/components/masters/PropertyRoomForm";

function NewPropertyRoom() {
  const { role } = useParams<{ role: string }>();

  return (
    <div className="min-w-0 space-y-6 overflow-x-clip p-6">
      <PageHeader
        title="New property room"
        description="Map a supplier room code and name to a system room type."
        actions={
          <Button variant="outline" nativeButton={false} render={<Link href={`/${role}/extranet/rooms`} />}>
            <ArrowLeft className="h-4 w-4" />
            Back to list
          </Button>
        }
      />
      <PropertyRoomForm />
    </div>
  );
}

export default function NewPropertyRoomPage() {
  return (
    <AccessGate module="propertyRooms" action="create">
      {() => (
        <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
          <NewPropertyRoom />
        </Suspense>
      )}
    </AccessGate>
  );
}
