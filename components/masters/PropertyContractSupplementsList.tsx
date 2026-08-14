"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  PlusCircle,
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
  listPropertyContractSupplements,
  setPropertyContractSupplementActive,
  deletePropertyContractSupplement,
  PropertyContractSupplementApiError,
} from "@/lib/services/property-contract-supplements.service";
import { listPropertyContracts, PropertyContractsApiError } from "@/lib/services/property-contracts.service";
import type { PropertyContract, PropertyContractSupplement } from "@/types";

/** Property-scoped contract supplements — all contracts for the selected property. */
export function PropertyContractSupplementsList({
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
  const [entries, setEntries] = useState<PropertyContractSupplement[]>([]);
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
      listPropertyContractSupplements({ tenantId, propertyId }),
      listPropertyContracts({ tenantId, propertyId }),
    ])
      .then(([supplementRows, contractRows]) => {
        if (!cancelled) {
          setEntries(supplementRows);
          setContracts(contractRows);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(
            err instanceof PropertyContractSupplementApiError || err instanceof PropertyContractsApiError
              ? err.message
              : "Failed to load contract supplements"
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
    const supByContract = new Map<number, PropertyContractSupplement[]>();
    for (const entry of entries) {
      const list = supByContract.get(entry.propertyContractId) ?? [];
      list.push(entry);
      supByContract.set(entry.propertyContractId, list);
    }

    return [...supByContract.entries()]
      .map(([contractId, rows]) => ({
        contract: contractMap.get(contractId),
        contractId,
        rows: rows.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)),
      }))
      .filter((row) => row.contract)
      .sort((a, b) =>
        (a.contract!.contractName ?? "").localeCompare(b.contract!.contractName ?? "")
      );
  }, [entries, contracts]);

  async function toggleStatus(entry: PropertyContractSupplement) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      const saved = await setPropertyContractSupplementActive(
        entry.propertyContractSupplementKey,
        !entry.isActive,
        actorKey
      );
      setEntries((prev) =>
        prev.map((r) =>
          r.propertyContractSupplementKey === saved.propertyContractSupplementKey ? saved : r
        )
      );
      toast.success(saved.isActive ? "Supplement activated" : "Supplement deactivated");
    } catch (err) {
      toast.error(
        err instanceof PropertyContractSupplementApiError ? err.message : "Could not update status"
      );
    }
  }

  async function removeEntry(entry: PropertyContractSupplement) {
    if (!window.confirm(`Delete supplement "${entry.supplementName}"?`)) return;
    try {
      await deletePropertyContractSupplement(entry.propertyContractSupplementKey);
      setEntries((prev) =>
        prev.filter((r) => r.propertyContractSupplementKey !== entry.propertyContractSupplementKey)
      );
      toast.success("Supplement deleted");
    } catch (err) {
      toast.error(err instanceof PropertyContractSupplementApiError ? err.message : "Could not delete");
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading contract supplements…</p>;
  }

  if (contracts.length === 0) {
    return (
      <EmptyState
        icon={FileSignature}
        tone="primary"
        heading="No contracts for this property"
        description="Create a property contract first, then define supplements from the contract or here."
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
        icon={PlusCircle}
        tone="primary"
        heading="No contract supplements yet"
        description="Define extra bed, meal, gala dinner, and other add-ons with periods and age bands."
        action={
          canCreate ? (
            <Button
              nativeButton={false}
              render={
                <Link href={`/${role}/extranet/contracts/${contracts[0]!.propertyContractKey}/supplements/new`} />
              }
            >
              <Plus className="h-4 w-4" />
              Add supplement
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
                render={<Link href={`/${role}/extranet/contracts/${contractId}?tab=supplements`} />}
              >
                View contract
              </Button>
              {canCreate && (
                <Button
                  size="sm"
                  nativeButton={false}
                  render={<Link href={`/${role}/extranet/contracts/${contractId}/supplements/new`} />}
                >
                  <Plus className="h-4 w-4" />
                  Add supplement
                </Button>
              )}
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Basis</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((entry) => (
                <TableRow key={entry.propertyContractSupplementKey}>
                  <TableCell className="font-mono text-xs">{entry.supplementCode}</TableCell>
                  <TableCell>{entry.supplementName}</TableCell>
                  <TableCell>{entry.supplementTypeName ?? entry.supplementTypeCode}</TableCell>
                  <TableCell>{entry.roomName ?? entry.roomCode ?? "All rooms"}</TableCell>
                  <TableCell>{entry.rateBasisName ?? entry.rateBasisCode}</TableCell>
                  <TableCell className="text-right tabular-nums">{entry.amount}</TableCell>
                  <TableCell>
                    <Badge variant={entry.isActive ? "default" : "secondary"}>
                      {entry.isMandatory ? "Mandatory" : "Optional"}
                      {!entry.isActive && " · Inactive"}
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
                                  `/${role}/extranet/contracts/${contractId}/supplements/${entry.propertyContractSupplementKey}/edit`
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
