"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { FileQuestion, ShieldAlert } from "lucide-react";
import Link from "next/link";
import {
  GLOBAL_TENANT_SETTING_KEYS,
  MENU_ITEMS,
  can,
  findMenuItemByPath,
  resolveMenuFormRoute,
  type ModuleKey,
  type PermissionAction,
} from "@/config/permissions";
import { ModulePrototypePage } from "@/components/shared/ModulePrototypePage";
import { ModulePrototypeFormPage } from "@/components/shared/ModulePrototypeFormPage";
import { hasPrototypeForm } from "@/components/shared/ModulePrototypeFormDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
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
  ...GLOBAL_TENANT_SETTING_KEYS,
]);

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
  const { role, module: moduleSegments } = useParams<{ role: string; module: string[] }>();
  const t = useTranslations("sidebar");
  const user = useSessionStore((s) => s.user);
  const roles = useRolesStore((s) => s.roles);
  const roleDef = user ? roles.find((r) => r.id === user.roleId) : undefined;

  const path = useMemo(() => (moduleSegments ?? []).join("/"), [moduleSegments]);
  const resolved = useMemo(() => resolveMenuFormRoute(path), [path]);
  const groupKey = resolved ? findMenuGroupKey(resolved.menuItem.key) : undefined;

  // Dedicated masters (Country, City, …) must never fall through to the placeholder.
  if (path.startsWith("masters/") || (resolved && REAL_MODULE_KEYS.has(resolved.menuItem.key))) {
    const leaf = findMenuItemByPath(path) ?? resolved?.menuItem;
    const href = leaf ? `/${role}/${leaf.path}` : `/${role}/dashboard`;
    return (
      <div className="p-6">
        <EmptyState
          icon={FileQuestion}
          tone="muted"
          heading="Open the live master page"
          description="This menu has a dedicated screen. Use the sidebar item again, or open it from here."
          action={
            <Button nativeButton={false} render={<Link href={href} />}>
              Go to page
            </Button>
          }
        />
      </div>
    );
  }

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
          description="Create / view / edit for this module is not available yet."
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
