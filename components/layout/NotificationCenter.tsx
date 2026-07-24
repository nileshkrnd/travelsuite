"use client";

import { useMemo, useState } from "react";
import { Bell } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  time: string;
  unread: boolean;
}

const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "n1",
    title: "Booking confirmation pending",
    body: "BK-48291 needs supplier confirmation within 2 hours.",
    time: "12m ago",
    unread: true,
  },
  {
    id: "n2",
    title: "Leave request submitted",
    body: "Priya Sharma requested 3 days annual leave.",
    time: "1h ago",
    unread: true,
  },
  {
    id: "n3",
    title: "Invoice overdue",
    body: "INV-1092 for TravelWise Agency is 7 days overdue.",
    time: "3h ago",
    unread: true,
  },
  {
    id: "n4",
    title: "Rate update published",
    body: "Grand Piazza Hotel updated BAR rates for Aug–Sep.",
    time: "Yesterday",
    unread: false,
  },
  {
    id: "n5",
    title: "QC queue cleared",
    body: "All mid-office QC items for today were processed.",
    time: "Yesterday",
    unread: false,
  },
];

export function NotificationCenter() {
  const t = useTranslations("topbar");
  const [items, setItems] = useState(MOCK_NOTIFICATIONS);
  const unreadCount = useMemo(() => items.filter((n) => n.unread).length, [items]);

  function markAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, unread: false })));
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" aria-label={t("notifications")} className="relative" />
        }
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 end-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
            {unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center justify-between gap-2 px-3 py-2.5">
            <span>{t("notifications")}</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs font-medium text-primary hover:underline"
              >
                Mark all read
              </button>
            )}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="m-0" />
        <div className="max-h-80 overflow-y-auto">
          {items.map((item) => (
            <DropdownMenuItem
              key={item.id}
              className={cn(
                "flex cursor-default flex-col items-start gap-0.5 rounded-none px-3 py-2.5",
                item.unread && "bg-primary/5"
              )}
              onClick={() =>
                setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, unread: false } : n)))
              }
            >
              <div className="flex w-full items-center justify-between gap-2">
                <p className="truncate text-sm font-medium">{item.title}</p>
                {item.unread && <Badge variant="default" className="h-5 px-1.5 text-[10px]">New</Badge>}
              </div>
              <p className="line-clamp-2 text-xs text-muted-foreground">{item.body}</p>
              <p className="text-[11px] text-muted-foreground/80">{item.time}</p>
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
