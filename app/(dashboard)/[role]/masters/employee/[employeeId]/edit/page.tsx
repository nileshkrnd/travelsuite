"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserCog } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { EmployeeMasterForm } from "@/components/masters/EmployeeMasterForm";
import { getEmployee, EmployeesApiError } from "@/lib/services/employees.service";
import type { Employee } from "@/types";
import { employeeDisplayName } from "@/types/employee";

function EditEmployee() {
  const { role, employeeId } = useParams<{ role: string; employeeId: string }>();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const id = Number(employeeId);
    if (!Number.isFinite(id) || id <= 0) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getEmployee(id)
      .then((row) => {
        if (!cancelled) {
          setEmployee(row);
          setNotFound(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setEmployee(null);
          setNotFound(err instanceof EmployeesApiError && err.status === 404);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [employeeId]);

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading employee…</div>;
  }

  if (notFound || !employee) {
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
    <div className="min-w-0 space-y-6 overflow-x-clip p-6">
      <PageHeader
        title={`Edit ${employeeDisplayName(employee)}`}
        description="Update this employee's details."
        actions={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/${role}/masters/employee/${employee.employeeId}`} />}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to details
          </Button>
        }
      />
      <EmployeeMasterForm employee={employee} />
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
