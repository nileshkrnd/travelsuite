"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserCog, Pencil, Power, PowerOff } from "lucide-react";
import { toast } from "sonner";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { getEmployee, setEmployeeActive, EmployeesApiError } from "@/lib/services/employees.service";
import { can } from "@/config/permissions";
import { initials } from "@/lib/utils";
import type { Employee, RoleDef } from "@/types";
import { employeeDisplayName } from "@/types/employee";

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 border-b border-border py-3 text-sm last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="col-span-2">{children}</dd>
    </div>
  );
}

function EmployeeView({ roleDef }: { roleDef: RoleDef }) {
  const { role, employeeId } = useParams<{ role: string; employeeId: string }>();
  const sessionUser = useSessionStore((s) => s.user);
  const activeTenant = useTenantStore((s) => s.tenant);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const canEdit = can(roleDef, "employee", "edit");
  const canDelete = can(roleDef, "employee", "delete");
  const actorKey = sessionUser?.userKey ?? 0;

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
  }, [employeeId, activeTenant.tenantKey]);

  async function toggleStatus() {
    if (!employee || !actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      const saved = await setEmployeeActive(employee.employeeId, !employee.isActive, actorKey);
      setEmployee(saved);
      toast.success(saved.isActive ? "Employee activated" : "Employee deactivated");
    } catch (error) {
      toast.error(error instanceof EmployeesApiError ? error.message : "Could not update employee");
    }
  }

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

  const displayName = employeeDisplayName(employee);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={displayName}
        description="Employee details."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" nativeButton={false} render={<Link href={`/${role}/masters/employee`} />}>
              <ArrowLeft className="h-4 w-4" />
              Back to list
            </Button>
            {canDelete && (
              <Button variant="outline" onClick={toggleStatus}>
                {employee.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                {employee.isActive ? "Deactivate" : "Reactivate"}
              </Button>
            )}
            {canEdit && (
              <Button
                nativeButton={false}
                render={<Link href={`/${role}/masters/employee/${employee.employeeId}/edit`} />}
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
          <div className="mb-4 flex items-center gap-3">
            <Avatar size="lg">
              {employee.employeeImage ? <AvatarImage src={employee.employeeImage} alt="" /> : null}
              <AvatarFallback>{initials(displayName)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-base font-semibold text-foreground">{displayName}</p>
              <p className="text-sm text-muted-foreground">{employee.email}</p>
            </div>
          </div>
          <dl>
            <DetailRow label="Employee number">{employee.employeeNumber}</DetailRow>
            <DetailRow label="Gender">{employee.gender}</DetailRow>
            <DetailRow label="Company">{employee.companyName ?? "—"}</DetailRow>
            <DetailRow label="Branch">{employee.branchName ?? "—"}</DetailRow>
            <DetailRow label="Designation">{employee.designationName ?? "—"}</DetailRow>
            <DetailRow label="Department">{employee.departmentName ?? "—"}</DetailRow>
            <DetailRow label="Access role">{employee.accessRoleName ?? "—"}</DetailRow>
            <DetailRow label="Reporting to">{employee.reportingEmployeeName ?? "—"}</DetailRow>
            <DetailRow label="Country">{employee.countryName ?? "—"}</DetailRow>
            <DetailRow label="City">{employee.cityName ?? "—"}</DetailRow>
            <DetailRow label="Address">{employee.address}</DetailRow>
            <DetailRow label="Phone">
              {employee.countryDialCode} {employee.phoneNumber}
            </DetailRow>
            <DetailRow label="Fax">{employee.faxNumber ?? "—"}</DetailRow>
            <DetailRow label="Joining date">
              {new Date(employee.joiningDate).toLocaleDateString()}
            </DetailRow>
            <DetailRow label="Status">
              <Badge variant={employee.isActive ? "default" : "outline"}>
                {employee.isActive ? "active" : "inactive"}
              </Badge>
            </DetailRow>
            <DetailRow label="Created">
              {new Date(employee.createdDtTm).toLocaleDateString()}
            </DetailRow>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

export default function EmployeeViewPage() {
  return <AccessGate module="employee">{(roleDef) => <EmployeeView roleDef={roleDef} />}</AccessGate>;
}
