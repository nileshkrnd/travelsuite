"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Landmark, Plus, Pencil, Power, PowerOff, Trash2, MoreHorizontal, FileSignature } from "lucide-react";
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
  listPropertyContractTaxes,
  setPropertyContractTaxActive,
  deletePropertyContractTax,
  PropertyContractTaxApiError,
} from "@/lib/services/property-contract-taxes.service";
import { listPropertyContracts, PropertyContractsApiError } from "@/lib/services/property-contracts.service";
import type { PropertyContract, PropertyContractTax } from "@/types";

function rateLabel(entry: PropertyContractTax): string {
  if (entry.calculationType === "PERCENTAGE") return `${entry.taxRate ?? 0}%`;
  return `${entry.currencyCode ?? ""} ${entry.taxAmount ?? 0}`.trim();
}

/** Property-scoped contract taxes — all contracts for the selected property. */
export function PropertyContractTaxesList({
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
  const [entries, setEntries] = useState<PropertyContractTax[]>([]);
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
      listPropertyContractTaxes({ tenantId, propertyId }),
      listPropertyContracts({ tenantId, propertyId }),
    ])
      .then(([taxRows, contractRows]) => {
        if (!cancelled) {
          setEntries(taxRows);
          setContracts(contractRows);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(
            err instanceof PropertyContractTaxApiError || err instanceof PropertyContractsApiError
              ? err.message
              : "Failed to load taxes"
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
    const byId = new Map<number, PropertyContractTax[]>();
    for (const entry of entries) {
      const list = byId.get(entry.propertyContractId) ?? [];
      list.push(entry);
      byId.set(entry.propertyContractId, list);
    }

    return [...byId.entries()]
      .map(([contractId, rows]) => ({
        contract: contractMap.get(contractId),
        contractId,
        rows: rows.sort((a, b) => a.sequenceNo - b.sequenceNo),
      }))
      .filter((row) => row.contract)
      .sort((a, b) => (a.contract!.contractName ?? "").localeCompare(b.contract!.contractName ?? ""));
  }, [entries, contracts]);

  async function toggleStatus(entry: PropertyContractTax) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      const saved = await setPropertyContractTaxActive(entry.propertyContractTaxKey, !entry.isActive, actorKey);
      setEntries((prev) =>
        prev.map((row) => (row.propertyContractTaxKey === saved.propertyContractTaxKey ? saved : row))
      );
      toast.success(saved.isActive ? "Tax activated" : "Tax deactivated");
    } catch (err) {
      toast.error(err instanceof PropertyContractTaxApiError ? err.message : "Could not update status");
    }
  }

  async function removeEntry(entry: PropertyContractTax) {
    if (!canDelete) return;
    if (!window.confirm(`Delete "${entry.taxName}" from this contract?`)) return;
    try {
      await deletePropertyContractTax(entry.propertyContractTaxKey);
      setEntries((prev) => prev.filter((row) => row.propertyContractTaxKey !== entry.propertyContractTaxKey));
      toast.success("Contract tax deleted");
    } catch (err) {
      toast.error(err instanceof PropertyContractTaxApiError ? err.message : "Could not delete");
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading taxes…</p>;
  }

  if (contracts.length === 0) {
    return (
      <EmptyState
        icon={FileSignature}
        tone="primary"
        heading="No contracts for this property"
        description="Create a property contract first, then assign taxes from the contract or here."
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
        icon={Landmark}
        tone="primary"
        heading="No taxes yet"
        description="Assign taxes to supplier contracts for this property."
        action={
          canCreate ? (
            <Button
              nativeButton={false}
              render={<Link href={`/${role}/extranet/contracts/${contracts[0]!.propertyContractKey}/taxes/new`} />}
            >
              <Plus className="h-4 w-4" />
              Add tax
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
                render={<Link href={`/${role}/extranet/contracts/${contractId}?tab=taxes`} />}
              >
                View contract
              </Button>
              {canCreate && (
                <Button
                  size="sm"
                  nativeButton={false}
                  render={<Link href={`/${role}/extranet/contracts/${contractId}/taxes/new`} />}
                >
                  <Plus className="h-4 w-4" />
                  Add tax
                </Button>
              )}
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Seq</TableHead>
                <TableHead>Tax</TableHead>
                <TableHead>Rate / Amount</TableHead>
                <TableHead>Basis</TableHead>
                <TableHead>Valid</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((entry) => (
                <TableRow key={entry.propertyContractTaxKey}>
                  <TableCell className="text-sm text-muted-foreground">{entry.sequenceNo}</TableCell>
                  <TableCell>
                    <div className="font-medium">{entry.taxName}</div>
                    {entry.taxCode && (
                      <div className="font-mono text-xs text-muted-foreground">{entry.taxCode}</div>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{rateLabel(entry)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{entry.applicationBasis}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {entry.toDate ? `${entry.fromDate} → ${entry.toDate}` : `From ${entry.fromDate}`}
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
                                  `/${role}/extranet/contracts/${contractId}/taxes/${entry.propertyContractTaxKey}/edit`
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
