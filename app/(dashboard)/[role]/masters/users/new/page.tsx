"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { EmployeeForm } from "@/components/masters/EmployeeForm";

function NewUser() {
  const { role } = useParams<{ role: string }>();

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Register user"
        description="Add a new user to this tenant."
        actions={
          <Button variant="outline" nativeButton={false} render={<Link href={`/${role}/masters/users`} />}>
            <ArrowLeft className="h-4 w-4" />
            Back to list
          </Button>
        }
      />
      <EmployeeForm />
    </div>
  );
}

export default function NewUserPage() {
  return (
    <AccessGate module="users" action="create">
      {() => <NewUser />}
    </AccessGate>
  );
}
