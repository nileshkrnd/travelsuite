"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type SortDirection = "asc" | "desc";

export function SortableTableHead<TKey extends string>({
  sortKey,
  activeKey,
  direction,
  onSort,
  className,
  children,
}: {
  sortKey: TKey;
  activeKey: TKey | null;
  direction: SortDirection;
  onSort: (key: TKey) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const isActive = activeKey === sortKey;
  const Icon = isActive ? (direction === "asc" ? ArrowUp : ArrowDown) : ChevronsUpDown;

  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1 hover:text-foreground",
          isActive ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {children}
        <Icon className="h-3.5 w-3.5" />
      </button>
    </TableHead>
  );
}
