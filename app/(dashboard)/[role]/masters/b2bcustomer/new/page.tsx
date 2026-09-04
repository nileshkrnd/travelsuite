"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { B2BCustomerForm, b2bCustomerPaths } from "@/components/masters/B2BCustomerForm";
import type { RoleDef } from "@/types";

function NewB2BCustomer({ roleDef }: { roleDef: RoleDef }) {
  const { role } = useParams<{ role: string }>();

  return (
    <div className="min-w-0 space-y-6 overflow-x-clip p-6">
      <PageHeader
        title="Add B2B customer"
        description="Create a Corporate or Sub-Agent account."
        actions={
          <Button variant="outline" nativeButton={false} render={<Link href={b2bCustomerPaths(role).list} />}>
            <ArrowLeft className="h-4 w-4" />
            Back to list
          </Button>
        }
      />
      <B2BCustomerForm roleDef={roleDef} />
    </div>
  );
}

export default function NewB2BCustomerPage() {
  return (
    <AccessGate module="b2bCustomer" action="create">
      {(roleDef) => <NewB2BCustomer roleDef={roleDef} />}
    </AccessGate>
  );
}
