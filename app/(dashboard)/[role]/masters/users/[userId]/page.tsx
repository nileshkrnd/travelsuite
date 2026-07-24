"use client";

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
import { useUsersStore } from "@/lib/store/users.store";
import { useRolesStore } from "@/lib/store/roles.store";
import { useOrgName } from "@/lib/hooks/useOrgName";
import { initials } from "@/lib/utils";
import { can } from "@/config/permissions";
import type { RoleCategory, RoleDef } from "@/types";

const CATEGORY_LABELS: Record<RoleCategory, string> = {
  internal: "Internal Staff",
  agency: "Agency",
  subAgency: "SubAgency",
  corporate: "Corporate",
  supplier: "Supplier",
};

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
  const users = useUsersStore((s) => s.users);
  const setUserStatus = useUsersStore((s) => s.setUserStatus);
  const roles = useRolesStore((s) => s.roles);
  const getOrgName = useOrgName();
  const user = users.find((u) => u.id === userId);
  const canEdit = can(roleDef, "users", "edit");
  const canDelete = can(roleDef, "users", "delete");

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

  const userRole = roles.find((r) => r.id === user.roleId);

  function toggleStatus() {
    setUserStatus(user!.id, user!.status === "deactivated" ? "active" : "deactivated");
    toast.success(user!.status === "deactivated" ? "User reactivated" : "User deactivated");
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={user.name}
        description="User details."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" nativeButton={false} render={<Link href={`/${role}/masters/users`} />}>
              <ArrowLeft className="h-4 w-4" />
              Back to list
            </Button>
            {canDelete && (
              <Button variant="outline" onClick={toggleStatus}>
                {user.status === "deactivated" ? (
                  <Power className="h-4 w-4" />
                ) : (
                  <PowerOff className="h-4 w-4" />
                )}
                {user.status === "deactivated" ? "Reactivate" : "Deactivate"}
              </Button>
            )}
            {canEdit && (
              <Button nativeButton={false} render={<Link href={`/${role}/masters/users/${user.id}/edit`} />}>
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
              <AvatarFallback>{initials(user.name)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-base font-semibold text-foreground">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <dl>
            <DetailRow label="Category">
              {userRole ? CATEGORY_LABELS[userRole.category] : "—"}
            </DetailRow>
            <DetailRow label="Role">{userRole?.name ?? "—"}</DetailRow>
            <DetailRow label="Organization">{getOrgName(user)}</DetailRow>
            <DetailRow label="Department">{user.department || "—"}</DetailRow>
            <DetailRow label="Status">
              <Badge
                variant={user.status === "active" ? "default" : user.status === "invited" ? "secondary" : "outline"}
              >
                {user.status}
              </Badge>
            </DetailRow>
            <DetailRow label="Registered">{new Date(user.createdAt).toLocaleDateString()}</DetailRow>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

export default function UserViewPage() {
  return <AccessGate module="users">{(roleDef) => <UserView roleDef={roleDef} />}</AccessGate>;
}
