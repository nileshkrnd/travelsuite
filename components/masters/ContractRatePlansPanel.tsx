"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  Tags,
  Pencil,
  Power,
  PowerOff,
  Trash2,
  MoreHorizontal,
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
  listPropertyContractRatePlans,
  setPropertyContractRatePlanActive,
  deletePropertyContractRatePlan,
  PropertyContractRatePlansApiError,
} from "@/lib/services/property-contract-rate-plans.service";
import type { PropertyContract, PropertyContractRatePlan } from "@/types";

/** Rate plans list scoped to one property contract (used on contract detail tab). */
export function ContractRatePlansPanel({
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
  const [entries, setEntries] = useState<PropertyContractRatePlan[]>([]);
  const [loading, setLoading] = useState(true);

  const base = `/${role}/extranet/contracts/${contract.propertyContractKey}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listPropertyContractRatePlans({ propertyContractId: contract.propertyContractKey })
      .then((rows) => {
        if (!cancelled) setEntries(rows);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(
            err instanceof PropertyContractRatePlansApiError
              ? err.message
              : "Failed to load rate plans"
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

  async function toggleStatus(entry: PropertyContractRatePlan) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      const saved = await setPropertyContractRatePlanActive(
        entry.propertyContractRatePlanKey,
        !entry.isActive,
        actorKey
      );
      setEntries((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
      toast.success(saved.isActive ? "Rate plan activated" : "Rate plan deactivated");
    } catch (error) {
      toast.error(
        error instanceof PropertyContractRatePlansApiError ? error.message : "Could not update status"
      );
    }
  }

  async function removeEntry(entry: PropertyContractRatePlan) {
    try {
      await deletePropertyContractRatePlan(entry.propertyContractRatePlanKey);
      setEntries((prev) => prev.filter((r) => r.id !== entry.id));
      toast.success("Rate plan removed");
    } catch (error) {
      toast.error(
        error instanceof PropertyContractRatePlansApiError ? error.message : "Could not remove rate plan"
      );
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading rate plans…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">Contract rate plans</p>
          <p className="text-sm text-muted-foreground">
            FIT, Corporate, Group rate plans for {contract.propertyName ?? "this property"}.
          </p>
        </div>
        {canCreate && (
          <Button nativeButton={false} render={<Link href={`${base}/rate-plans/new`} />}>
            <Plus className="h-4 w-4" />
            New rate plan
          </Button>
        )}
      </div>

      <Card>
        {entries.length === 0 ? (
          <EmptyState
            icon={Tags}
            tone="primary"
            heading="No rate plans yet"
            description="Add FIT-BB, Corporate-HB, and other rate plans for this contract."
            size="compact"
            action={
              canCreate ? (
                <Button nativeButton={false} render={<Link href={`${base}/rate-plans/new`} />}>
                  <Plus className="h-4 w-4" />
                  New rate plan
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Sr. No</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Meal</TableHead>
                <TableHead>Basis</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry, index) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-mono text-sm">{entry.ratePlanCode}</TableCell>
                  <TableCell>{entry.ratePlanName}</TableCell>
                  <TableCell>
                    {entry.ratePlanTypeName ?? "—"}
                    {entry.ratePlanTypeCode ? (
                      <span className="text-muted-foreground"> ({entry.ratePlanTypeCode})</span>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    {entry.mealPlanName ?? "—"}
                    {entry.mealPlanCode ? (
                      <span className="text-muted-foreground"> ({entry.mealPlanCode})</span>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    {entry.rateBasisName ?? "—"}
                    {entry.rateBasisCode ? (
                      <span className="text-muted-foreground"> ({entry.rateBasisCode})</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="tabular-nums">{entry.displayOrder}</TableCell>
                  <TableCell>
                    <Badge variant={entry.isActive ? "default" : "secondary"}>
                      {entry.isActive ? "active" : "inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canEdit && (
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(
                                `${base}/rate-plans/${entry.propertyContractRatePlanKey}/edit`
                              )
                            }
                          >
                            <Pencil className="h-4 w-4" />
                            Modify
                          </DropdownMenuItem>
                        )}
                        {canEdit && (
                          <DropdownMenuItem onClick={() => void toggleStatus(entry)}>
                            {entry.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                            {entry.isActive ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <DropdownMenuItem onClick={() => void removeEntry(entry)}>
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
