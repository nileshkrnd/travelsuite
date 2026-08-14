"use client";

import { useMemo } from "react";
import { useParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/layout/ThemeSwitcher";
import { NotificationCenter } from "@/components/layout/NotificationCenter";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { OrgScopeSelectors } from "@/components/layout/OrgScopeSelectors";
import { UserMenu } from "@/components/layout/UserMenu";
import { useSessionStore } from "@/lib/store/session.store";
import { useRolesStore } from "@/lib/store/roles.store";
import { useUiPrefsStore } from "@/lib/store/ui-prefs.store";
import { useWorkspaceMenus } from "@/lib/hooks/useWorkspaceMenus";
import {
  collectMenuLeafPaths,
  resolveActiveMenuPath,
} from "@/lib/menu-active-path";
import { normalizeMenuUrl } from "@/lib/normalize-menu-url";
import { ICONS } from "@/lib/icon-registry";
import type { MenuItem } from "@/config/permissions";

function flattenLeaves(items: MenuItem[]): MenuItem[] {
  return items.flatMap((item) => (item.children ? flattenLeaves(item.children) : [item]));
}

function findAncestorLabel(items: MenuItem[], activePath: string): string | null {
  for (const item of items) {
    if (!item.children?.length) continue;
    const hit = flattenLeaves(item.children).some(
      (leaf) => normalizeMenuUrl(leaf.path) === activePath
    );
    if (hit) return item.label ?? null;
    const nested = findAncestorLabel(item.children, activePath);
    if (nested) return nested;
  }
  return null;
}

export function Topbar() {
  const user = useSessionStore((s) => s.user);
  const roles = useRolesStore((s) => s.roles);
  const pathname = usePathname();
  const params = useParams<{ role?: string }>();
  const setMobileDrawerOpen = useUiPrefsStore((s) => s.setMobileDrawerOpen);
  const t = useTranslations("sidebar");

  const roleDef = user ? roles.find((r) => r.id === user.roleId) : undefined;
  const roleSlug =
    typeof params.role === "string" && params.role ? params.role : roleDef?.slug ?? "";
  const { items } = useWorkspaceMenus(roleDef);

  const leaves = useMemo(() => flattenLeaves(items), [items]);
  const activePath = roleDef
    ? resolveActiveMenuPath(pathname, roleSlug, collectMenuLeafPaths(items))
    : null;
  const activeItem = activePath
    ? leaves.find((item) => normalizeMenuUrl(item.path) === activePath)
    : undefined;
  const ActiveIcon = activeItem ? ICONS[activeItem.icon] : undefined;
  const groupLabel = activePath ? findAncestorLabel(items, activePath) : null;

  const title = activeItem
    ? activeItem.label ??
      (() => {
        try {
          return t(activeItem.key);
        } catch {
          return activeItem.key;
        }
      })()
    : null;

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b bg-background px-4 print:hidden lg:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        aria-label="Open navigation"
        onClick={() => setMobileDrawerOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {activeItem && ActiveIcon && title && (
        <div className="hidden min-w-0 flex-col sm:flex">
          {groupLabel && groupLabel !== title && (
            <p className="truncate text-[11px] leading-none text-muted-foreground">{groupLabel}</p>
          )}
          <div className="flex min-w-0 items-center gap-2">
            <ActiveIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <h2 className="truncate text-sm font-semibold text-foreground">{title}</h2>
          </div>
        </div>
      )}

      <div className="flex-1" />

      <GlobalSearch />

      <OrgScopeSelectors />

      <div className="flex items-center gap-1.5">
        <NotificationCenter />
        <div className="flex items-center gap-0.5">
          <ThemeSwitcher />
          <LanguageSwitcher />
        </div>
        <UserMenu />
      </div>
    </header>
  );
}
