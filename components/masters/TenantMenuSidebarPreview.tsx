"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { ICONS } from "@/lib/icon-registry";
import { toSidebarMenuItems } from "@/lib/subscription-module-menu-tree";
import type { MenuItem } from "@/config/permissions";
import type { SubscriptionModuleMenu } from "@/types";

function PreviewGroup({ item, depth = 0 }: { item: MenuItem; depth?: number }) {
  const [open, setOpen] = useState(depth < 1);
  const Icon = ICONS[item.icon] ?? Layers;
  const children = item.children ?? [];
  const label = item.label ?? item.key;

  if (children.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground",
          depth > 0 && "py-1.5 text-[13px]"
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{label}</span>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-foreground",
          depth > 0 && "py-1.5 text-[13px]"
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate text-left">{label}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div
          className={cn(
            "space-y-0.5 border-l border-sidebar-border py-0.5 pl-2.5",
            depth === 0 ? "ml-[1.15rem]" : "ml-3"
          )}
        >
          {children.map((child) => (
            <PreviewGroup key={child.key} item={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Read-only sidebar preview: DB menu trees only (no module-name wrapper on top).
 */
export function TenantMenuSidebarPreview({
  tenantName,
  menus,
}: {
  tenantName: string;
  menus: SubscriptionModuleMenu[];
}) {
  const items = useMemo(() => toSidebarMenuItems(menus), [menus]);

  return (
    <div className="flex h-full min-h-[28rem] flex-col overflow-hidden rounded-lg border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sm">
      <div className="border-b border-sidebar-border px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Tenant sidebar preview
        </p>
        <p className="truncate text-sm font-semibold">{tenantName}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Module menus only (as they appear in the tenant sidebar)
        </p>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {items.length === 0 ? (
          <p className="px-3 py-8 text-center text-xs text-muted-foreground">
            No menus for this tenant. Grant Module Access and ensure those modules have menus
            configured.
          </p>
        ) : (
          items.map((item) => <PreviewGroup key={item.key} item={item} />)
        )}
      </nav>
    </div>
  );
}
