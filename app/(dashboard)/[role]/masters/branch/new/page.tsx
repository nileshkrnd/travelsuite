"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { BranchForm } from "@/components/masters/BranchForm";

function NewBranch() {
  const { role } = useParams<{ role: string }>();

  return (
    <div className="min-w-0 space-y-6 overflow-x-clip p-6">
      <PageHeader
        title="Add branch"
        description="Register a new branch under a company."
        actions={
          <Button variant="outline" nativeButton={false} render={<Link href={`/${role}/masters/branch`} />}>
            <ArrowLeft className="h-4 w-4" />
            Back to list
          </Button>
        }
      />
      <BranchForm />
    </div>
  );
}

export default function NewBranchPage() {
  return (
    <AccessGate module="branch" action="create">
      {() => <NewBranch />}
    </AccessGate>
  );
}
