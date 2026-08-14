"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Baby, Plus, Pencil, Power, PowerOff, Trash2, MoreHorizontal } from "lucide-react";
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
import type { PropertyContract, PropertyContractChildPolicy } from "@/types";

/** Contract child policies list scoped to one property contract. */
export function ContractChildPoliciesPanel({
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
  const [entries, setEntries] = useState<PropertyContractChildPolicy[]>([]);
  const [loading, setLoading] = useState(true);

  const base = `/${role}/extranet/contracts/${contract.propertyContractKey}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listPropertyContractChildPolicies({ propertyContractId: contract.propertyContractKey })
      .then((rows) => {
        if (!cancelled) setEntries(rows);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(
            err instanceof PropertyContractChildPolicyApiError
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
  }, [contract.propertyContractKey]);

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

  async function remove(entry: PropertyContractChildPolicy) {
    if (!canDelete) return;
    const roomLabel = entry.roomName ?? entry.roomCode ?? "All rooms";
    if (!window.confirm(`Delete child policy for "${roomLabel}"?`)) return;
    try {
      await deletePropertyContractChildPolicy(entry.propertyContractChildPolicyKey);
      setEntries((prev) =>
        prev.filter(
          (row) => row.propertyContractChildPolicyKey !== entry.propertyContractChildPolicyKey
        )
      );
      toast.success("Child policy deleted");
    } catch (err) {
      toast.error(
        err instanceof PropertyContractChildPolicyApiError ? err.message : "Could not delete"
      );
    }
  }

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

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <h3 className="text-sm font-medium">Child policies</h3>
          <p className="text-xs text-muted-foreground">
            Maximum children, occupancy rules, and age-band pricing (free, supplement, adult rate, or not allowed).
          </p>
        </div>
        {canCreate && (
          <Button nativeButton={false} render={<Link href={`${base}/child-policies/new`} />}>
            <Plus className="h-4 w-4" />
            Add child policy
          </Button>
        )}
      </div>

      {loading ? (
        <p className="p-6 text-sm text-muted-foreground">Loading child policies…</p>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={Baby}
          tone="muted"
          heading="No child policies yet"
          description="Define how children are priced and whether they count toward room occupancy."
          action={
            canCreate ? (
              <Button nativeButton={false} render={<Link href={`${base}/child-policies/new`} />}>
                <Plus className="h-4 w-4" />
                Add child policy
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Room</TableHead>
              <TableHead className="text-right">Max children</TableHead>
              <TableHead>Counts in occupancy</TableHead>
              <TableHead>Age bands</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
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
                                `${base}/child-policies/${entry.propertyContractChildPolicyKey}/edit`
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
