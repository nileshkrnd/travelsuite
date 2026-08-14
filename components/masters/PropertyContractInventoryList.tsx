"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  Boxes,
  Pencil,
  Power,
  PowerOff,
  Trash2,
  MoreHorizontal,
  FileSignature,
} from "lucide-react";
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
  listPropertyContractInventories,
  setPropertyContractInventoryActive,
  deletePropertyContractInventory,
  PropertyContractInventoryApiError,
} from "@/lib/services/property-contract-inventories.service";
import { listPropertyContracts, PropertyContractsApiError } from "@/lib/services/property-contracts.service";
import type { PropertyContract, PropertyContractInventory } from "@/types";

function seasonLabel(entry: PropertyContractInventory) {
  const season = entry.seasonName ?? entry.seasonCode ?? "Season";
  if (entry.fromDate && entry.toDate) return `${season} (${entry.fromDate} → ${entry.toDate})`;
  return season;
}

/** Property-scoped contract inventory — all contracts for the selected property. */
export function PropertyContractInventoryList({
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
  const [entries, setEntries] = useState<PropertyContractInventory[]>([]);
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
      listPropertyContractInventories({ tenantId, propertyId }),
      listPropertyContracts({ tenantId, propertyId }),
    ])
      .then(([inventoryRows, contractRows]) => {
        if (!cancelled) {
          setEntries(inventoryRows);
          setContracts(contractRows);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(
            err instanceof PropertyContractInventoryApiError || err instanceof PropertyContractsApiError
              ? err.message
              : "Failed to load contract inventory"
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
    const invByContract = new Map<number, PropertyContractInventory[]>();
    for (const entry of entries) {
      const list = invByContract.get(entry.propertyContractId) ?? [];
      list.push(entry);
      invByContract.set(entry.propertyContractId, list);
    }

    return [...invByContract.entries()]
      .map(([contractId, rows]) => {
        const seasonMap = new Map<string, PropertyContractInventory[]>();
        for (const row of rows) {
          const key = String(row.propertyContractSeasonPeriodId);
          const list = seasonMap.get(key) ?? [];
          list.push(row);
          seasonMap.set(key, list);
        }
        return {
          contract: contractMap.get(contractId),
          contractId,
          seasons: [...seasonMap.entries()].map(([seasonPeriodId, seasonRows]) => ({
            seasonPeriodId: Number(seasonPeriodId),
            label: seasonLabel(seasonRows[0]!),
            rows: seasonRows.sort((a, b) =>
              (a.roomName ?? a.roomCode ?? "").localeCompare(b.roomName ?? b.roomCode ?? "")
            ),
          })),
        };
      })
      .filter((row) => row.contract)
      .sort((a, b) =>
        (a.contract!.contractName ?? "").localeCompare(b.contract!.contractName ?? "")
      );
  }, [entries, contracts]);

  function matrixHref(contractId: number, seasonPeriodId?: number) {
    const base = `/${role}/extranet/contracts/${contractId}/inventory/new`;
    if (!seasonPeriodId) return base;
    return `${base}?seasonPeriodId=${seasonPeriodId}`;
  }

  async function toggleStatus(entry: PropertyContractInventory) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      const saved = await setPropertyContractInventoryActive(
        entry.propertyContractInventoryKey,
        !entry.isActive,
        actorKey
      );
      setEntries((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
      toast.success(saved.isActive ? "Inventory activated" : "Inventory deactivated");
    } catch (error) {
      toast.error(
        error instanceof PropertyContractInventoryApiError ? error.message : "Could not update status"
      );
    }
  }

  async function removeEntry(entry: PropertyContractInventory) {
    try {
      await deletePropertyContractInventory(entry.propertyContractInventoryKey);
      setEntries((prev) => prev.filter((r) => r.id !== entry.id));
      toast.success("Inventory removed");
    } catch (error) {
      toast.error(
        error instanceof PropertyContractInventoryApiError ? error.message : "Could not remove inventory"
      );
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading contract inventory…</p>;
  }

  if (contracts.length === 0) {
    return (
      <EmptyState
        icon={FileSignature}
        tone="primary"
        heading="No contracts for this property"
        description="Create a property contract first, then define inventory from the contract or here."
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
        icon={Boxes}
        tone="primary"
        heading="No contract inventory yet"
        description="Define allotment, release days, and stop-sell rules by season and room type."
        action={
          canCreate || canEdit ? (
            <Button
              nativeButton={false}
              render={<Link href={matrixHref(contracts[0]!.propertyContractKey)} />}
            >
              <Plus className="h-4 w-4" />
              Enter inventory
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-8">
      {byContract.map(({ contract, contractId, seasons }) => (
        <div key={contractId} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
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
                render={<Link href={`/${role}/extranet/contracts/${contractId}?tab=inventory`} />}
              >
                View contract
              </Button>
              {(canCreate || canEdit) && (
                <Button size="sm" nativeButton={false} render={<Link href={matrixHref(contractId)} />}>
                  <Plus className="h-4 w-4" />
                  Enter inventory
                </Button>
              )}
            </div>
          </div>

          {seasons.map((group) => (
            <Card key={group.seasonPeriodId}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
                <p className="text-sm font-medium">{group.label}</p>
                {(canCreate || canEdit) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    nativeButton={false}
                    render={<Link href={matrixHref(contractId, group.seasonPeriodId)} />}
                  >
                    Open matrix
                  </Button>
                )}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Room type</TableHead>
                    <TableHead>Inventory type</TableHead>
                    <TableHead className="text-right">Allotment</TableHead>
                    <TableHead className="text-right">Release days</TableHead>
                    <TableHead>Flags</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-20 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.rows.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <div className="font-medium">{entry.roomName ?? entry.roomCode}</div>
                        <div className="text-xs text-muted-foreground">{entry.roomCode}</div>
                      </TableCell>
                      <TableCell>{entry.inventoryTypeName ?? entry.inventoryTypeCode}</TableCell>
                      <TableCell className="text-right tabular-nums">{entry.allotmentQty}</TableCell>
                      <TableCell className="text-right tabular-nums">{entry.releaseDays}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {entry.isStopSell && <Badge variant="destructive">Stop sell</Badge>}
                          {entry.isClosed && <Badge variant="secondary">Closed</Badge>}
                          {!entry.isStopSell && !entry.isClosed && (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={entry.isActive ? "default" : "secondary"}>
                          {entry.isActive ? "active" : "inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canEdit && (
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(
                                    `/${role}/extranet/contracts/${contractId}/inventory/${entry.propertyContractInventoryKey}/edit`
                                  )
                                }
                              >
                                <Pencil className="h-4 w-4" />
                                Modify
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
                              <DropdownMenuItem onClick={() => void removeEntry(entry)}>
                                <Trash2 className="h-4 w-4" />
                                Remove
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ))}
        </div>
      ))}
    </div>
  );
}
