"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { SupplierUserForm } from "@/components/masters/SupplierUserForm";

function NewSupplierUser() {
  const { role } = useParams<{ role: string }>();

  return (
    <div className="min-w-0 space-y-6 overflow-x-clip p-6">
      <PageHeader
        title="Register supplier user"
        description="Creates the supplier contact and a linked login account (email as username)."
        actions={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/${role}/masters/supplier-user`} />}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to list
          </Button>
        }
      />
      <SupplierUserForm />
    </div>
  );
}

export default function NewSupplierUserPage() {
  return (
    <AccessGate module="supplierUser" action="create">
      {() => <NewSupplierUser />}
    </AccessGate>
  );
}
