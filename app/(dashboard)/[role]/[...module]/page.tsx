"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { FileQuestion, ShieldAlert } from "lucide-react";
import {
  MENU_ITEMS,
  can,
  findMenuItemByPath,
  type ModuleKey,
} from "@/config/permissions";
import { ModulePrototypePage } from "@/components/shared/ModulePrototypePage";
import { EmptyState } from "@/components/shared/EmptyState";
import { useSessionStore } from "@/lib/store/session.store";
import { useRolesStore } from "@/lib/store/roles.store";

function findMenuGroupKey(moduleKey: ModuleKey): ModuleKey | undefined {
  for (const item of MENU_ITEMS) {
    if (item.children?.some((child) => child.key === moduleKey)) return item.key;
  }
  return undefined;
}

export default function ModuleCatchAllPage() {
  const { module: moduleSegments } = useParams<{ module: string[] }>();
  const t = useTranslations("sidebar");
  const user = useSessionStore((s) => s.user);
  const roles = useRolesStore((s) => s.roles);
  const roleDef = user ? roles.find((r) => r.id === user.roleId) : undefined;

  const path = useMemo(() => (moduleSegments ?? []).join("/"), [moduleSegments]);
  const menuItem = useMemo(() => findMenuItemByPath(path), [path]);
  const groupKey = menuItem ? findMenuGroupKey(menuItem.key) : undefined;

  if (!menuItem) {
    return (
      <EmptyState
        icon={FileQuestion}
        tone="muted"
        heading="Page not found"
        description="This menu path doesn't exist or hasn't been configured yet."
      />
    );
  }

  if (!roleDef || !can(roleDef, menuItem.key, "view")) {
    return (
      <EmptyState
        icon={ShieldAlert}
        tone="muted"
        heading="Access restricted"
        description="You don't have access to this page."
      />
    );
  }

  return (
    <ModulePrototypePage
      moduleKey={menuItem.key}
      title={t(menuItem.key)}
      groupLabel={groupKey ? t(groupKey) : undefined}
    />
  );
}
