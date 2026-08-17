"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Landmark, Plus, Pencil, Power, PowerOff, Trash2, MoreHorizontal } from "lucide-react";
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
import type { PropertyContract, PropertyContractTax } from "@/types";

function rateLabel(entry: PropertyContractTax): string {
  if (entry.calculationType === "PERCENTAGE") return `${entry.taxRate ?? 0}%`;
  return `${entry.currencyCode ?? ""} ${entry.taxAmount ?? 0}`.trim();
}

export function ContractTaxesPanel({
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
  const [entries, setEntries] = useState<PropertyContractTax[]>([]);
  const [loading, setLoading] = useState(true);

  const base = `/${role}/extranet/contracts/${contract.propertyContractKey}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listPropertyContractTaxes({ propertyContractId: contract.propertyContractKey })
      .then((rows) => {
        if (!cancelled) setEntries(rows);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err instanceof PropertyContractTaxApiError ? err.message : "Failed to load taxes");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [contract.propertyContractKey]);

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

  async function remove(entry: PropertyContractTax) {
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

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <h3 className="text-sm font-medium">Taxes</h3>
          <p className="text-xs text-muted-foreground">
            Taxes applied on this contract — rate/amount, basis, and calculation order.
          </p>
        </div>
        {canCreate && (
          <Button nativeButton={false} render={<Link href={`${base}/taxes/new`} />}>
            <Plus className="h-4 w-4" />
            Add tax
          </Button>
        )}
      </div>

      {loading ? (
        <p className="p-6 text-sm text-muted-foreground">Loading taxes…</p>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={Landmark}
          tone="muted"
          heading="No taxes yet"
          description="Assign taxes (VAT, tourism tax, service charge, …) to this contract."
          action={
            canCreate ? (
              <Button nativeButton={false} render={<Link href={`${base}/taxes/new`} />}>
                <Plus className="h-4 w-4" />
                Add tax
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">Seq</TableHead>
              <TableHead>Tax</TableHead>
              <TableHead>Rate / Amount</TableHead>
              <TableHead>Basis</TableHead>
              <TableHead>Inclusive</TableHead>
              <TableHead>Valid</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.propertyContractTaxKey}>
                <TableCell className="text-sm text-muted-foreground">{entry.sequenceNo}</TableCell>
                <TableCell>
                  <div className="font-medium">{entry.taxName}</div>
                  {entry.taxCode && <div className="font-mono text-xs text-muted-foreground">{entry.taxCode}</div>}
                </TableCell>
                <TableCell className="font-mono text-sm">{rateLabel(entry)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{entry.applicationBasis}</TableCell>
                <TableCell>{entry.isInclusive ? "Yes" : "No"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {entry.toDate ? `${entry.fromDate} → ${entry.toDate}` : `From ${entry.fromDate}`}
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
                            onClick={() => router.push(`${base}/taxes/${entry.propertyContractTaxKey}/edit`)}
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
