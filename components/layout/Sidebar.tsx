"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronDown, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { ICONS } from "@/lib/icon-registry";
import { getMenuForRole, type MenuItem } from "@/config/permissions";
import { useUiPrefsStore } from "@/lib/store/ui-prefs.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { TenantLogo } from "@/components/layout/TenantLogo";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import type { RoleDef } from "@/types";

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
  const branding = useTenantStore((s) => s.tenant.branding);
  const collapsed = useUiPrefsStore((s) => s.sidebarCollapsed) && !mobile;
  const toggleCollapsed = useUiPrefsStore((s) => s.toggleSidebarCollapsed);
  const items = getMenuForRole(roleDef);

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-e border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-150",
        collapsed ? "w-16" : "w-64",
        className
      )}
    >
      <div className={cn("flex h-16 shrink-0 items-center border-b border-sidebar-border", collapsed ? "justify-center px-0" : "px-4")}>
        <TenantLogo branding={branding} size="sm" showName={!collapsed} />
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {items.map((item) =>
          item.children ? (
            <SidebarGroup
              key={item.key}
              item={item}
              slug={roleDef.slug}
              pathname={pathname}
              collapsed={collapsed}
              onNavigate={onNavigate}
              t={t}
            />
          ) : (
            <SidebarLeaf
              key={item.key}
              item={item}
              slug={roleDef.slug}
              pathname={pathname}
              collapsed={collapsed}
              onNavigate={onNavigate}
              label={t(item.key)}
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

function itemHref(slug: string, item: MenuItem) {
  return `/${slug}/${item.path}`;
}

function isItemActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarGroup({
  item,
  slug,
  pathname,
  collapsed,
  onNavigate,
  t,
}: {
  item: MenuItem;
  slug: string;
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
  t: (key: string) => string;
}) {
  const children = item.children!;
  const isActiveGroup = children.some((child) => isItemActive(pathname, itemHref(slug, child)));
  const [open, setOpen] = useState(isActiveGroup);
  const GroupIcon = ICONS[item.icon];

  if (collapsed) {
    // Collapsed rail has no room for a group header — flatten children into their own tooltip icons.
    return (
      <>
        {children.map((child) => (
          <SidebarLeaf
            key={child.key}
            item={child}
            slug={slug}
            pathname={pathname}
            collapsed
            onNavigate={onNavigate}
            label={t(child.key)}
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
          isActiveGroup ? "text-foreground" : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <GroupIcon className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate text-left">{t(item.key)}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="ml-[1.15rem] space-y-0.5 border-l border-sidebar-border py-0.5 pl-2.5">
          {children.map((child) => (
            <SidebarLeaf
              key={child.key}
              item={child}
              slug={slug}
              pathname={pathname}
              collapsed={false}
              onNavigate={onNavigate}
              label={t(child.key)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SidebarLeaf({
  item,
  slug,
  pathname,
  collapsed,
  onNavigate,
  label,
}: {
  item: MenuItem;
  slug: string;
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
  label: string;
}) {
  const href = itemHref(slug, item);
  const active = isItemActive(pathname, href);
  const Icon = ICONS[item.icon];
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
