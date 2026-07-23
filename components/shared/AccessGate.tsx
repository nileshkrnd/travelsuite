"use client";

import { ShieldAlert } from "lucide-react";
import { useSessionStore } from "@/lib/store/session.store";
import { useRolesStore } from "@/lib/store/roles.store";
import { can, type ModuleKey, type PermissionAction } from "@/config/permissions";
import { EmptyState } from "@/components/shared/EmptyState";
import type { RoleDef } from "@/types";

interface AccessGateProps {
  module: ModuleKey;
  action?: PermissionAction;
  /** Render prop form gives the resolved roleDef to the page for further use (e.g. building URLs). */
  children: (roleDef: RoleDef) => React.ReactNode;
}

/** Gates a full page behind a permission check, showing a consistent "Access restricted" state otherwise. */
export function AccessGate({ module, action = "view", children }: AccessGateProps) {
  const user = useSessionStore((s) => s.user);
  const roles = useRolesStore((s) => s.roles);
  const roleDef = user ? roles.find((r) => r.id === user.roleId) : undefined;

  if (!roleDef || !can(roleDef, module, action)) {
    return (
      <EmptyState
        icon={ShieldAlert}
        tone="muted"
        heading="Access restricted"
        description="You don't have access to this page."
      />
    );
  }

  return <>{children(roleDef)}</>;
}
