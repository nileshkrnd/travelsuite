"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { EmployeePropertyAccessForm } from "@/components/masters/EmployeePropertyAccessForm";
import {
  getEmployeePropertyGrant,
  EmployeePropertyAccessApiError,
} from "@/lib/services/employee-property-access.service";
import type { EmployeePropertyGrant } from "@/types";

function EditEmployeePropertyAccess() {
  const { role, employeeId } = useParams<{ role: string; employeeId: string }>();
  const id = Number(employeeId);
  const [grant, setGrant] = useState<EmployeePropertyGrant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(id) || id <= 0) {
      setLoading(false);
      setError("Invalid employee id");
      return;
    }
    let cancelled = false;
    getEmployeePropertyGrant(id)
      .then((row) => {
        if (!cancelled) setGrant(row);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof EmployeePropertyAccessApiError ? err.message : "Failed to load access grant");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  if (error || !grant) {
    return (
      <div className="p-6">
        <EmptyState
          icon={ShieldCheck}
          tone="muted"
          heading="Access grant not found"
          description={error ?? "This grant may have been removed."}
          action={
            <Button nativeButton={false} render={<Link href={`/${role}/masters/employee-property-access`} />}>
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
        title="Modify property access"
        description={`Update access for ${grant.employeeName ?? "this employee"}`}
        actions={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/${role}/masters/employee-property-access/${grant.employeeId}`} />}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to details
          </Button>
        }
      />
      <EmployeePropertyAccessForm grant={grant} />
    </div>
  );
}

export default function EditEmployeePropertyAccessPage() {
  return (
    <AccessGate module="employeePropertyAccess" action="edit">
      {() => <EditEmployeePropertyAccess />}
    </AccessGate>
  );
}
