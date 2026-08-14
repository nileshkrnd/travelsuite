"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Baby,
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
  listPropertyContractChildPolicies,
  setPropertyContractChildPolicyActive,
  deletePropertyContractChildPolicy,
  PropertyContractChildPolicyApiError,
} from "@/lib/services/property-contract-child-policies.service";
import { listPropertyContracts, PropertyContractsApiError } from "@/lib/services/property-contracts.service";
import type { PropertyContract, PropertyContractChildPolicy } from "@/types";

function formatAgeBands(entry: PropertyContractChildPolicy): string {
  if (!entry.ageBands.length) return "—";
  return entry.ageBands
    .map((b) => {
      const type = b.childPolicyTypeName ?? b.childPolicyTypeCode ?? "—";
      const rate =
        b.rateValue != null && b.childPolicyTypeCode?.toUpperCase() === "SUPPLEMENT"
          ? ` (${b.rateValue})`
          : "";
      return `${b.fromAge}–${b.toAge}: ${type}${rate}`;
    })
    .join("; ");
}

/** Property-scoped child policies — all contracts for the selected property. */
export function PropertyContractChildPoliciesList({
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
  const [entries, setEntries] = useState<PropertyContractChildPolicy[]>([]);
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
      listPropertyContractChildPolicies({ tenantId, propertyId }),
      listPropertyContracts({ tenantId, propertyId }),
    ])
      .then(([policyRows, contractRows]) => {
        if (!cancelled) {
          setEntries(policyRows);
          setContracts(contractRows);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(
            err instanceof PropertyContractChildPolicyApiError || err instanceof PropertyContractsApiError
              ? err.message
              : "Failed to load child policies"
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
    const byId = new Map<number, PropertyContractChildPolicy[]>();
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
      .sort((a, b) =>
        (a.contract!.contractName ?? "").localeCompare(b.contract!.contractName ?? "")
      );
  }, [entries, contracts]);

  async function toggleStatus(entry: PropertyContractChildPolicy) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      const saved = await setPropertyContractChildPolicyActive(
        entry.propertyContractChildPolicyKey,
        !entry.isActive,
        actorKey
      );
      setEntries((prev) =>
        prev.map((row) =>
          row.propertyContractChildPolicyKey === saved.propertyContractChildPolicyKey ? saved : row
        )
      );
      toast.success(saved.isActive ? "Child policy activated" : "Child policy deactivated");
    } catch (err) {
      toast.error(
        err instanceof PropertyContractChildPolicyApiError ? err.message : "Could not update status"
      );
    }
  }

  async function removeEntry(entry: PropertyContractChildPolicy) {
    if (!canDelete) return;
    const label = entry.roomName ?? entry.roomCode ?? "all rooms";
    if (!window.confirm(`Delete child policy for ${label}?`)) return;
    try {
      await deletePropertyContractChildPolicy(entry.propertyContractChildPolicyKey);
      setEntries((prev) =>
        prev.filter((row) => row.propertyContractChildPolicyKey !== entry.propertyContractChildPolicyKey)
      );
      toast.success("Child policy deleted");
    } catch (err) {
      toast.error(
        err instanceof PropertyContractChildPolicyApiError ? err.message : "Could not delete"
      );
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading child policies…</p>;
  }

  if (contracts.length === 0) {
    return (
      <EmptyState
        icon={FileSignature}
        tone="primary"
        heading="No contracts for this property"
        description="Create a property contract first, then define child policies from the contract or here."
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
        icon={Baby}
        tone="primary"
        heading="No child policies yet"
        description="Define how children are priced and whether they count toward room occupancy."
        action={
          canCreate ? (
            <Button
              nativeButton={false}
              render={
                <Link
                  href={`/${role}/extranet/contracts/${contracts[0]!.propertyContractKey}/child-policies/new`}
                />
              }
            >
              <Plus className="h-4 w-4" />
              Add child policy
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
                render={<Link href={`/${role}/extranet/contracts/${contractId}?tab=child-policies`} />}
              >
                View contract
              </Button>
              {canCreate && (
                <Button
                  size="sm"
                  nativeButton={false}
                  render={<Link href={`/${role}/extranet/contracts/${contractId}/child-policies/new`} />}
                >
                  <Plus className="h-4 w-4" />
                  Add child policy
                </Button>
              )}
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Room</TableHead>
                <TableHead className="text-right">Max children</TableHead>
                <TableHead>Counts in occupancy</TableHead>
                <TableHead>Age bands</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((entry) => (
                <TableRow key={entry.propertyContractChildPolicyKey}>
                  <TableCell>{entry.roomName ?? entry.roomCode ?? "All rooms"}</TableCell>
                  <TableCell className="text-right tabular-nums">{entry.maxChild}</TableCell>
                  <TableCell>{entry.childCountsInOccupancy ? "Yes" : "No"}</TableCell>
                  <TableCell className="max-w-xs truncate text-xs" title={formatAgeBands(entry)}>
                    {formatAgeBands(entry)}
                  </TableCell>
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
                                  `/${role}/extranet/contracts/${contractId}/child-policies/${entry.propertyContractChildPolicyKey}/edit`
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
