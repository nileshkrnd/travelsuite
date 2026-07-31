"use client";

import { AccessGate } from "@/components/shared/AccessGate";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { RoleMenuPermissionMatrix } from "@/components/administration/RoleMenuPermissionMatrix";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore, isPlatformMode } from "@/lib/store/tenant.store";
import { useUsersStore } from "@/lib/store/users.store";
import { SUPER_ADMIN_ROLE_ID } from "@/mock/data/roles";
import { Building2 } from "lucide-react";
import type { RoleDef } from "@/types";

function PermissionsPage({ roleDef }: { roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const tenantId = useTenantStore((s) => s.tenantId);
  const tenant = useTenantStore((s) => s.tenant);
  const platformMode = roleDef.id === SUPER_ADMIN_ROLE_ID && isPlatformMode(tenantId);
  const tenantKey = tenant.tenantKey ?? user?.tenantKey ?? 0;
  const actorKey = user
    ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0)
    : 0;

  if (platformMode || tenantKey <= 0) {
    return (
      <div className="p-6">
        <PageHeader
          title="Permissions"
          description="Menu permissions are scoped to a tenant workspace."
        />
        <EmptyState
          icon={Building2}
          tone="primary"
          heading="Select a tenant first"
          description="Open Select Tenant and enter a workspace, then configure Access Role menu permissions."
        />
      </div>
    );
  }

  return (
    <RoleMenuPermissionMatrix roleDef={roleDef} tenantKey={tenantKey} actorKey={actorKey} />
  );
}

export default function AdministrationPermissionsPage() {
  return (
    <AccessGate module="permissions">{(roleDef) => <PermissionsPage roleDef={roleDef} />}</AccessGate>
  );
}
