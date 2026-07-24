"use client";

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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useUsersStore } from "@/lib/store/users.store";
import { useRolesStore } from "@/lib/store/roles.store";
import { useCompaniesStore } from "@/lib/store/companies.store";
import { useBranchesStore } from "@/lib/store/branches.store";
import { initials } from "@/lib/utils";
import { can } from "@/config/permissions";
import type { RoleDef } from "@/types";

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
  const users = useUsersStore((s) => s.users);
  const setUserStatus = useUsersStore((s) => s.setUserStatus);
  const roles = useRolesStore((s) => s.roles);
  const companies = useCompaniesStore((s) => s.companies);
  const branches = useBranchesStore((s) => s.branches);
  const employee = users.find((u) => u.id === employeeId);
  const canEdit = can(roleDef, "employee", "edit");
  const canDelete = can(roleDef, "employee", "delete");

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

  const employeeRole = roles.find((r) => r.id === employee.roleId);
  const company = companies.find((c) => c.id === employee.companyId);
  const branch = branches.find((b) => b.id === employee.branchId);

  function toggleStatus() {
    setUserStatus(employee!.id, employee!.status === "deactivated" ? "active" : "deactivated");
    toast.success(employee!.status === "deactivated" ? "Employee reactivated" : "Employee deactivated");
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={employee.name}
        description="Employee details."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" nativeButton={false} render={<Link href={`/${role}/masters/employee`} />}>
              <ArrowLeft className="h-4 w-4" />
              Back to list
            </Button>
            {canDelete && (
              <Button variant="outline" onClick={toggleStatus}>
                {employee.status === "deactivated" ? (
                  <Power className="h-4 w-4" />
                ) : (
                  <PowerOff className="h-4 w-4" />
                )}
                {employee.status === "deactivated" ? "Reactivate" : "Deactivate"}
              </Button>
            )}
            {canEdit && (
              <Button nativeButton={false} render={<Link href={`/${role}/masters/employee/${employee.id}/edit`} />}>
                <Pencil className="h-4 w-4" />
                Modify
              </Button>
            )}
          </div>
        }
      />

      <Card className="max-w-xl">
        <CardContent>
          <div className="mb-4 flex items-center gap-3">
            <Avatar size="lg">
              <AvatarFallback>{initials(employee.name)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-base font-semibold text-foreground">{employee.name}</p>
              <p className="text-sm text-muted-foreground">{employee.email}</p>
            </div>
          </div>
          <dl>
            <DetailRow label="Role">{employeeRole?.name ?? "—"}</DetailRow>
            <DetailRow label="Company">{company?.name ?? "—"}</DetailRow>
            <DetailRow label="Branch">{branch?.name ?? "—"}</DetailRow>
            <DetailRow label="Department">{employee.department || "—"}</DetailRow>
            <DetailRow label="Status">
              <Badge
                variant={
                  employee.status === "active" ? "default" : employee.status === "invited" ? "secondary" : "outline"
                }
              >
                {employee.status}
              </Badge>
            </DetailRow>
            <DetailRow label="Registered">{new Date(employee.createdAt).toLocaleDateString()}</DetailRow>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

export default function EmployeeViewPage() {
  return <AccessGate module="employee">{(roleDef) => <EmployeeView roleDef={roleDef} />}</AccessGate>;
}
