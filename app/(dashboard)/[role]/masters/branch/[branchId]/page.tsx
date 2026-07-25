"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, GitBranch, Pencil } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useBranchesStore } from "@/lib/store/branches.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { listBranches } from "@/lib/services/db-branches.service";
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
  const activeTenant = useTenantStore((s) => s.tenant);
  const branches = useBranchesStore((s) => s.branches);
  const setBranches = useBranchesStore((s) => s.setBranches);
  const branch = branches.find((b) => b.id === branchId);
  const canEdit = can(roleDef, "branch", "edit");
  const [loading, setLoading] = useState(!branch);
  const tenantKey = activeTenant.tenantKey ?? 0;

  useEffect(() => {
    if (branch || tenantKey <= 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    listBranches({ tenantId: tenantKey })
      .then((rows) => {
        if (cancelled) return;
        const others = useBranchesStore.getState().branches.filter((b) => b.tenantKey !== tenantKey);
        setBranches([...others, ...rows]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [branch, tenantKey, setBranches]);

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading branch…</div>;
  }

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

      <Card className="max-w-2xl">
        <CardContent>
          <dl>
            <DetailRow label="Branch name">{branch.name}</DetailRow>
            <DetailRow label="Branch type">{branch.branchTypeName ?? branch.branchTypeId}</DetailRow>
            <DetailRow label="Company">{branch.companyName ?? branch.companyId}</DetailRow>
            <DetailRow label="Branch ID">{branch.branchKey}</DetailRow>
            <DetailRow label="Address">
              {[branch.address1, branch.address2].filter(Boolean).join(", ") || "—"}
            </DetailRow>
            <DetailRow label="Country / City">
              {branch.countryName ?? branch.countryId} / {branch.cityName ?? branch.cityId}
            </DetailRow>
            <DetailRow label="Zip / Dial">
              {branch.zipCode} / +{branch.countryDialCode}
            </DetailRow>
            <DetailRow label="Contact">{branch.contactPerson}</DetailRow>
            <DetailRow label="Phone / Email">
              {branch.phoneNumber} / {branch.emailAddress}
            </DetailRow>
            <DetailRow label="Fax">{branch.faxNumber || "—"}</DetailRow>
            <DetailRow label="Status">
              <Badge variant={branch.isActive ? "default" : "secondary"}>
                {branch.isActive ? "active" : "inactive"}
              </Badge>
            </DetailRow>
            <DetailRow label="Registered">{new Date(branch.createdAt).toLocaleDateString()}</DetailRow>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

export default function BranchViewPage() {
  return <AccessGate module="branch">{(roleDef) => <BranchView roleDef={roleDef} />}</AccessGate>;
}
