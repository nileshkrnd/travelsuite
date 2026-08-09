"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { EmployeePropertyAccessForm } from "@/components/masters/EmployeePropertyAccessForm";

function NewEmployeePropertyAccess() {
  const { role } = useParams<{ role: string }>();

  return (
    <div className="min-w-0 space-y-6 overflow-x-clip p-6">
      <PageHeader
        title="Grant property access"
        description="Give an employee access to all properties, or pick specific ones by country and city."
        actions={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/${role}/masters/employee-property-access`} />}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to list
          </Button>
        }
      />
      <EmployeePropertyAccessForm />
    </div>
  );
}

export default function NewEmployeePropertyAccessPage() {
  return (
    <AccessGate module="employeePropertyAccess" action="create">
      {() => <NewEmployeePropertyAccess />}
    </AccessGate>
  );
}
