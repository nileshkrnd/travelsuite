"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Megaphone,
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
  listPropertyContractPromotions,
  setPropertyContractPromotionActive,
  deletePropertyContractPromotion,
  PropertyContractPromotionApiError,
} from "@/lib/services/property-contract-promotions.service";
import { listPropertyContracts, PropertyContractsApiError } from "@/lib/services/property-contracts.service";
import type { PropertyContract } from "@/types";
import type { PropertyContractPromotion } from "@/types/property-contract-promotion";

/** Property-scoped contract promotions — all contracts for the selected property. */
export function PropertyContractPromotionsList({
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
  const [entries, setEntries] = useState<PropertyContractPromotion[]>([]);
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
      listPropertyContractPromotions({ tenantId, propertyId }),
      listPropertyContracts({ tenantId, propertyId }),
    ])
      .then(([promotionRows, contractRows]) => {
        if (!cancelled) {
          setEntries(promotionRows);
          setContracts(contractRows);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(
            err instanceof PropertyContractPromotionApiError || err instanceof PropertyContractsApiError
              ? err.message
              : "Failed to load promotions"
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
    const promByContract = new Map<number, PropertyContractPromotion[]>();
    for (const entry of entries) {
      const list = promByContract.get(entry.propertyContractId) ?? [];
      list.push(entry);
      promByContract.set(entry.propertyContractId, list);
    }

    return [...promByContract.entries()]
      .map(([contractId, rows]) => ({
        contract: contractMap.get(contractId),
        contractId,
        rows: rows.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0)),
      }))
      .filter((row) => row.contract)
      .sort((a, b) =>
        (a.contract!.contractName ?? "").localeCompare(b.contract!.contractName ?? "")
      );
  }, [entries, contracts]);

  async function toggleStatus(entry: PropertyContractPromotion) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      const saved = await setPropertyContractPromotionActive(
        entry.propertyContractPromotionKey,
        !entry.isActive,
        actorKey
      );
      setEntries((prev) =>
        prev.map((row) =>
          row.propertyContractPromotionKey === saved.propertyContractPromotionKey ? saved : row
        )
      );
      toast.success(saved.isActive ? "Promotion activated" : "Promotion deactivated");
    } catch (err) {
      toast.error(
        err instanceof PropertyContractPromotionApiError ? err.message : "Could not update status"
      );
    }
  }

  async function removeEntry(entry: PropertyContractPromotion) {
    if (!canDelete) return;
    if (!window.confirm(`Delete promotion "${entry.promotionName || entry.promotionCode}"?`)) return;
    try {
      await deletePropertyContractPromotion(entry.propertyContractPromotionKey);
      setEntries((prev) =>
        prev.filter(
          (row) => row.propertyContractPromotionKey !== entry.propertyContractPromotionKey
        )
      );
      toast.success("Promotion deleted");
    } catch (err) {
      toast.error(
        err instanceof PropertyContractPromotionApiError ? err.message : "Could not delete"
      );
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading promotions…</p>;
  }

  if (contracts.length === 0) {
    return (
      <EmptyState
        icon={FileSignature}
        tone="primary"
        heading="No contracts for this property"
        description="Create a property contract first, then define promotions from the contract or here."
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
        icon={Megaphone}
        tone="primary"
        heading="No promotions yet"
        description="Define early bird, stay & pay, and other offers scoped to room type and rate plan."
        action={
          canCreate ? (
            <Button
              nativeButton={false}
              render={
                <Link href={`/${role}/extranet/contracts/${contracts[0]!.propertyContractKey}/promotions/new`} />
              }
            >
              <Plus className="h-4 w-4" />
              Add promotion
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
                render={<Link href={`/${role}/extranet/contracts/${contractId}?tab=promotions`} />}
              >
                View contract
              </Button>
              {canCreate && (
                <Button
                  size="sm"
                  nativeButton={false}
                  render={<Link href={`/${role}/extranet/contracts/${contractId}/promotions/new`} />}
                >
                  <Plus className="h-4 w-4" />
                  Add promotion
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
                <TableHead>Rate plan</TableHead>
                <TableHead>Stackable</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((entry) => (
                <TableRow key={entry.propertyContractPromotionKey}>
                  <TableCell className="font-mono text-xs">{entry.promotionCode}</TableCell>
                  <TableCell>{entry.promotionName || "—"}</TableCell>
                  <TableCell>{entry.promotionTypeName ?? entry.promotionTypeCode ?? "—"}</TableCell>
                  <TableCell>{entry.roomName ?? entry.roomCode ?? "All rooms"}</TableCell>
                  <TableCell>{entry.ratePlanName ?? entry.ratePlanCode ?? "All plans"}</TableCell>
                  <TableCell>
                    <Badge variant={entry.isStackable ? "default" : "secondary"}>
                      {entry.isStackable ? "Yes" : "No"}
                    </Badge>
                  </TableCell>
                  <TableCell>{entry.priority}</TableCell>
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
                                  `/${role}/extranet/contracts/${contractId}/promotions/${entry.propertyContractPromotionKey}/edit`
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
