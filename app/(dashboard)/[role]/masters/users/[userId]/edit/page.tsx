"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { UserForm } from "@/components/masters/UserForm";
import { useUsersStore } from "@/lib/store/users.store";
import { listUsers } from "@/lib/services/db-users.service";

function EditUser() {
  const { role, userId } = useParams<{ role: string; userId: string }>();
  const users = useUsersStore((s) => s.users);
  const setUsers = useUsersStore((s) => s.setUsers);
  const [loading, setLoading] = useState(users.length === 0);
  const user = users.find((u) => u.id === userId);

  useEffect(() => {
    if (user) return;
    let cancelled = false;
    listUsers()
      .then((rows) => {
        if (!cancelled) setUsers(rows);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, setUsers]);

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading user…</div>;
  }

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
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/${role}/masters/users/${user.id}`} />}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to details
          </Button>
        }
      />
      <UserForm user={user} />
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
