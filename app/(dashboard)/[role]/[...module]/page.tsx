"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { FileQuestion, ShieldAlert } from "lucide-react";
import {
  MENU_ITEMS,
  can,
  resolveMenuFormRoute,
  type ModuleKey,
  type PermissionAction,
} from "@/config/permissions";
import { ModulePrototypePage } from "@/components/shared/ModulePrototypePage";
import { ModulePrototypeFormPage } from "@/components/shared/ModulePrototypeFormPage";
import { hasPrototypeForm } from "@/components/shared/ModulePrototypeFormDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { useSessionStore } from "@/lib/store/session.store";
import { useRolesStore } from "@/lib/store/roles.store";

function findMenuGroupKey(moduleKey: ModuleKey): ModuleKey | undefined {
  function contains(items: typeof MENU_ITEMS | undefined, target: ModuleKey): boolean {
    if (!items) return false;
    return items.some((item) => item.key === target || contains(item.children, target));
  }
  for (const item of MENU_ITEMS) {
    if (item.key === moduleKey || contains(item.children, moduleKey)) return item.key;
  }
  return undefined;
}

function requiredAction(formMode: "list" | "create" | "view" | "edit"): PermissionAction {
  if (formMode === "create") return "create";
  if (formMode === "edit") return "edit";
  return "view";
}

export default function ModuleCatchAllPage() {
  const { module: moduleSegments } = useParams<{ module: string[] }>();
  const t = useTranslations("sidebar");
  const user = useSessionStore((s) => s.user);
  const roles = useRolesStore((s) => s.roles);
  const roleDef = user ? roles.find((r) => r.id === user.roleId) : undefined;

  const path = useMemo(() => (moduleSegments ?? []).join("/"), [moduleSegments]);
  const resolved = useMemo(() => resolveMenuFormRoute(path), [path]);
  const groupKey = resolved ? findMenuGroupKey(resolved.menuItem.key) : undefined;

  if (!resolved) {
    return (
      <EmptyState
        icon={FileQuestion}
        tone="muted"
        heading="Page not found"
        description="This menu path doesn't exist or hasn't been configured yet."
      />
    );
  }

  const { menuItem, formMode, recordId } = resolved;

  if (!roleDef || !can(roleDef, menuItem.key, requiredAction(formMode))) {
    return (
      <EmptyState
        icon={ShieldAlert}
        tone="muted"
        heading="Access restricted"
        description="You don't have access to this page."
      />
    );
  }

  if (formMode !== "list") {
    if (!hasPrototypeForm(menuItem.key)) {
      return (
        <EmptyState
          icon={FileQuestion}
          tone="muted"
          heading="Form not available"
          description="This module doesn't have a create / view / edit form yet."
        />
      );
    }

    return (
      <ModulePrototypeFormPage
        moduleKey={menuItem.key}
        title={t(menuItem.key)}
        groupLabel={groupKey ? t(groupKey) : undefined}
        listPath={menuItem.path}
        mode={formMode}
        recordId={recordId}
      />
    );
  }

  return (
    <ModulePrototypePage
      moduleKey={menuItem.key}
      title={t(menuItem.key)}
      groupLabel={groupKey ? t(groupKey) : undefined}
      listPath={menuItem.path}
    />
  );
}
