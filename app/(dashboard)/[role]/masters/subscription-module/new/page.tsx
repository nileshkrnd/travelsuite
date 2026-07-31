"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { SubscriptionModuleForm } from "@/components/masters/SubscriptionModuleForm";

function NewModule() {
  const { role } = useParams<{ role: string }>();

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Add subscription module"
        description="Attach a module to a subscription product."
        actions={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/${role}/masters/subscription-module`} />}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to list
          </Button>
        }
      />
      <SubscriptionModuleForm />
    </div>
  );
}

export default function NewSubscriptionModulePage() {
  return (
    <AccessGate module="subscriptionModule" action="create">
      {() => <NewModule />}
    </AccessGate>
  );
}
