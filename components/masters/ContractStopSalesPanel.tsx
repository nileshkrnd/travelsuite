"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { CircleOff, Plus, Pencil, Power, PowerOff, Trash2, MoreHorizontal } from "lucide-react";
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
  listPropertyContractStopSales,
  setPropertyContractStopSaleActive,
  deletePropertyContractStopSale,
  PropertyContractStopSaleApiError,
} from "@/lib/services/property-contract-stop-sales.service";
import type { PropertyContract } from "@/types";
import type { PropertyContractStopSale } from "@/types/property-contract-stop-sale";

function formatScope(entry: PropertyContractStopSale): string {
  const typeCode = entry.stopSaleTypeCode?.toUpperCase() ?? "";
  if (typeCode === "PROPERTY") return "Entire property";
  if (typeCode === "ROOM_TYPE") return entry.roomName ?? entry.roomCode ?? "Room type";
  if (typeCode === "RATE_PLAN") return entry.ratePlanName ?? entry.ratePlanCode ?? "Rate plan";
  if (typeCode === "ROOM_RATE_PLAN") {
    const room = entry.roomName ?? entry.roomCode ?? "Room";
    const plan = entry.ratePlanName ?? entry.ratePlanCode ?? "Plan";
    return `${room} · ${plan}`;
  }
  return entry.stopSaleTypeName ?? "—";
}

export function ContractStopSalesPanel({
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
  const [entries, setEntries] = useState<PropertyContractStopSale[]>([]);
  const [loading, setLoading] = useState(true);

  const base = `/${role}/extranet/contracts/${contract.propertyContractKey}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listPropertyContractStopSales({ propertyContractId: contract.propertyContractKey })
      .then((rows) => {
        if (!cancelled) setEntries(rows);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(
            err instanceof PropertyContractStopSaleApiError
              ? err.message
              : "Failed to load stop sales"
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

  async function toggleStatus(entry: PropertyContractStopSale) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      const saved = await setPropertyContractStopSaleActive(
        entry.propertyContractStopSaleKey,
        !entry.isActive,
        actorKey
      );
      setEntries((prev) =>
        prev.map((row) =>
          row.propertyContractStopSaleKey === saved.propertyContractStopSaleKey ? saved : row
        )
      );
      toast.success(saved.isActive ? "Stop sale activated" : "Stop sale deactivated");
    } catch (err) {
      toast.error(
        err instanceof PropertyContractStopSaleApiError ? err.message : "Could not update status"
      );
    }
  }

  async function remove(entry: PropertyContractStopSale) {
    if (!canDelete) return;
    const label = `${entry.fromDate} – ${entry.toDate}`;
    if (!window.confirm(`Delete stop sale "${label}"?`)) return;
    try {
      await deletePropertyContractStopSale(entry.propertyContractStopSaleKey);
      setEntries((prev) =>
        prev.filter((row) => row.propertyContractStopSaleKey !== entry.propertyContractStopSaleKey)
      );
      toast.success("Stop sale deleted");
    } catch (err) {
      toast.error(
        err instanceof PropertyContractStopSaleApiError ? err.message : "Could not delete"
      );
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <h3 className="text-sm font-medium">Stop sales</h3>
          <p className="text-xs text-muted-foreground">
            Block inventory for the property, room types, rate plans, or specific combinations.
          </p>
        </div>
        {canCreate && (
          <Button nativeButton={false} render={<Link href={`${base}/stop-sales/new`} />}>
            <Plus className="h-4 w-4" />
            Add stop sale
          </Button>
        )}
      </div>

      {loading ? (
        <p className="p-6 text-sm text-muted-foreground">Loading stop sales…</p>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={CircleOff}
          tone="muted"
          heading="No stop sales yet"
          description="Define date ranges when inventory should be closed for sale."
          action={
            canCreate ? (
              <Button nativeButton={false} render={<Link href={`${base}/stop-sales/new`} />}>
                <Plus className="h-4 w-4" />
                Add stop sale
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.propertyContractStopSaleKey}>
                <TableCell>{entry.stopSaleTypeName ?? entry.stopSaleTypeCode ?? "—"}</TableCell>
                <TableCell>{formatScope(entry)}</TableCell>
                <TableCell className="font-mono text-xs">{entry.fromDate}</TableCell>
                <TableCell className="font-mono text-xs">{entry.toDate}</TableCell>
                <TableCell>{entry.stopSaleReasonName ?? entry.stopSaleReasonCode ?? "—"}</TableCell>
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
                              router.push(
                                `${base}/stop-sales/${entry.propertyContractStopSaleKey}/edit`
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
