"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  CalendarDays,
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
  listPropertyContractSeasonPeriods,
  setPropertyContractSeasonPeriodActive,
  deletePropertyContractSeasonPeriod,
  PropertyContractSeasonPeriodsApiError,
} from "@/lib/services/property-contract-season-periods.service";
import type { PropertyContract, PropertyContractSeasonPeriod } from "@/types";

/** Season periods list scoped to one property contract (used on contract detail tab). */
export function ContractSeasonPeriodsPanel({
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
  const [entries, setEntries] = useState<PropertyContractSeasonPeriod[]>([]);
  const [loading, setLoading] = useState(true);

  const base = `/${role}/extranet/contracts/${contract.propertyContractKey}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listPropertyContractSeasonPeriods({ propertyContractId: contract.propertyContractKey })
      .then((rows) => {
        if (!cancelled) setEntries(rows);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(
            err instanceof PropertyContractSeasonPeriodsApiError
              ? err.message
              : "Failed to load season periods"
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

  async function toggleStatus(entry: PropertyContractSeasonPeriod) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      const saved = await setPropertyContractSeasonPeriodActive(
        entry.propertyContractSeasonPeriodKey,
        !entry.isActive,
        actorKey
      );
      setEntries((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
      toast.success(saved.isActive ? "Period activated" : "Period deactivated");
    } catch (error) {
      toast.error(
        error instanceof PropertyContractSeasonPeriodsApiError ? error.message : "Could not update status"
      );
    }
  }

  async function removeEntry(entry: PropertyContractSeasonPeriod) {
    try {
      await deletePropertyContractSeasonPeriod(entry.propertyContractSeasonPeriodKey);
      setEntries((prev) => prev.filter((r) => r.id !== entry.id));
      toast.success("Season period removed");
    } catch (error) {
      toast.error(
        error instanceof PropertyContractSeasonPeriodsApiError ? error.message : "Could not remove period"
      );
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading season periods…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">Contract season periods</p>
          <p className="text-sm text-muted-foreground">
            Date ranges for seasons on this contract ({contract.propertyName ?? "property"}).
          </p>
        </div>
        {canCreate && (
          <Button nativeButton={false} render={<Link href={`${base}/season-periods/new`} />}>
            <Plus className="h-4 w-4" />
            New period
          </Button>
        )}
      </div>

      <Card>
        {entries.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            tone="primary"
            heading="No season periods yet"
            description="Attach Low / High / Peak seasons to date ranges for this contract."
            size="compact"
            action={
              canCreate ? (
                <Button nativeButton={false} render={<Link href={`${base}/season-periods/new`} />}>
                  <Plus className="h-4 w-4" />
                  New period
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Sr. No</TableHead>
                <TableHead>Season</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Min/Max LOS</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry, index) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell>
                    {entry.seasonName ?? "—"}
                    {entry.seasonCode ? (
                      <span className="text-muted-foreground"> ({entry.seasonCode})</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="tabular-nums">{entry.fromDate}</TableCell>
                  <TableCell className="tabular-nums">{entry.toDate}</TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {entry.minLengthOfStay ?? "—"} / {entry.maxLengthOfStay ?? "—"}
                  </TableCell>
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
                                `${base}/season-periods/${entry.propertyContractSeasonPeriodKey}/edit`
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
