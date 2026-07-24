"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { EmployeeForm } from "@/components/masters/EmployeeForm";
import { useUsersStore } from "@/lib/store/users.store";

function EditUser() {
  const { role, userId } = useParams<{ role: string; userId: string }>();
  const users = useUsersStore((s) => s.users);
  const user = users.find((u) => u.id === userId);

  if (!user) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Users}
          tone="muted"
          heading="User not found"
          description="This user may have been removed."
          action={
            <Button nativeButton={false} render={<Link href={`/${role}/masters/users`} />}>
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
        title={`Edit ${user.name}`}
        description="Update this user's details."
        actions={
          <Button variant="outline" nativeButton={false} render={<Link href={`/${role}/masters/users/${user.id}`} />}>
            <ArrowLeft className="h-4 w-4" />
            Back to details
          </Button>
        }
      />
      <EmployeeForm employee={user} />
    </div>
  );
}

export default function EditUserPage() {
  return (
    <AccessGate module="users" action="edit">
      {() => <EditUser />}
    </AccessGate>
  );
}
