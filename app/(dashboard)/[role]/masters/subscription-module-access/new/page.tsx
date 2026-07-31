"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { SubscriptionModuleAccessForm } from "@/components/masters/SubscriptionModuleAccessForm";

function NewAccess() {
  const { role } = useParams<{ role: string }>();

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Grant module access"
        description="Assign a subscription module to a tenant."
        actions={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/${role}/masters/subscription-module-access`} />}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to list
          </Button>
        }
      />
      <SubscriptionModuleAccessForm />
    </div>
  );
}

export default function NewSubscriptionModuleAccessPage() {
  return (
    <AccessGate module="subscriptionModuleAccess" action="create">
      {() => <NewAccess />}
    </AccessGate>
  );
}
