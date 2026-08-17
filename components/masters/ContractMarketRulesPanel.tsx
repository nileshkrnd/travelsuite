"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Globe, Plus, Pencil, Power, PowerOff, Trash2, MoreHorizontal } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSessionStore } from "@/lib/store/session.store";
import {
  listPropertyContractMarketRules,
  setPropertyContractMarketRuleActive,
  deletePropertyContractMarketRule,
  PropertyContractMarketRuleApiError,
} from "@/lib/services/property-contract-market-rules.service";
import type { PropertyContract, PropertyContractMarketRule } from "@/types";

function scopeLabel(entry: PropertyContractMarketRule): string {
  switch (entry.marketTypeCode) {
    case "COUNTRY":
      return entry.countryName ?? "—";
    case "REGION":
      return entry.regionName ?? "—";
    case "CITY":
      return entry.cityName ?? "—";
    case "MARKET_GROUP":
      return entry.marketGroupName ?? "—";
    default:
      return "—";
  }
}

function dateRangeLabel(entry: PropertyContractMarketRule): string {
  if (!entry.fromDate && !entry.toDate) return "Always";
  if (entry.fromDate && entry.toDate) return `${entry.fromDate} → ${entry.toDate}`;
  if (entry.fromDate) return `From ${entry.fromDate}`;
  return `Until ${entry.toDate}`;
}

export function ContractMarketRulesPanel({
  contract,
  canEdit,
  canCreate,
  canDelete,
}: {
  contract: PropertyContract;
  canEdit: boolean;
  canCreate: boolean;
  canDelete: boolean;
}) {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();
  const sessionUser = useSessionStore((s) => s.user);
  const actorKey = sessionUser?.userKey ?? 0;
  const [entries, setEntries] = useState<PropertyContractMarketRule[]>([]);
  const [loading, setLoading] = useState(true);

  const base = `/${role}/extranet/contracts/${contract.propertyContractKey}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listPropertyContractMarketRules({ propertyContractId: contract.propertyContractKey })
      .then((rows) => {
        if (!cancelled) setEntries(rows);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(
            err instanceof PropertyContractMarketRuleApiError ? err.message : "Failed to load market rules"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [contract.propertyContractKey]);

  async function toggleStatus(entry: PropertyContractMarketRule) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      const saved = await setPropertyContractMarketRuleActive(
        entry.propertyContractMarketRuleKey,
        !entry.isActive,
        actorKey
      );
      setEntries((prev) =>
        prev.map((row) => (row.propertyContractMarketRuleKey === saved.propertyContractMarketRuleKey ? saved : row))
      );
      toast.success(saved.isActive ? "Market rule activated" : "Market rule deactivated");
    } catch (err) {
      toast.error(err instanceof PropertyContractMarketRuleApiError ? err.message : "Could not update status");
    }
  }

  async function remove(entry: PropertyContractMarketRule) {
    if (!canDelete) return;
    if (!window.confirm(`Delete this ${entry.ruleType.toLowerCase()} rule for ${scopeLabel(entry)}?`)) return;
    try {
      await deletePropertyContractMarketRule(entry.propertyContractMarketRuleKey);
      setEntries((prev) => prev.filter((row) => row.propertyContractMarketRuleKey !== entry.propertyContractMarketRuleKey));
      toast.success("Market rule deleted");
    } catch (err) {
      toast.error(err instanceof PropertyContractMarketRuleApiError ? err.message : "Could not delete");
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <h3 className="text-sm font-medium">Market rules</h3>
          <p className="text-xs text-muted-foreground">
            Include or exclude this contract for specific countries, regions, cities, or market groups.
          </p>
        </div>
        {canCreate && (
          <Button nativeButton={false} render={<Link href={`${base}/market-rules/new`} />}>
            <Plus className="h-4 w-4" />
            Add market rule
          </Button>
        )}
      </div>

      {loading ? (
        <p className="p-6 text-sm text-muted-foreground">Loading market rules…</p>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={Globe}
          tone="muted"
          heading="No market rules yet"
          description="Restrict or open this contract to specific source markets."
          action={
            canCreate ? (
              <Button nativeButton={false} render={<Link href={`${base}/market-rules/new`} />}>
                <Plus className="h-4 w-4" />
                Add market rule
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rule</TableHead>
              <TableHead>Market type</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Valid</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.propertyContractMarketRuleKey}>
                <TableCell>
                  <Badge variant={entry.ruleType === "INCLUDE" ? "default" : "destructive"}>
                    {entry.ruleType === "INCLUDE" ? "Include" : "Exclude"}
                  </Badge>
                </TableCell>
                <TableCell>{entry.marketTypeName ?? entry.marketTypeCode ?? "—"}</TableCell>
                <TableCell>{scopeLabel(entry)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{dateRangeLabel(entry)}</TableCell>
                <TableCell>
                  <Badge variant={entry.isActive ? "default" : "secondary"}>
                    {entry.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {(canEdit || canDelete) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canEdit && (
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`${base}/market-rules/${entry.propertyContractMarketRuleKey}/edit`)
                            }
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        {canEdit && (
                          <DropdownMenuItem onClick={() => void toggleStatus(entry)}>
                            {entry.isActive ? (
                              <PowerOff className="h-4 w-4" />
                            ) : (
                              <Power className="h-4 w-4" />
                            )}
                            {entry.isActive ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <DropdownMenuItem variant="destructive" onClick={() => void remove(entry)}>
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
