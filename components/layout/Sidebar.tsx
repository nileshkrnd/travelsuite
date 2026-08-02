"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronDown, PanelLeftClose, PanelLeftOpen, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { ICONS } from "@/lib/icon-registry";
import { type MenuItem } from "@/config/permissions";
import { useUiPrefsStore } from "@/lib/store/ui-prefs.store";
import { useChromeBranding } from "@/lib/hooks/useChromeBranding";
import { useWorkspaceMenus } from "@/lib/hooks/useWorkspaceMenus";
import { TenantLogo } from "@/components/layout/TenantLogo";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  collectMenuLeafPaths,
  menuItemHref,
  resolveActiveMenuPath,
} from "@/lib/menu-active-path";
import { normalizeMenuUrl } from "@/lib/normalize-menu-url";
import type { RoleDef } from "@/types";

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
  const params = useParams<{ role?: string }>();
  const roleSlug = typeof params.role === "string" && params.role ? params.role : roleDef.slug;
  const branding = useChromeBranding();
  const collapsed = useUiPrefsStore((s) => s.sidebarCollapsed) && !mobile;
  const toggleCollapsed = useUiPrefsStore((s) => s.toggleSidebarCollapsed);
  const { items, menusLoaded, hasModuleAccess } = useWorkspaceMenus(roleDef);

  const activePath = useMemo(
    () => resolveActiveMenuPath(pathname, roleSlug, collectMenuLeafPaths(items)),
    [pathname, roleSlug, items]
  );

  return (
    <aside
      className={cn(
        "group/sidebar relative flex h-full flex-col border-e border-sidebar-border bg-sidebar text-sidebar-foreground",
        "transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
        collapsed ? "w-16" : "w-72",
        className
      )}
    >
      <div
        className={cn(
          "relative flex h-16 shrink-0 items-center border-b border-sidebar-border",
          "after:pointer-events-none after:absolute after:inset-x-3 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-sidebar-border after:to-transparent",
          collapsed ? "justify-center px-0" : "px-4"
        )}
      >
        <TenantLogo
          branding={branding}
          size="sm"
          showName={!collapsed}
          markOnly={collapsed}
          linkHome
        />
      </div>

      <nav
        className={cn(
          "relative flex-1 space-y-0.5 overflow-x-hidden overflow-y-auto p-2",
          "scroll-smooth [scrollbar-width:thin] [scrollbar-color:var(--sidebar-border)_transparent]"
        )}
      >
        {menusLoaded && !hasModuleAccess && !collapsed ? (
          <p className="animate-in fade-in-0 slide-in-from-top-1 px-3 py-4 text-xs leading-relaxed text-muted-foreground duration-300">
            No modules subscribed yet. Request to subscribe for your preferred module.
          </p>
        ) : null}
        {items.map((item) =>
          item.children ? (
            <SidebarGroup
              key={item.key}
              item={item}
              slug={roleSlug}
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
              slug={roleSlug}
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
              "group/collapse flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
              "text-muted-foreground transition-all duration-200 ease-out",
              "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              "active:scale-[0.98] motion-reduce:active:scale-100",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/60",
              collapsed && "justify-center px-0"
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover/collapse:translate-x-0.5" />
            ) : (
              <PanelLeftClose className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover/collapse:-translate-x-0.5" />
            )}
            <span
              className={cn(
                "overflow-hidden whitespace-nowrap transition-all duration-300",
                collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
              )}
            >
              Collapse
            </span>
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
      : normalizeMenuUrl(child.path) === activePath
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
    <div className="group/nav-section">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          "group/nav-group relative flex w-full items-start gap-2.5 rounded-lg px-3 py-2 text-sm font-medium",
          "transition-all duration-200 ease-out motion-reduce:transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/60",
          "active:scale-[0.99] motion-reduce:active:scale-100",
          depth > 0 && "py-1.5 text-[13px]",
          isActiveGroup
            ? "bg-sidebar-accent/70 text-foreground"
            : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          open && !isActiveGroup && "bg-sidebar-accent/40 text-foreground"
        )}
      >
        <span
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition-all duration-200",
            isActiveGroup || open
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground group-hover/nav-group:bg-sidebar-accent group-hover/nav-group:text-sidebar-accent-foreground"
          )}
        >
          <GroupIcon className="h-3.5 w-3.5 transition-transform duration-200 group-hover/nav-group:scale-110" />
        </span>
        <span className="min-w-0 flex-1 whitespace-normal break-words text-left leading-snug">
          {menuLabel(item, t)}
        </span>
        <ChevronDown
          className={cn(
            "mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
            open && "rotate-180 text-foreground"
          )}
        />
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={cn(
              "relative mt-0.5 space-y-0.5 border-s border-sidebar-border/80 py-0.5 ps-2.5",
              "before:absolute before:start-0 before:top-1 before:bottom-1 before:w-px before:bg-gradient-to-b before:from-primary/30 before:via-sidebar-border before:to-transparent",
              depth === 0 ? "ms-[1.15rem]" : "ms-3",
              open
                ? "opacity-100 translate-y-0"
                : "opacity-0 -translate-y-1 motion-reduce:translate-y-0",
              "transition-all duration-300 ease-out motion-reduce:transition-none"
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
        </div>
      </div>
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
  const menuPath = normalizeMenuUrl(item.path);
  const href = menuItemHref(slug, menuPath);
  const active = activePath != null && menuPath === activePath;
  const Icon = menuIcon(item.icon);
  const linkClassName = cn(
    "group/leaf relative flex rounded-lg text-sm font-medium",
    "transition-all duration-200 ease-out motion-reduce:transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/60",
    "active:scale-[0.99] motion-reduce:active:scale-100",
    collapsed ? "items-center justify-center px-0 py-2.5" : "items-start gap-2.5 px-3 py-2",
    active
      ? "bg-primary/10 text-primary shadow-[inset_0_0_0_1px] shadow-primary/10"
      : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:translate-x-0.5 rtl:hover:-translate-x-0.5 motion-reduce:hover:translate-x-0"
  );

  const content = (
    <>
      {!collapsed && (
        <span
          aria-hidden
          className={cn(
            "absolute start-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-e-full bg-primary",
            "transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
            active ? "opacity-100 scale-y-100" : "opacity-0 scale-y-50"
          )}
        />
      )}
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-md transition-all duration-200",
          collapsed ? "h-8 w-8" : "mt-0.5 h-5 w-5",
          active
            ? collapsed
              ? "bg-primary/15 text-primary"
              : "text-primary"
            : "group-hover/leaf:text-sidebar-accent-foreground"
        )}
      >
        <Icon
          className={cn(
            "shrink-0 transition-transform duration-200 ease-out",
            collapsed ? "h-4 w-4" : "h-3.5 w-3.5",
            "group-hover/leaf:scale-110",
            active && "scale-105"
          )}
        />
      </span>
      {!collapsed && (
        <span className="min-w-0 flex-1 whitespace-normal break-words leading-snug transition-colors duration-200">
          {label}
        </span>
      )}
      {active && !collapsed && (
        <span
          aria-hidden
          className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary animate-pulse motion-reduce:animate-none"
        />
      )}
    </>
  );

  if (!menuPath) {
    return null;
  }

  if (!collapsed) {
    return (
      <Link href={href} onClick={onNavigate} className={linkClassName} aria-current={active ? "page" : undefined}>
        {content}
      </Link>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Link
            href={href}
            onClick={onNavigate}
            className={linkClassName}
            aria-current={active ? "page" : undefined}
          />
        }
      >
        {content}
      </TooltipTrigger>
      <TooltipContent side="right" className="font-medium">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
