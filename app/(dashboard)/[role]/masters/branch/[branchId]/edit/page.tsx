"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, GitBranch } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { BranchForm } from "@/components/masters/BranchForm";
import { useBranchesStore } from "@/lib/store/branches.store";

function EditBranch() {
  const { role, branchId } = useParams<{ role: string; branchId: string }>();
  const branches = useBranchesStore((s) => s.branches);
  const branch = branches.find((b) => b.id === branchId);

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
