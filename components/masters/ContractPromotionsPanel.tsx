"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Megaphone, Plus, Pencil, Power, PowerOff, Trash2, MoreHorizontal } from "lucide-react";
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
import type { PropertyContract } from "@/types";
import type { PropertyContractPromotion } from "@/types/property-contract-promotion";

export function ContractPromotionsPanel({
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
  const [entries, setEntries] = useState<PropertyContractPromotion[]>([]);
  const [loading, setLoading] = useState(true);

  const base = `/${role}/extranet/contracts/${contract.propertyContractKey}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listPropertyContractPromotions({ propertyContractId: contract.propertyContractKey })
      .then((rows) => {
        if (!cancelled) setEntries(rows);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(
            err instanceof PropertyContractPromotionApiError
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
  }, [contract.propertyContractKey]);

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

  async function remove(entry: PropertyContractPromotion) {
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

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <h3 className="text-sm font-medium">Promotions</h3>
          <p className="text-xs text-muted-foreground">
            Early bird, stay &amp; pay, discounts, and other offers scoped to room type and rate plan.
          </p>
        </div>
        {canCreate && (
          <Button nativeButton={false} render={<Link href={`${base}/promotions/new`} />}>
            <Plus className="h-4 w-4" />
            Add promotion
          </Button>
        )}
      </div>

      {loading ? (
        <p className="p-6 text-sm text-muted-foreground">Loading promotions…</p>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          tone="muted"
          heading="No promotions yet"
          description="Define promotional offers for this contract."
          action={
            canCreate ? (
              <Button nativeButton={false} render={<Link href={`${base}/promotions/new`} />}>
                <Plus className="h-4 w-4" />
                Add promotion
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
              <TableHead>Rate plan</TableHead>
              <TableHead>Stackable</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
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
                                `${base}/promotions/${entry.propertyContractPromotionKey}/edit`
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
