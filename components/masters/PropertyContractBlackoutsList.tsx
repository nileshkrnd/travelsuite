"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarOff,
  Plus,
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
  listPropertyContractBlackouts,
  setPropertyContractBlackoutActive,
  deletePropertyContractBlackout,
  PropertyContractBlackoutApiError,
} from "@/lib/services/property-contract-blackouts.service";
import { listPropertyContracts, PropertyContractsApiError } from "@/lib/services/property-contracts.service";
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

/** Property-scoped contract blackouts — all contracts for the selected property. */
export function PropertyContractBlackoutsList({
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
  const [entries, setEntries] = useState<PropertyContractBlackout[]>([]);
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
      listPropertyContractBlackouts({ tenantId, propertyId }),
      listPropertyContracts({ tenantId, propertyId }),
    ])
      .then(([blackoutRows, contractRows]) => {
        if (!cancelled) {
          setEntries(blackoutRows);
          setContracts(contractRows);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(
            err instanceof PropertyContractBlackoutApiError || err instanceof PropertyContractsApiError
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
  }, [tenantId, propertyId]);

  const byContract = useMemo(() => {
    const contractMap = new Map(contracts.map((c) => [c.propertyContractKey, c]));
    const blackoutByContract = new Map<number, PropertyContractBlackout[]>();
    for (const entry of entries) {
      const list = blackoutByContract.get(entry.propertyContractId) ?? [];
      list.push(entry);
      blackoutByContract.set(entry.propertyContractId, list);
    }

    return [...blackoutByContract.entries()]
      .map(([contractId, rows]) => ({
        contract: contractMap.get(contractId),
        contractId,
        rows: rows.sort((a, b) => a.fromDate.localeCompare(b.fromDate)),
      }))
      .filter((row) => row.contract)
      .sort((a, b) =>
        (a.contract!.contractName ?? "").localeCompare(b.contract!.contractName ?? "")
      );
  }, [entries, contracts]);

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

  async function removeEntry(entry: PropertyContractBlackout) {
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

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading blackouts…</p>;
  }

  if (contracts.length === 0) {
    return (
      <EmptyState
        icon={FileSignature}
        tone="primary"
        heading="No contracts for this property"
        description="Create a property contract first, then define blackouts from the contract or here."
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
        icon={CalendarOff}
        tone="primary"
        heading="No blackouts yet"
        description="Define date ranges that cannot be booked under supplier contracts."
        action={
          canCreate ? (
            <Button
              nativeButton={false}
              render={
                <Link href={`/${role}/extranet/contracts/${contracts[0]!.propertyContractKey}/blackouts/new`} />
              }
            >
              <Plus className="h-4 w-4" />
              Add blackout
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
                render={<Link href={`/${role}/extranet/contracts/${contractId}?tab=blackouts`} />}
              >
                View contract
              </Button>
              {canCreate && (
                <Button
                  size="sm"
                  nativeButton={false}
                  render={<Link href={`/${role}/extranet/contracts/${contractId}/blackouts/new`} />}
                >
                  <Plus className="h-4 w-4" />
                  Add blackout
                </Button>
              )}
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((entry) => (
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
                                  `/${role}/extranet/contracts/${contractId}/blackouts/${entry.propertyContractBlackoutKey}/edit`
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
