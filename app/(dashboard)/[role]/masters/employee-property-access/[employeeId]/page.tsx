"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Pencil, Globe2 } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getEmployeePropertyGrant,
  EmployeePropertyAccessApiError,
} from "@/lib/services/employee-property-access.service";
import { can } from "@/config/permissions";
import type { EmployeePropertyGrant, RoleDef } from "@/types";

const FLAGS = [
  { key: "canView", label: "View" },
  { key: "canCreate", label: "Create" },
  { key: "canEdit", label: "Edit" },
  { key: "canSubmit", label: "Submit" },
  { key: "canApprove", label: "Approve" },
] as const;

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 border-b border-border py-3 text-sm last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="col-span-2">{children}</dd>
    </div>
  );
}

function EmployeePropertyAccessView({ roleDef }: { roleDef: RoleDef }) {
  const { role, employeeId } = useParams<{ role: string; employeeId: string }>();
  const id = Number(employeeId);
  const [grant, setGrant] = useState<EmployeePropertyGrant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canEdit = can(roleDef, "employeePropertyAccess", "edit");

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
    <div className="space-y-6 p-6">
      <PageHeader
        title={grant.employeeName ?? `Employee ${grant.employeeId}`}
        description="Property access grant details."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/${role}/masters/employee-property-access`} />}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to list
            </Button>
            {canEdit && (
              <Button
                nativeButton={false}
                render={<Link href={`/${role}/masters/employee-property-access/${grant.employeeId}/edit`} />}
              >
                <Pencil className="h-4 w-4" />
                Modify
              </Button>
            )}
          </div>
        }
      />

      <Card className="max-w-2xl">
        <CardContent>
          <dl>
            <DetailRow label="Employee">{grant.employeeName ?? grant.employeeId}</DetailRow>
            <DetailRow label="Property scope">
              {grant.isAllProperties ? (
                <Badge variant="default" className="gap-1">
                  <Globe2 className="h-3 w-3" />
                  All properties
                </Badge>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {grant.properties.map((p) => (
                    <Badge key={p.propertyId} variant="outline">
                      {p.propertyName || p.propertyCode}
                    </Badge>
                  ))}
                </div>
              )}
            </DetailRow>
            <DetailRow label="Permissions">
              <div className="flex flex-wrap gap-1.5">
                {FLAGS.filter((f) => grant[f.key]).map((f) => (
                  <Badge key={f.key} variant="secondary">
                    {f.label}
                  </Badge>
                ))}
              </div>
            </DetailRow>
            <DetailRow label="Valid">
              {[grant.validFrom, grant.validTo].filter(Boolean).join(" → ") || "No expiry"}
            </DetailRow>
            <DetailRow label="Status">
              <Badge variant={grant.isActive ? "default" : "secondary"}>
                {grant.isActive ? "active" : "inactive"}
              </Badge>
            </DetailRow>
            <DetailRow label="Granted">{new Date(grant.createdAt).toLocaleDateString()}</DetailRow>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

export default function EmployeePropertyAccessViewPage() {
  return (
    <AccessGate module="employeePropertyAccess">
      {(roleDef) => <EmployeePropertyAccessView roleDef={roleDef} />}
    </AccessGate>
  );
}
