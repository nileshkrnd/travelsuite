"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ban, Plus, Pencil, Power, PowerOff, Trash2, MoreHorizontal } from "lucide-react";
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
import type { PropertyContract, PropertyContractCancellationPolicy } from "@/types";

export function ContractCancellationPoliciesPanel({
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
  const [entries, setEntries] = useState<PropertyContractCancellationPolicy[]>([]);
  const [loading, setLoading] = useState(true);

  const base = `/${role}/extranet/contracts/${contract.propertyContractKey}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listPropertyContractCancellationPolicies({ propertyContractId: contract.propertyContractKey })
      .then((rows) => {
        if (!cancelled) setEntries(rows);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(
            err instanceof PropertyContractCancellationPolicyApiError
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
  }, [contract.propertyContractKey]);

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

  async function remove(entry: PropertyContractCancellationPolicy) {
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

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <h3 className="text-sm font-medium">Cancellation policies</h3>
          <p className="text-xs text-muted-foreground">
            Penalty rules by days before arrival — scoped to room type and rate plan when needed.
          </p>
        </div>
        {canCreate && (
          <Button nativeButton={false} render={<Link href={`${base}/cancellation-policies/new`} />}>
            <Plus className="h-4 w-4" />
            Add cancellation policy
          </Button>
        )}
      </div>

      {loading ? (
        <p className="p-6 text-sm text-muted-foreground">Loading cancellation policies…</p>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={Ban}
          tone="muted"
          heading="No cancellation policies yet"
          description="Define penalty windows for cancellations on this contract."
          action={
            canCreate ? (
              <Button nativeButton={false} render={<Link href={`${base}/cancellation-policies/new`} />}>
                <Plus className="h-4 w-4" />
                Add cancellation policy
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
              <TableHead>Room</TableHead>
              <TableHead>Rate plan</TableHead>
              <TableHead>Rules</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
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
                                `${base}/cancellation-policies/${entry.propertyContractCancellationPolicyKey}/edit`
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
