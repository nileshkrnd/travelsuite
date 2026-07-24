"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserCog } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { InternalEmployeeForm } from "@/components/masters/InternalEmployeeForm";
import { useUsersStore } from "@/lib/store/users.store";

function EditEmployee() {
  const { role, employeeId } = useParams<{ role: string; employeeId: string }>();
  const users = useUsersStore((s) => s.users);
  const employee = users.find((u) => u.id === employeeId);

  if (!employee) {
    return (
      <div className="p-6">
        <EmptyState
          icon={UserCog}
          tone="muted"
          heading="Employee not found"
          description="This employee may have been removed."
          action={
            <Button nativeButton={false} render={<Link href={`/${role}/masters/employee`} />}>
              Back to list
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={`Edit ${employee.name}`}
        description="Update this employee's details."
        actions={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/${role}/masters/employee/${employee.id}`} />}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to details
          </Button>
        }
      />
      <InternalEmployeeForm employee={employee} />
    </div>
  );
}

export default function EditEmployeePage() {
  return (
    <AccessGate module="employee" action="edit">
      {() => <EditEmployee />}
    </AccessGate>
  );
}
