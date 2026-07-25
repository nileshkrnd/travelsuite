"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { EmployeeMasterForm } from "@/components/masters/EmployeeMasterForm";

function NewEmployee() {
  const { role } = useParams<{ role: string }>();

  return (
    <div className="min-w-0 space-y-6 overflow-x-clip p-6">
      <PageHeader
        title="Register employee"
        description="Creates the employee record and login user with the company email as username."
        actions={
          <Button variant="outline" nativeButton={false} render={<Link href={`/${role}/masters/employee`} />}>
            <ArrowLeft className="h-4 w-4" />
            Back to list
          </Button>
        }
      />
      <EmployeeMasterForm />
    </div>
  );
}

export default function NewEmployeePage() {
  return (
    <AccessGate module="employee" action="create">
      {() => <NewEmployee />}
    </AccessGate>
  );
}
