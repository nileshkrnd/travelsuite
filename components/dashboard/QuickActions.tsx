"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ICONS } from "@/lib/icon-registry";
import { flatMenuItems } from "@/config/permissions";
import { getQuickActions } from "@/config/quickActions";
import type { RoleDef } from "@/types";

export function QuickActions({ roleDef }: { roleDef: RoleDef }) {
  const actions = getQuickActions(roleDef);
  if (actions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => {
        const Icon = ICONS[action.icon];
        const menuItem = flatMenuItems().find((m) => m.key === action.module);
        if (!menuItem) return null;
        return (
          <Button key={action.label} nativeButton={false} render={<Link href={`/${roleDef.slug}/${menuItem.path}`} />}>
            <Icon className="h-4 w-4" />
            {action.label}
          </Button>
        );
      })}
    </div>
  );
}
