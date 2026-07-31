"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronDown, PanelLeftClose, PanelLeftOpen, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { ICONS } from "@/lib/icon-registry";
import { getMenuForRole, type MenuItem } from "@/config/permissions";
import { buildTenantWorkspaceMenus } from "@/lib/subscription-menu-access";
import { useUiPrefsStore } from "@/lib/store/ui-prefs.store";
import { isPlatformMode, useTenantStore } from "@/lib/store/tenant.store";
import { useChromeBranding } from "@/lib/hooks/useChromeBranding";
import { TenantLogo } from "@/components/layout/TenantLogo";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { listTenantSubscriptionModuleMenus } from "@/lib/services/subscription-module-menus.service";
import {
  collectMenuLeafPaths,
  menuItemHref,
  resolveActiveMenuPath,
} from "@/lib/menu-active-path";
import type { RoleDef, SubscriptionModuleMenu } from "@/types";

function menuLabel(item: MenuItem, t: (key: string) => string): string {
  if (item.label) return item.label;
  try {
    return t(item.key);
  } catch {
    return item.key;
  }
}

function menuIcon(name: string) {
  return ICONS[name] ?? Layers;
}

interface SidebarProps {
  roleDef: RoleDef;
  /** Rendered inside the mobile drawer: always full-width, no collapse toggle. */
  mobile?: boolean;
  className?: string;
  onNavigate?: () => void;
}

export function Sidebar({ roleDef, mobile = false, className, onNavigate }: SidebarProps) {
  const t = useTranslations("sidebar");
  const pathname = usePathname();
  const branding = useChromeBranding();
  const tenantId = useTenantStore((s) => s.tenantId);
  const tenantKey = useTenantStore((s) => s.tenant.tenantKey);
  const collapsed = useUiPrefsStore((s) => s.sidebarCollapsed) && !mobile;
  const toggleCollapsed = useUiPrefsStore((s) => s.toggleSidebarCollapsed);
  const platformMode = isPlatformMode(tenantId);
  const [dbMenus, setDbMenus] = useState<SubscriptionModuleMenu[]>([]);
  const [menusLoaded, setMenusLoaded] = useState(platformMode);

  useEffect(() => {
    if (platformMode || !tenantKey || tenantKey <= 0) {
      setDbMenus([]);
      setMenusLoaded(true);
      return;
    }
    let cancelled = false;
    setMenusLoaded(false);
    // Only menus for modules granted via Subscription Module Access.
    listTenantSubscriptionModuleMenus(tenantKey)
      .then((rows) => {
        if (!cancelled) {
          setDbMenus(rows);
          setMenusLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDbMenus([]);
          setMenusLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [platformMode, tenantKey, tenantId]);

  const items = useMemo(() => {
    if (platformMode) {
      return getMenuForRole(roleDef, { platformMode: true });
    }
    const roleMenus = getMenuForRole(roleDef, { platformMode: false });
    // Only DB menus for modules granted via Module Access (Administration, POS, HRMS, …).
    return buildTenantWorkspaceMenus(roleMenus, menusLoaded ? dbMenus : []);
  }, [platformMode, roleDef, dbMenus, menusLoaded]);

  const activePath = useMemo(
    () => resolveActiveMenuPath(pathname, roleDef.slug, collectMenuLeafPaths(items)),
    [pathname, roleDef.slug, items]
  );

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-e border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-150",
        collapsed ? "w-16" : "w-64",
        className
      )}
    >
      <div className={cn("flex h-16 shrink-0 items-center border-b border-sidebar-border", collapsed ? "justify-center px-0" : "px-4")}>
        <TenantLogo branding={branding} size="sm" showName={!collapsed} markOnly={collapsed} />
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {items.map((item) =>
          item.children ? (
            <SidebarGroup
              key={item.key}
              item={item}
              slug={roleDef.slug}
              pathname={pathname}
              activePath={activePath}
              collapsed={collapsed}
              onNavigate={onNavigate}
              t={t}
              depth={0}
            />
          ) : (
            <SidebarLeaf
              key={item.key}
              item={item}
              slug={roleDef.slug}
              activePath={activePath}
              collapsed={collapsed}
              onNavigate={onNavigate}
              label={menuLabel(item, t)}
            />
          )
        )}
      </nav>

      {!mobile && (
        <div className="border-t border-sidebar-border p-2">
          <button
            type="button"
            onClick={toggleCollapsed}
            className={cn(
              "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              collapsed && "justify-center px-0"
            )}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4 shrink-0" /> : <PanelLeftClose className="h-4 w-4 shrink-0" />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      )}
    </aside>
  );
}

function flattenLeaves(items: MenuItem[]): MenuItem[] {
  return items.flatMap((item) => (item.children ? flattenLeaves(item.children) : [item]));
}

function groupContainsActivePath(items: MenuItem[], activePath: string | null): boolean {
  if (!activePath) return false;
  return items.some((child) =>
    child.children
      ? groupContainsActivePath(child.children, activePath)
      : child.path === activePath
  );
}

function SidebarGroup({
  item,
  slug,
  pathname,
  activePath,
  collapsed,
  onNavigate,
  t,
  depth,
}: {
  item: MenuItem;
  slug: string;
  pathname: string;
  activePath: string | null;
  collapsed: boolean;
  onNavigate?: () => void;
  t: (key: string) => string;
  depth: number;
}) {
  const children = item.children!;
  const isActiveGroup = groupContainsActivePath(children, activePath);
  const [open, setOpen] = useState(isActiveGroup);
  const GroupIcon = menuIcon(item.icon);

  useEffect(() => {
    if (isActiveGroup) setOpen(true);
  }, [isActiveGroup, pathname]);

  if (collapsed) {
    // Collapsed rail has no room for group headers — flatten nested leaves into tooltip icons.
    return (
      <>
        {flattenLeaves(children).map((child) => (
          <SidebarLeaf
            key={child.key}
            item={child}
            slug={slug}
            activePath={activePath}
            collapsed
            onNavigate={onNavigate}
            label={menuLabel(child, t)}
          />
        ))}
      </>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          depth > 0 && "py-1.5 text-[13px]",
          isActiveGroup ? "text-foreground" : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <GroupIcon className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate text-left">{menuLabel(item, t)}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div
          className={cn(
            "space-y-0.5 border-l border-sidebar-border py-0.5 pl-2.5",
            depth === 0 ? "ml-[1.15rem]" : "ml-3"
          )}
        >
          {children.map((child) =>
            child.children ? (
              <SidebarGroup
                key={child.key}
                item={child}
                slug={slug}
                pathname={pathname}
                activePath={activePath}
                collapsed={false}
                onNavigate={onNavigate}
                t={t}
                depth={depth + 1}
              />
            ) : (
              <SidebarLeaf
                key={child.key}
                item={child}
                slug={slug}
                activePath={activePath}
                collapsed={false}
                onNavigate={onNavigate}
                label={menuLabel(child, t)}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

function SidebarLeaf({
  item,
  slug,
  activePath,
  collapsed,
  onNavigate,
  label,
}: {
  item: MenuItem;
  slug: string;
  activePath: string | null;
  collapsed: boolean;
  onNavigate?: () => void;
  label: string;
}) {
  const href = menuItemHref(slug, item.path);
  const active = activePath != null && item.path === activePath;
  const Icon = menuIcon(item.icon);
  const linkClassName = cn(
    "flex items-center gap-3 rounded-md border-l-2 px-3 py-2 text-sm font-medium transition-colors",
    collapsed && "justify-center px-0",
    active
      ? "border-primary bg-primary/10 text-primary"
      : "border-transparent text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
  );

  const content = (
    <>
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </>
  );

  if (!collapsed) {
    return (
      <Link href={href} onClick={onNavigate} className={linkClassName}>
        {content}
      </Link>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger render={<Link href={href} onClick={onNavigate} className={linkClassName} />}>
        {content}
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
