"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Undo2,
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
  listPropertyContractCancellationPolicies,
  setPropertyContractCancellationPolicyActive,
  deletePropertyContractCancellationPolicy,
  PropertyContractCancellationPolicyApiError,
} from "@/lib/services/property-contract-cancellation-policies.service";
import { listPropertyContracts, PropertyContractsApiError } from "@/lib/services/property-contracts.service";
import type { PropertyContract, PropertyContractCancellationPolicy } from "@/types";

function formatRules(entry: PropertyContractCancellationPolicy): string {
  if (!entry.rules.length) return "—";
  return entry.rules
    .map((r) => {
      const type = r.cancellationPolicyTypeName ?? r.cancellationPolicyTypeCode ?? "—";
      const window =
        r.toDaysBefore != null ? `${r.fromDaysBefore}–${r.toDaysBefore} days` : `${r.fromDaysBefore}+ days`;
      const penalty =
        r.cancellationPolicyTypeCode?.toUpperCase() === "NO_PENALTY" ||
        r.cancellationPolicyTypeCode?.toUpperCase() === "FULL_AMOUNT"
          ? ""
          : ` (${r.penaltyValue})`;
      return `${window}: ${type}${penalty}`;
    })
    .join("; ");
}

/** Property-scoped cancellation policies — all contracts for the selected property. */
export function PropertyContractCancellationPoliciesList({
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
  const [entries, setEntries] = useState<PropertyContractCancellationPolicy[]>([]);
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
      listPropertyContractCancellationPolicies({ tenantId, propertyId }),
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
            err instanceof PropertyContractCancellationPolicyApiError ||
              err instanceof PropertyContractsApiError
              ? err.message
              : "Failed to load cancellation policies"
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
    const byId = new Map<number, PropertyContractCancellationPolicy[]>();
    for (const entry of entries) {
      const list = byId.get(entry.propertyContractId) ?? [];
      list.push(entry);
      byId.set(entry.propertyContractId, list);
    }

    return [...byId.entries()]
      .map(([contractId, rows]) => ({
        contract: contractMap.get(contractId),
        contractId,
        rows: rows.sort((a, b) => a.policyCode.localeCompare(b.policyCode)),
      }))
      .filter((row) => row.contract)
      .sort((a, b) =>
        (a.contract!.contractName ?? "").localeCompare(b.contract!.contractName ?? "")
      );
  }, [entries, contracts]);

  async function toggleStatus(entry: PropertyContractCancellationPolicy) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      const saved = await setPropertyContractCancellationPolicyActive(
        entry.propertyContractCancellationPolicyKey,
        !entry.isActive,
        actorKey
      );
      setEntries((prev) =>
        prev.map((row) =>
          row.propertyContractCancellationPolicyKey === saved.propertyContractCancellationPolicyKey
            ? saved
            : row
        )
      );
      toast.success(saved.isActive ? "Cancellation policy activated" : "Cancellation policy deactivated");
    } catch (err) {
      toast.error(
        err instanceof PropertyContractCancellationPolicyApiError
          ? err.message
          : "Could not update status"
      );
    }
  }

  async function removeEntry(entry: PropertyContractCancellationPolicy) {
    if (!canDelete) return;
    if (!window.confirm(`Delete cancellation policy "${entry.policyName}"?`)) return;
    try {
      await deletePropertyContractCancellationPolicy(entry.propertyContractCancellationPolicyKey);
      setEntries((prev) =>
        prev.filter(
          (row) =>
            row.propertyContractCancellationPolicyKey !== entry.propertyContractCancellationPolicyKey
        )
      );
      toast.success("Cancellation policy deleted");
    } catch (err) {
      toast.error(
        err instanceof PropertyContractCancellationPolicyApiError ? err.message : "Could not delete"
      );
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading cancellation policies…</p>;
  }

  if (contracts.length === 0) {
    return (
      <EmptyState
        icon={FileSignature}
        tone="primary"
        heading="No contracts for this property"
        description="Create a property contract first, then define cancellation policies from the contract or here."
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
        icon={Undo2}
        tone="primary"
        heading="No cancellation policies yet"
        description="Define penalty windows for cancellations on supplier contracts."
        action={
          canCreate ? (
            <Button
              nativeButton={false}
              render={
                <Link
                  href={`/${role}/extranet/contracts/${contracts[0]!.propertyContractKey}/cancellation-policies/new`}
                />
              }
            >
              <Plus className="h-4 w-4" />
              Add cancellation policy
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
                render={<Link href={`/${role}/extranet/contracts/${contractId}?tab=cancellation-policies`} />}
              >
                View contract
              </Button>
              {canCreate && (
                <Button
                  size="sm"
                  nativeButton={false}
                  render={
                    <Link href={`/${role}/extranet/contracts/${contractId}/cancellation-policies/new`} />
                  }
                >
                  <Plus className="h-4 w-4" />
                  Add cancellation policy
                </Button>
              )}
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Rate plan</TableHead>
                <TableHead>Rules</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((entry) => (
                <TableRow key={entry.propertyContractCancellationPolicyKey}>
                  <TableCell className="font-mono text-xs">{entry.policyCode}</TableCell>
                  <TableCell>{entry.policyName}</TableCell>
                  <TableCell>{entry.roomName ?? entry.roomCode ?? "All rooms"}</TableCell>
                  <TableCell>{entry.ratePlanName ?? entry.ratePlanCode ?? "All plans"}</TableCell>
                  <TableCell className="max-w-xs truncate text-xs" title={formatRules(entry)}>
                    {formatRules(entry)}
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
                                  `/${role}/extranet/contracts/${contractId}/cancellation-policies/${entry.propertyContractCancellationPolicyKey}/edit`
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
