"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { ICONS } from "@/lib/icon-registry";
import { getMenuForRole, type MenuItem } from "@/config/permissions";
import { useUiPrefsStore } from "@/lib/store/ui-prefs.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { TenantLogo } from "@/components/layout/TenantLogo";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import type { Role } from "@/types";

interface SidebarProps {
  role: Role;
  /** Rendered inside the mobile drawer: always full-width, no collapse toggle. */
  mobile?: boolean;
  className?: string;
  onNavigate?: () => void;
}

export function Sidebar({ role, mobile = false, className, onNavigate }: SidebarProps) {
  const t = useTranslations("sidebar");
  const pathname = usePathname();
  const branding = useTenantStore((s) => s.tenant.branding);
  const collapsed = useUiPrefsStore((s) => s.sidebarCollapsed) && !mobile;
  const toggleCollapsed = useUiPrefsStore((s) => s.toggleSidebarCollapsed);
  const items = getMenuForRole(role);

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
        {items.map((item) => {
          const href = `/${role}/${item.path}`;
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <SidebarNavLink
              key={item.key}
              item={item}
              href={href}
              active={active}
              collapsed={collapsed}
              label={t(item.key)}
              onNavigate={onNavigate}
            />
          );
        })}
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

function SidebarNavLink({
  item,
  href,
  active,
  collapsed,
  label,
  onNavigate,
}: {
  item: MenuItem;
  href: string;
  active: boolean;
  collapsed: boolean;
  label: string;
  onNavigate?: () => void;
}) {
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
