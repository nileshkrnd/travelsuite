"use client";

import { Construction, ShieldAlert } from "lucide-react";
import { useSessionStore } from "@/lib/store/session.store";
import { useRolesStore } from "@/lib/store/roles.store";
import { can, type ModuleKey } from "@/config/permissions";
import { EmptyState } from "@/components/shared/EmptyState";

interface ComingSoonPlaceholderProps {
  module: ModuleKey;
  title: string;
  /** Which build step ships the real screen. */
  phase?: string;
}

export function ComingSoonPlaceholder({ module, title, phase = "a later step" }: ComingSoonPlaceholderProps) {
  const user = useSessionStore((s) => s.user);
  const roles = useRolesStore((s) => s.roles);
  const roleDef = user ? roles.find((r) => r.id === user.roleId) : undefined;
  const allowed = can(roleDef, module, "view");

  if (!allowed) {
    return (
      <EmptyState
        icon={ShieldAlert}
        tone="muted"
        heading="Access restricted"
        description={`Your role doesn't have access to ${title}.`}
      />
    );
  }

  return (
    <EmptyState
      icon={Construction}
      tone="primary"
      heading="Nothing here yet"
      description={`${title} ships in ${phase}.`}
    />
  );
}
