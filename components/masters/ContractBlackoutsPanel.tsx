"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarOff, Plus, Pencil, Power, PowerOff, Trash2, MoreHorizontal } from "lucide-react";
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
  listPropertyContractBlackouts,
  setPropertyContractBlackoutActive,
  deletePropertyContractBlackout,
  PropertyContractBlackoutApiError,
} from "@/lib/services/property-contract-blackouts.service";
import type { PropertyContract } from "@/types";
import type { PropertyContractBlackout } from "@/types/property-contract-blackout";

function formatScope(entry: PropertyContractBlackout): string {
  const typeCode = entry.blackoutTypeCode?.toUpperCase() ?? "";
  if (typeCode === "PROPERTY") return "Entire property";
  if (typeCode === "ROOM_TYPE") return entry.roomName ?? entry.roomCode ?? "Room type";
  if (typeCode === "RATE_PLAN") return entry.ratePlanName ?? entry.ratePlanCode ?? "Rate plan";
  if (typeCode === "ROOM_RATE_PLAN") {
    const room = entry.roomName ?? entry.roomCode ?? "Room";
    const plan = entry.ratePlanName ?? entry.ratePlanCode ?? "Plan";
    return `${room} · ${plan}`;
  }
  return entry.blackoutTypeName ?? "—";
}

export function ContractBlackoutsPanel({
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
  const [entries, setEntries] = useState<PropertyContractBlackout[]>([]);
  const [loading, setLoading] = useState(true);

  const base = `/${role}/extranet/contracts/${contract.propertyContractKey}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listPropertyContractBlackouts({ propertyContractId: contract.propertyContractKey })
      .then((rows) => {
        if (!cancelled) setEntries(rows);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(
            err instanceof PropertyContractBlackoutApiError
              ? err.message
              : "Failed to load blackouts"
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

  async function toggleStatus(entry: PropertyContractBlackout) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      const saved = await setPropertyContractBlackoutActive(
        entry.propertyContractBlackoutKey,
        !entry.isActive,
        actorKey
      );
      setEntries((prev) =>
        prev.map((row) =>
          row.propertyContractBlackoutKey === saved.propertyContractBlackoutKey ? saved : row
        )
      );
      toast.success(saved.isActive ? "Blackout activated" : "Blackout deactivated");
    } catch (err) {
      toast.error(
        err instanceof PropertyContractBlackoutApiError ? err.message : "Could not update status"
      );
    }
  }

  async function remove(entry: PropertyContractBlackout) {
    if (!canDelete) return;
    const label = `${entry.fromDate} – ${entry.toDate}`;
    if (!window.confirm(`Delete blackout "${label}"?`)) return;
    try {
      await deletePropertyContractBlackout(entry.propertyContractBlackoutKey);
      setEntries((prev) =>
        prev.filter((row) => row.propertyContractBlackoutKey !== entry.propertyContractBlackoutKey)
      );
      toast.success("Blackout deleted");
    } catch (err) {
      toast.error(
        err instanceof PropertyContractBlackoutApiError ? err.message : "Could not delete"
      );
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <h3 className="text-sm font-medium">Blackouts</h3>
          <p className="text-xs text-muted-foreground">
            Close dates for peak periods, events, and contract restrictions by property, room, or rate plan.
          </p>
        </div>
        {canCreate && (
          <Button nativeButton={false} render={<Link href={`${base}/blackouts/new`} />}>
            <Plus className="h-4 w-4" />
            Add blackout
          </Button>
        )}
      </div>

      {loading ? (
        <p className="p-6 text-sm text-muted-foreground">Loading blackouts…</p>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={CalendarOff}
          tone="muted"
          heading="No blackouts yet"
          description="Define date ranges that cannot be booked under this contract."
          action={
            canCreate ? (
              <Button nativeButton={false} render={<Link href={`${base}/blackouts/new`} />}>
                <Plus className="h-4 w-4" />
                Add blackout
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
              <TableRow key={entry.propertyContractBlackoutKey}>
                <TableCell>{entry.blackoutTypeName ?? entry.blackoutTypeCode ?? "—"}</TableCell>
                <TableCell>{formatScope(entry)}</TableCell>
                <TableCell className="font-mono text-xs">{entry.fromDate}</TableCell>
                <TableCell className="font-mono text-xs">{entry.toDate}</TableCell>
                <TableCell>{entry.blackoutReasonName ?? entry.blackoutReasonCode ?? "—"}</TableCell>
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
                                `${base}/blackouts/${entry.propertyContractBlackoutKey}/edit`
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
