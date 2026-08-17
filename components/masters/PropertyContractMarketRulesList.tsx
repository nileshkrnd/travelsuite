"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Globe, Plus, Pencil, Power, PowerOff, Trash2, MoreHorizontal, FileSignature } from "lucide-react";
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
import { listPropertyContracts, PropertyContractsApiError } from "@/lib/services/property-contracts.service";
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

/** Property-scoped market rules — all contracts for the selected property. */
export function PropertyContractMarketRulesList({
  tenantId,
  propertyId,
  canEdit,
  canCreate,
  canDelete,
}: {
  tenantId: number;
  propertyId: number;
  canEdit: boolean;
  canCreate: boolean;
  canDelete: boolean;
}) {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();
  const sessionUser = useSessionStore((s) => s.user);
  const actorKey = sessionUser?.userKey ?? 0;
  const [entries, setEntries] = useState<PropertyContractMarketRule[]>([]);
  const [contracts, setContracts] = useState<PropertyContract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tenantId <= 0 || propertyId <= 0) {
      setEntries([]);
      setContracts([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      listPropertyContractMarketRules({ tenantId, propertyId }),
      listPropertyContracts({ tenantId, propertyId }),
    ])
      .then(([ruleRows, contractRows]) => {
        if (!cancelled) {
          setEntries(ruleRows);
          setContracts(contractRows);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(
            err instanceof PropertyContractMarketRuleApiError || err instanceof PropertyContractsApiError
              ? err.message
              : "Failed to load market rules"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId, propertyId]);

  const byContract = useMemo(() => {
    const contractMap = new Map(contracts.map((c) => [c.propertyContractKey, c]));
    const byId = new Map<number, PropertyContractMarketRule[]>();
    for (const entry of entries) {
      const list = byId.get(entry.propertyContractId) ?? [];
      list.push(entry);
      byId.set(entry.propertyContractId, list);
    }

    return [...byId.entries()]
      .map(([contractId, rows]) => ({
        contract: contractMap.get(contractId),
        contractId,
        rows,
      }))
      .filter((row) => row.contract)
      .sort((a, b) => (a.contract!.contractName ?? "").localeCompare(b.contract!.contractName ?? ""));
  }, [entries, contracts]);

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

  async function removeEntry(entry: PropertyContractMarketRule) {
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

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading market rules…</p>;
  }

  if (contracts.length === 0) {
    return (
      <EmptyState
        icon={FileSignature}
        tone="primary"
        heading="No contracts for this property"
        description="Create a property contract first, then define market rules from the contract or here."
        action={
          canCreate ? (
            <Button nativeButton={false} render={<Link href={`/${role}/extranet/contracts`} />}>
              <Plus className="h-4 w-4" />
              Go to contracts
            </Button>
          ) : undefined
        }
      />
    );
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={Globe}
        tone="primary"
        heading="No market rules yet"
        description="Restrict or open supplier contracts to specific source markets."
        action={
          canCreate ? (
            <Button
              nativeButton={false}
              render={<Link href={`/${role}/extranet/contracts/${contracts[0]!.propertyContractKey}/market-rules/new`} />}
            >
              <Plus className="h-4 w-4" />
              Add market rule
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-8">
      {byContract.map(({ contract, contractId, rows }) => (
        <Card key={contractId} className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground">{contract!.contractName}</p>
              <p className="text-sm text-muted-foreground">{contract!.contractNumber}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<Link href={`/${role}/extranet/contracts/${contractId}?tab=market-rules`} />}
              >
                View contract
              </Button>
              {canCreate && (
                <Button
                  size="sm"
                  nativeButton={false}
                  render={<Link href={`/${role}/extranet/contracts/${contractId}/market-rules/new`} />}
                >
                  <Plus className="h-4 w-4" />
                  Add market rule
                </Button>
              )}
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rule</TableHead>
                <TableHead>Market type</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Valid</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((entry) => (
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
                  <TableCell className="text-right">
                    {(canEdit || canDelete) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canEdit && (
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(
                                  `/${role}/extranet/contracts/${contractId}/market-rules/${entry.propertyContractMarketRuleKey}/edit`
                                )
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
                            <DropdownMenuItem variant="destructive" onClick={() => void removeEntry(entry)}>
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
        </Card>
      ))}
    </div>
  );
}
