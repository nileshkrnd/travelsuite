"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CircleOff,
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
  listPropertyContractStopSales,
  setPropertyContractStopSaleActive,
  deletePropertyContractStopSale,
  PropertyContractStopSaleApiError,
} from "@/lib/services/property-contract-stop-sales.service";
import { listPropertyContracts, PropertyContractsApiError } from "@/lib/services/property-contracts.service";
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

/** Property-scoped contract stop sales — all contracts for the selected property. */
export function PropertyContractStopSalesList({
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
  const [entries, setEntries] = useState<PropertyContractStopSale[]>([]);
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
      listPropertyContractStopSales({ tenantId, propertyId }),
      listPropertyContracts({ tenantId, propertyId }),
    ])
      .then(([stopSaleRows, contractRows]) => {
        if (!cancelled) {
          setEntries(stopSaleRows);
          setContracts(contractRows);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(
            err instanceof PropertyContractStopSaleApiError || err instanceof PropertyContractsApiError
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
  }, [tenantId, propertyId]);

  const byContract = useMemo(() => {
    const contractMap = new Map(contracts.map((c) => [c.propertyContractKey, c]));
    const stopByContract = new Map<number, PropertyContractStopSale[]>();
    for (const entry of entries) {
      const list = stopByContract.get(entry.propertyContractId) ?? [];
      list.push(entry);
      stopByContract.set(entry.propertyContractId, list);
    }

    return [...stopByContract.entries()]
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

  async function removeEntry(entry: PropertyContractStopSale) {
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

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading stop sales…</p>;
  }

  if (contracts.length === 0) {
    return (
      <EmptyState
        icon={FileSignature}
        tone="primary"
        heading="No contracts for this property"
        description="Create a property contract first, then define stop sales from the contract or here."
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
        icon={CircleOff}
        tone="primary"
        heading="No stop sales yet"
        description="Define date ranges when inventory should be closed for sale."
        action={
          canCreate ? (
            <Button
              nativeButton={false}
              render={
                <Link href={`/${role}/extranet/contracts/${contracts[0]!.propertyContractKey}/stop-sales/new`} />
              }
            >
              <Plus className="h-4 w-4" />
              Add stop sale
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
                render={<Link href={`/${role}/extranet/contracts/${contractId}?tab=stop-sales`} />}
              >
                View contract
              </Button>
              {canCreate && (
                <Button
                  size="sm"
                  nativeButton={false}
                  render={<Link href={`/${role}/extranet/contracts/${contractId}/stop-sales/new`} />}
                >
                  <Plus className="h-4 w-4" />
                  Add stop sale
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
                                  `/${role}/extranet/contracts/${contractId}/stop-sales/${entry.propertyContractStopSaleKey}/edit`
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
