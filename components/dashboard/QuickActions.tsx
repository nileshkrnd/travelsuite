"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ICONS } from "@/lib/icon-registry";
import { MENU_ITEMS } from "@/config/permissions";
import { QUICK_ACTIONS } from "@/config/quickActions";
import type { Role } from "@/types";

export function QuickActions({ role }: { role: Role }) {
  const actions = QUICK_ACTIONS[role] ?? [];
  if (actions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => {
        const Icon = ICONS[action.icon];
        const menuItem = MENU_ITEMS.find((m) => m.key === action.module);
        if (!menuItem) return null;
        return (
          <Button key={action.label} render={<Link href={`/${role}/${menuItem.path}`} />}>
            <Icon className="h-4 w-4" />
            {action.label}
          </Button>
        );
      })}
    </div>
  );
}
