"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelativeTime } from "@/lib/utils";
import { ICONS } from "@/lib/icon-registry";
import { MENU_ITEMS } from "@/config/permissions";
import type { ActivityItem } from "@/types";

function iconForModule(module: string) {
  const menuItem = MENU_ITEMS.find((m) => m.key === module);
  return (menuItem && ICONS[menuItem.icon]) || ICONS.LayoutDashboard;
}

export function ActivityFeed({ items, loading }: { items: ActivityItem[]; loading?: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No recent activity</p>
        ) : (
          items.map((item) => {
            const Icon = iconForModule(item.module);
            return (
              <div key={item.id} className="flex items-start gap-3 py-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    <span className="font-medium text-foreground">{item.actorName}</span>{" "}
                    <span className="text-muted-foreground">{item.action}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{formatRelativeTime(item.timestamp)}</p>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
