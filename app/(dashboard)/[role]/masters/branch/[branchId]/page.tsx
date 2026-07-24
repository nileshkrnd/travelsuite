"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, GitBranch, Pencil, Users } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useBranchesStore } from "@/lib/store/branches.store";
import { useCompaniesStore } from "@/lib/store/companies.store";
import { useUsersStore } from "@/lib/store/users.store";
import { getCountry } from "@/config/countries";
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

function BranchView({ roleDef }: { roleDef: RoleDef }) {
  const { role, branchId } = useParams<{ role: string; branchId: string }>();
  const branches = useBranchesStore((s) => s.branches);
  const companies = useCompaniesStore((s) => s.companies);
  const users = useUsersStore((s) => s.users);
  const branch = branches.find((b) => b.id === branchId);
  const canEdit = can(roleDef, "branch", "edit");

  if (!branch) {
    return (
      <div className="p-6">
        <EmptyState
          icon={GitBranch}
          tone="muted"
          heading="Branch not found"
          description="This branch may have been removed."
          action={
            <Button nativeButton={false} render={<Link href={`/${role}/masters/branch`} />}>
              Back to list
            </Button>
          }
        />
      </div>
    );
  }

  const company = companies.find((c) => c.id === branch.companyId);
  const branchEmployees = users.filter((u) => u.branchId === branch.id);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={branch.name}
        description="Branch details."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" nativeButton={false} render={<Link href={`/${role}/masters/branch`} />}>
              <ArrowLeft className="h-4 w-4" />
              Back to list
            </Button>
            {canEdit && (
              <Button nativeButton={false} render={<Link href={`/${role}/masters/branch/${branch.id}/edit`} />}>
                <Pencil className="h-4 w-4" />
                Modify
              </Button>
            )}
          </div>
        }
      />

      <Card className="max-w-xl">
        <CardContent>
          <dl>
            <DetailRow label="Branch name">{branch.name}</DetailRow>
            <DetailRow label="Branch code">{branch.code}</DetailRow>
            <DetailRow label="Company">{company?.name ?? "—"}</DetailRow>
            <DetailRow label="Country">{getCountry(branch.country)?.name ?? branch.country}</DetailRow>
            <DetailRow label="City">{branch.city}</DetailRow>
            <DetailRow label="Status">
              <Badge variant={branch.status === "active" ? "default" : "secondary"}>{branch.status}</Badge>
            </DetailRow>
            <DetailRow label="Registered">{new Date(branch.createdAt).toLocaleDateString()}</DetailRow>
          </dl>
        </CardContent>
      </Card>

      <Card className="max-w-xl">
        <CardContent>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Users className="h-4 w-4 text-muted-foreground" />
              Employees ({branchEmployees.length})
            </h3>
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href={`/${role}/masters/employee`} />}
            >
              View all employees
            </Button>
          </div>
          {branchEmployees.length === 0 ? (
            <p className="text-sm text-muted-foreground">No employees assigned to this branch yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {branchEmployees.map((user) => (
                <li key={user.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{user.name}</span>
                  <span className="text-muted-foreground">{user.email}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function BranchViewPage() {
  return <AccessGate module="branch">{(roleDef) => <BranchView roleDef={roleDef} />}</AccessGate>;
}
