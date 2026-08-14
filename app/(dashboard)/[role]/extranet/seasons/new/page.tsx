"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { PropertySeasonForm } from "@/components/masters/PropertySeasonForm";

function NewPropertySeason() {
  const { role } = useParams<{ role: string }>();

  return (
    <div className="min-w-0 space-y-6 overflow-x-clip p-6">
      <PageHeader
        title="New property season"
        description="Add a Low / High / Peak (or custom) season for a property."
        actions={
          <Button variant="outline" nativeButton={false} render={<Link href={`/${role}/extranet/seasons`} />}>
            <ArrowLeft className="h-4 w-4" />
            Back to list
          </Button>
        }
      />
      <PropertySeasonForm />
    </div>
  );
}

export default function NewPropertySeasonPage() {
  return (
    <AccessGate module="seasons" action="create">
      {() => (
        <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
          <NewPropertySeason />
        </Suspense>
      )}
    </AccessGate>
  );
}
