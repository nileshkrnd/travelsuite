"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, GitBranch } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { BranchForm } from "@/components/masters/BranchForm";
import { useBranchesStore } from "@/lib/store/branches.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { listBranches } from "@/lib/services/db-branches.service";

function EditBranch() {
  const { role, branchId } = useParams<{ role: string; branchId: string }>();
  const branches = useBranchesStore((s) => s.branches);
  const setBranches = useBranchesStore((s) => s.setBranches);
  const activeTenant = useTenantStore((s) => s.tenant);
  const branch = branches.find((b) => b.id === branchId);
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
    <div className="min-w-0 space-y-6 overflow-x-clip p-6">
      <PageHeader
        title={`Edit ${branch.name}`}
        description="Update this branch's details."
        actions={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/${role}/masters/branch/${branch.id}`} />}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to details
          </Button>
        }
      />
      <BranchForm branch={branch} />
    </div>
  );
}

export default function EditBranchPage() {
  return (
    <AccessGate module="branch" action="edit">
      {() => <EditBranch />}
    </AccessGate>
  );
}
