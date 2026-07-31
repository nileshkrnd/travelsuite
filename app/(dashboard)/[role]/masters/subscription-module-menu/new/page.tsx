"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { SubscriptionModuleMenuForm } from "@/components/masters/SubscriptionModuleMenuForm";

function NewMenu() {
  const { role } = useParams<{ role: string }>();

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Add module menu"
        description="Create a menu/submenu with icon and URL stored in the database."
        actions={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/${role}/masters/subscription-module-menu`} />}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to list
          </Button>
        }
      />
      <SubscriptionModuleMenuForm />
    </div>
  );
}

export default function NewSubscriptionModuleMenuPage() {
  return (
    <AccessGate module="subscriptionModuleMenu" action="create">
      {() => <NewMenu />}
    </AccessGate>
  );
}
