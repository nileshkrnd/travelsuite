"use client";

import Link from "next/link";
import { ChevronDown, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type ContractRateGroup,
  formatContractPeriodDate,
  formatRateAmount,
  rateCellAmount,
} from "@/lib/contract-rate-groups";

export function ContractRateGroupCard({
  group,
  currencyCode,
  matrixHref,
  canEdit,
  expanded,
  onToggle,
}: {
  group: ContractRateGroup;
  currencyCode?: string;
  matrixHref: string;
  canEdit: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const periodLabel =
    group.fromDate && group.toDate
      ? `${formatContractPeriodDate(group.fromDate)} → ${formatContractPeriodDate(group.toDate)}`
      : null;

  const summaryParts = [
    `${group.roomTypes.length} room type${group.roomTypes.length === 1 ? "" : "s"}`,
    `${group.ratePlans.length} meal plan${group.ratePlans.length === 1 ? "" : "s"}`,
    `${group.entries.length} rate${group.entries.length === 1 ? "" : "s"}`,
  ];

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-4">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-semibold text-foreground">{group.seasonName}</p>
              {group.inactiveCount > 0 ? (
                <Badge variant="secondary">
                  {group.activeCount} active · {group.inactiveCount} inactive
                </Badge>
              ) : (
                <Badge variant="default">All active</Badge>
              )}
            </div>
            {periodLabel && <p className="text-sm text-muted-foreground">Period {periodLabel}</p>}
            <p className="text-sm">
              <span className="font-medium text-foreground">{group.ratePlanTypeName}</span>
              {currencyCode ? (
                <span className="text-muted-foreground"> · Currency {currencyCode}</span>
              ) : null}
            </p>
            <p className="text-xs text-muted-foreground">{summaryParts.join(" · ")}</p>
            {group.mealPlanLabels.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {group.mealPlanLabels.join(" · ")}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {canEdit && (
              <Button size="sm" nativeButton={false} render={<Link href={matrixHref} />}>
                <Pencil className="h-3.5 w-3.5" />
                Open matrix
              </Button>
            )}
            <Button type="button" variant="outline" size="sm" onClick={onToggle}>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
              />
              {expanded ? "Hide" : "View"} rates
            </Button>
          </div>
        </div>

        {expanded && (
          <div className="overflow-x-auto px-4 py-4">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead rowSpan={2} className="min-w-[140px] align-bottom">
                    Room type
                  </TableHead>
                  {group.ratePlans.map((plan, idx) => (
                    <TableHead
                      key={plan.id}
                      colSpan={group.occupancies.length}
                      className={`text-center ${idx > 0 ? "border-l border-border" : ""}`}
                    >
                      {group.mealPlanLabels[idx] ?? plan.label}
                    </TableHead>
                  ))}
                </TableRow>
                <TableRow className="bg-muted/20">
                  {group.ratePlans.map((plan) =>
                    group.occupancies.map((occ) => (
                      <TableHead
                        key={`${plan.id}-${occ.id}`}
                        className="border-l border-border px-2 text-center text-xs font-medium"
                      >
                        {occ.short}
                      </TableHead>
                    ))
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.roomTypes.map((room) => (
                  <TableRow key={room.id}>
                    <TableCell className="font-medium">{room.name}</TableCell>
                    {group.ratePlans.map((plan) =>
                      group.occupancies.map((occ) => {
                        const amount = rateCellAmount(group.entries, plan.id, room.id, occ.id);
                        return (
                          <TableCell
                            key={`${plan.id}-${room.id}-${occ.id}`}
                            className="border-l border-border px-2 text-right font-mono text-sm tabular-nums"
                          >
                            {amount != null ? formatRateAmount(amount) : "—"}
                          </TableCell>
                        );
                      })
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
