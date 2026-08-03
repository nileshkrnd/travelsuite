"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { FileQuestion, ShieldAlert } from "lucide-react";
import {
  GLOBAL_TENANT_SETTING_KEYS,
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

/** Modules that already have dedicated App Router pages — never render the placeholder shell for these. */
const REAL_MODULE_KEYS = new Set<ModuleKey>([
  "dashboard",
  "tenantProfile",
  "country",
  "city",
  "region",
  "currency",
  "airlineType",
  "airline",
  "airport",
  "subscription",
  "subscriptionProduct",
  "subscriptionModule",
  "subscriptionModuleAccess",
  "subscriptionModuleMenu",
  "users",
  "accessRole",
  "company",
  "branch",
  "branchType",
  "department",
  "designation",
  "employee",
  "roles",
  "product",
  "propertyType",
  "propertyCategory",
  "propertyUsage",
  "ownershipType",
  "propertyBrand",
  "property",
  "agency",
  "subAgency",
  "corporateAccounts",
  "supplier",
  "accountGroup",
  "ledger",
  "chartOfAccounts",
  "accountsDashboard",
  "reportBalanceSheet",
  "reportProfitAndLoss",
  "reportTrialBalance",
  "permissions",
  "culture",
  ...GLOBAL_TENANT_SETTING_KEYS,
]);

function findMenuGroupKey(moduleKey: ModuleKey): ModuleKey | undefined {
  function contains(items: typeof MENU_ITEMS | undefined, target: ModuleKey): boolean {
    if (!items) return false;
    return items.some((item) => item.key === target || contains(item.children, target));
  }
  for (const item of MENU_ITEMS) {
    if (item.key === moduleKey || contains(item.children, moduleKey)) {
      return item.key as ModuleKey;
    }
  }
  return undefined;
}

function requiredAction(formMode: "list" | "create" | "view" | "edit"): PermissionAction {
  if (formMode === "create") return "create";
  if (formMode === "edit") return "edit";
  return "view";
}

type ModuleCatchAllViewProps = {
  /** Static path prefix for nested catch-alls (e.g. "hrms" under /[role]/hrms/[[...module]]). */
  pathPrefix: string;
};

export function ModuleCatchAllView({ pathPrefix }: ModuleCatchAllViewProps) {
  const { module: moduleSegments } = useParams<{ module?: string[] }>();
  const t = useTranslations("sidebar");
  const user = useSessionStore((s) => s.user);
  const roles = useRolesStore((s) => s.roles);
  const roleDef = user ? roles.find((r) => r.id === user.roleId) : undefined;

  const path = useMemo(() => {
    const rest = (moduleSegments ?? []).join("/");
    return rest ? `${pathPrefix}/${rest}` : pathPrefix;
  }, [moduleSegments, pathPrefix]);

  const resolved = useMemo(() => resolveMenuFormRoute(path), [path]);
  const moduleKey = resolved ? (resolved.menuItem.key as ModuleKey) : undefined;
  const groupKey = moduleKey ? findMenuGroupKey(moduleKey) : undefined;

  // Dedicated screens must never fall through to the placeholder.
  if (path.startsWith("masters/") || (moduleKey != null && REAL_MODULE_KEYS.has(moduleKey))) {
    return (
      <EmptyState
        icon={FileQuestion}
        tone="muted"
        heading="Page not found"
        description="This menu path doesn't exist or hasn't been configured yet."
      />
    );
  }

  if (!resolved || !moduleKey) {
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

  if (!roleDef || !can(roleDef, moduleKey, requiredAction(formMode))) {
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
    if (!hasPrototypeForm(moduleKey)) {
      return (
        <EmptyState
          icon={FileQuestion}
          tone="muted"
          heading="Form not available"
          description="Create / view / edit for this module is not available yet."
        />
      );
    }

    return (
      <ModulePrototypeFormPage
        moduleKey={moduleKey}
        title={t(moduleKey)}
        groupLabel={groupKey ? t(groupKey) : undefined}
        listPath={menuItem.path}
        mode={formMode}
        recordId={recordId}
      />
    );
  }

  return (
    <ModulePrototypePage
      moduleKey={moduleKey}
      title={t(moduleKey)}
      groupLabel={groupKey ? t(groupKey) : undefined}
      listPath={menuItem.path}
    />
  );
}
