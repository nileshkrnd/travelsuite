"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, Pencil, Power, PowerOff } from "lucide-react";
import { toast } from "sonner";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSessionStore } from "@/lib/store/session.store";
import { useUsersStore } from "@/lib/store/users.store";
import { listUsers, setUserActive, UsersApiError } from "@/lib/services/db-users.service";
import { initials } from "@/lib/utils";
import { can } from "@/config/permissions";
import type { RoleDef, UserScope } from "@/types";

function scopeLabel(scope: UserScope) {
  if (scope === "superAdmin") return "Super Admin";
  if (scope === "tenantAdmin") return "Tenant Admin";
  return "Employee";
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 border-b border-border py-3 text-sm last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="col-span-2">{children}</dd>
    </div>
  );
}

function UserView({ roleDef }: { roleDef: RoleDef }) {
  const { role, userId } = useParams<{ role: string; userId: string }>();
  const sessionUser = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const setUsers = useUsersStore((s) => s.setUsers);
  const upsertUser = useUsersStore((s) => s.upsertUser);
  const [loading, setLoading] = useState(users.length === 0);
  const user = users.find((u) => u.id === userId);
  const canEdit = can(roleDef, "users", "edit");
  const actorKey = sessionUser?.userKey ?? 0;

  useEffect(() => {
    if (user) {
      setLoading(false);
      return;
    }
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

  async function toggleStatus() {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      const saved = await setUserActive(user!.userKey, !user!.isActive, actorKey);
      upsertUser(saved);
      toast.success(saved.isActive ? "User activated" : "User deactivated");
    } catch (error) {
      toast.error(error instanceof UsersApiError ? error.message : "Could not update status");
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={user.name}
        description="User master details."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" nativeButton={false} render={<Link href={`/${role}/masters/users`} />}>
              <ArrowLeft className="h-4 w-4" />
              Back to list
            </Button>
            {canEdit && (
              <>
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={<Link href={`/${role}/masters/users/${user.id}/edit`} />}
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
                <Button variant="outline" onClick={() => void toggleStatus()}>
                  {user.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                  {user.isActive ? "Deactivate" : "Activate"}
                </Button>
              </>
            )}
          </div>
        }
      />

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback>{initials(user.name)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.username}</p>
            </div>
          </div>
          <dl>
            <DetailRow label="User ID">{user.userKey}</DetailRow>
            <DetailRow label="Scope">{scopeLabel(user.scope)}</DetailRow>
            <DetailRow label="Tenant ID">{user.tenantKey}</DetailRow>
            <DetailRow label="Company ID">{user.companyKey}</DetailRow>
            <DetailRow label="Status">
              <Badge variant={user.isActive ? "default" : "secondary"}>
                {user.isActive ? "active" : "inactive"}
              </Badge>
            </DetailRow>
            <DetailRow label="Created">{new Date(user.createdAt).toLocaleString()}</DetailRow>
            <DetailRow label="Last login">
              {user.lastLoggedInDtTm ? new Date(user.lastLoggedInDtTm).toLocaleString() : "—"}
            </DetailRow>
            <DetailRow label="Last password change">
              {user.lastPasswordChangeDtTm
                ? new Date(user.lastPasswordChangeDtTm).toLocaleString()
                : "—"}
            </DetailRow>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

export default function UserDetailPage() {
  return <AccessGate module="users">{(roleDef) => <UserView roleDef={roleDef} />}</AccessGate>;
}
