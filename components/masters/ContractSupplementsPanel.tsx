"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, PlusCircle, Pencil, Power, PowerOff, Trash2, MoreHorizontal } from "lucide-react";
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
import type { PropertyContract, PropertyContractSupplement } from "@/types";

/** Contract supplements list scoped to one property contract. */
export function ContractSupplementsPanel({
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
  const [entries, setEntries] = useState<PropertyContractSupplement[]>([]);
  const [loading, setLoading] = useState(true);

  const base = `/${role}/extranet/contracts/${contract.propertyContractKey}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listPropertyContractSupplements({ propertyContractId: contract.propertyContractKey })
      .then((rows) => {
        if (!cancelled) setEntries(rows);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(
            err instanceof PropertyContractSupplementApiError
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
  }, [contract.propertyContractKey]);

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
        prev.map((row) =>
          row.propertyContractSupplementKey === saved.propertyContractSupplementKey ? saved : row
        )
      );
      toast.success(saved.isActive ? "Supplement activated" : "Supplement deactivated");
    } catch (err) {
      toast.error(
        err instanceof PropertyContractSupplementApiError ? err.message : "Could not update status"
      );
    }
  }

  async function remove(entry: PropertyContractSupplement) {
    if (!canDelete) return;
    if (!window.confirm(`Delete supplement "${entry.supplementName}"?`)) return;
    try {
      await deletePropertyContractSupplement(entry.propertyContractSupplementKey);
      setEntries((prev) =>
        prev.filter((row) => row.propertyContractSupplementKey !== entry.propertyContractSupplementKey)
      );
      toast.success("Supplement deleted");
    } catch (err) {
      toast.error(err instanceof PropertyContractSupplementApiError ? err.message : "Could not delete");
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <h3 className="text-sm font-medium">Contract supplements</h3>
          <p className="text-xs text-muted-foreground">
            Extra bed, meals, gala dinner, and other add-ons with periods, age bands, and rate-plan overrides.
          </p>
        </div>
        {canCreate && (
          <Button nativeButton={false} render={<Link href={`${base}/supplements/new`} />}>
            <Plus className="h-4 w-4" />
            Add supplement
          </Button>
        )}
      </div>

      {loading ? (
        <p className="p-6 text-sm text-muted-foreground">Loading supplements…</p>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={PlusCircle}
          tone="muted"
          heading="No supplements yet"
          description="Define optional or mandatory supplements for this contract."
          action={
            canCreate ? (
              <Button nativeButton={false} render={<Link href={`${base}/supplements/new`} />}>
                <Plus className="h-4 w-4" />
                Add supplement
              </Button>
            ) : undefined
          }
        />
      ) : (
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
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
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
                                `${base}/supplements/${entry.propertyContractSupplementKey}/edit`
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
