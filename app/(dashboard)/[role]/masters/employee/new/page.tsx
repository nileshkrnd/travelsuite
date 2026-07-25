"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { InternalEmployeeForm } from "@/components/masters/InternalEmployeeForm";

function NewEmployee() {
  const { role } = useParams<{ role: string }>();

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Register employee"
        description="Registers the employee and creates their login with the company email. No separate Users screen inside a tenant."
        actions={
          <Button variant="outline" nativeButton={false} render={<Link href={`/${role}/masters/employee`} />}>
            <ArrowLeft className="h-4 w-4" />
            Back to list
          </Button>
        }
      />
      <InternalEmployeeForm />
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
