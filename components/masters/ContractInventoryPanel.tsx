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
import type { PropertyContract, PropertyContractInventory } from "@/types";

function seasonLabel(entry: PropertyContractInventory) {
  const season = entry.seasonName ?? entry.seasonCode ?? "Season";
  if (entry.fromDate && entry.toDate) return `${season} (${entry.fromDate} → ${entry.toDate})`;
  return season;
}

/** Contract inventory list scoped to one property contract. */
export function ContractInventoryPanel({
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
  const [entries, setEntries] = useState<PropertyContractInventory[]>([]);
  const [loading, setLoading] = useState(true);

  const base = `/${role}/extranet/contracts/${contract.propertyContractKey}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listPropertyContractInventories({ propertyContractId: contract.propertyContractKey })
      .then((rows) => {
        if (!cancelled) setEntries(rows);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(
            err instanceof PropertyContractInventoryApiError
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
  }, [contract.propertyContractKey]);

  const grouped = useMemo(() => {
    const map = new Map<string, PropertyContractInventory[]>();
    for (const entry of entries) {
      const key = String(entry.propertyContractSeasonPeriodId);
      const list = map.get(key) ?? [];
      list.push(entry);
      map.set(key, list);
    }
    return [...map.entries()].map(([seasonPeriodId, rows]) => ({
      seasonPeriodId: Number(seasonPeriodId),
      label: seasonLabel(rows[0]!),
      rows: rows.sort((a, b) => (a.roomName ?? a.roomCode ?? "").localeCompare(b.roomName ?? b.roomCode ?? "")),
    }));
  }, [entries]);

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">Contract inventory</p>
          <p className="text-sm text-muted-foreground">
            Allotment, release days, and stop-sell rules by season and room type.
          </p>
        </div>
        {(canCreate || canEdit) && (
          <Button nativeButton={false} render={<Link href={`${base}/inventory/new`} />}>
            <Plus className="h-4 w-4" />
            Add inventory
          </Button>
        )}
      </div>

      {grouped.length === 0 ? (
        <EmptyState
          icon={Boxes}
          tone="primary"
          heading="No contract inventory yet"
          description="Define allotment or free-sale inventory per season period and room type."
          action={
            (canCreate || canEdit) ? (
              <Button nativeButton={false} render={<Link href={`${base}/inventory/new`} />}>
                <Plus className="h-4 w-4" />
                Add inventory
              </Button>
            ) : undefined
          }
        />
      ) : (
        grouped.map((group) => (
          <Card key={group.seasonPeriodId}>
            <div className="border-b px-4 py-3">
              <p className="text-sm font-medium">{group.label}</p>
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
                                router.push(`${base}/inventory/${entry.propertyContractInventoryKey}/edit`)
                              }
                            >
                              <Pencil className="h-4 w-4" />
                              Modify
                            </DropdownMenuItem>
                          )}
                          {canEdit && (
                            <DropdownMenuItem onClick={() => void toggleStatus(entry)}>
                              {entry.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
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
        ))
      )}
    </div>
  );
}
