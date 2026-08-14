"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Boxes, Loader2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Section } from "@/components/masters/PropertyFormSection";
import { SearchableCombobox } from "@/components/shared/SearchableCombobox";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { resolveSessionCompanyKey } from "@/lib/session-company";
import { listPropertyContractSeasonPeriods } from "@/lib/services/property-contract-season-periods.service";
import {
  getPropertyContractInventoryMatrix,
  listInventoryTypes,
  savePropertyContractInventoryMatrix,
  PropertyContractInventoryApiError,
} from "@/lib/services/property-contract-inventories.service";
import type { PropertyContract, PropertyContractSeasonPeriod } from "@/types";

type CellState = {
  allotment: string;
  release: string;
  stopSell: boolean;
  closed: boolean;
  inventoryId?: number;
};

function cellKey(roomId: number) {
  return String(roomId);
}

function formatPeriodDate(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  const day = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleDateString("en-GB", { month: "short" });
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

function seasonPeriodLabel(p: PropertyContractSeasonPeriod) {
  return p.seasonName ?? p.seasonCode ?? "Season";
}

/** Matrix inventory entry — season, inventory type, room grid (allotment / release / flags). */
export function PropertyContractInventoryMatrixForm({ contract }: { contract: PropertyContract }) {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSeasonPeriodId = Number(searchParams.get("seasonPeriodId"));
  const initialInventoryTypeId = Number(searchParams.get("inventoryTypeId"));
  const sessionUser = useSessionStore((s) => s.user);
  const activeTenant = useTenantStore((s) => s.tenant);
  const tenantKey = sessionUser?.tenantKey ?? activeTenant.tenantKey ?? 0;
  const companyKey = resolveSessionCompanyKey(sessionUser) ?? 0;
  const actorKey = sessionUser?.userKey ?? 0;

  const returnHref = `/${role}/extranet/contracts/${contract.propertyContractKey}?tab=inventory`;

  const [seasonPeriods, setSeasonPeriods] = useState<PropertyContractSeasonPeriod[]>([]);
  const [inventoryTypes, setInventoryTypes] = useState<
    { inventoryTypeId: number; inventoryTypeCode: string; inventoryTypeName: string }[]
  >([]);
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [seasonPeriodId, setSeasonPeriodId] = useState<number | null>(null);
  const [inventoryTypeId, setInventoryTypeId] = useState<number | null>(null);
  const [cells, setCells] = useState<Record<string, CellState>>({});
  const [rooms, setRooms] = useState<
    { propertyRoomId: number; roomCode: string; roomName: string }[]
  >([]);
  const [matrixMeta, setMatrixMeta] = useState<{
    fromDate?: string;
    toDate?: string;
    seasonName?: string;
  } | null>(null);

  const selectedSeason = seasonPeriods.find((p) => p.propertyContractSeasonPeriodKey === seasonPeriodId);
  const selectedInventoryType = inventoryTypes.find((t) => t.inventoryTypeId === inventoryTypeId);
  const isAllotment = selectedInventoryType?.inventoryTypeCode === "ALLOTMENT";

  useEffect(() => {
    let cancelled = false;
    setLoadingLookups(true);

    Promise.all([
      listPropertyContractSeasonPeriods({ propertyContractId: contract.propertyContractKey }),
      listInventoryTypes({ activeOnly: true }),
    ])
      .then(([periods, types]) => {
        if (cancelled) return;
        setSeasonPeriods(periods);
        setInventoryTypes(
          types.map((t) => ({
            inventoryTypeId: t.inventoryTypeKey,
            inventoryTypeCode: t.inventoryTypeCode,
            inventoryTypeName: t.inventoryTypeName,
          }))
        );

        const nextSeasonId =
          Number.isFinite(initialSeasonPeriodId) && initialSeasonPeriodId > 0
            ? initialSeasonPeriodId
            : periods.length === 1
              ? periods[0]!.propertyContractSeasonPeriodKey
              : null;
        if (nextSeasonId) setSeasonPeriodId(nextSeasonId);

        const allotment = types.find((t) => t.inventoryTypeCode === "ALLOTMENT");
        const nextTypeId =
          Number.isFinite(initialInventoryTypeId) && initialInventoryTypeId > 0
            ? initialInventoryTypeId
            : allotment?.inventoryTypeKey ?? types[0]?.inventoryTypeKey ?? null;
        if (nextTypeId) setInventoryTypeId(nextTypeId);
      })
      .catch(() => {
        if (!cancelled) toast.error("Could not load season periods or inventory types");
      })
      .finally(() => {
        if (!cancelled) setLoadingLookups(false);
      });

    return () => {
      cancelled = true;
    };
  }, [contract.propertyContractKey, initialSeasonPeriodId, initialInventoryTypeId]);

  const loadMatrix = useCallback(async () => {
    if (!seasonPeriodId || !inventoryTypeId) {
      setMatrixMeta(null);
      setCells({});
      setRooms([]);
      return;
    }
    setLoadingMatrix(true);
    try {
      const data = await getPropertyContractInventoryMatrix({
        propertyContractId: contract.propertyContractKey,
        propertyContractSeasonPeriodId: seasonPeriodId,
        inventoryTypeId,
      });
      setRooms(data.rooms);
      setMatrixMeta({
        fromDate: data.fromDate,
        toDate: data.toDate,
        seasonName: data.seasonName,
      });

      const nextCells: Record<string, CellState> = {};
      for (const cell of data.cells) {
        nextCells[cellKey(cell.propertyRoomId)] = {
          allotment: cell.allotmentQty != null ? String(cell.allotmentQty) : "",
          release: cell.releaseDays != null ? String(cell.releaseDays) : "",
          stopSell: cell.isStopSell,
          closed: cell.isClosed,
          inventoryId: cell.propertyContractInventoryId,
        };
      }
      setCells(nextCells);
    } catch (err) {
      toast.error(
        err instanceof PropertyContractInventoryApiError ? err.message : "Failed to load inventory matrix"
      );
      setMatrixMeta(null);
    } finally {
      setLoadingMatrix(false);
    }
  }, [seasonPeriodId, inventoryTypeId, contract.propertyContractKey]);

  useEffect(() => {
    void loadMatrix();
  }, [loadMatrix]);

  function updateCell(roomId: number, patch: Partial<CellState>) {
    const key = cellKey(roomId);
    setCells((prev) => ({
      ...prev,
      [key]: {
        allotment: "",
        release: "",
        stopSell: false,
        closed: false,
        ...prev[key],
        ...patch,
      },
    }));
  }

  async function handleSubmit() {
    if (!seasonPeriodId || !inventoryTypeId) {
      toast.error("Select season period and inventory type.");
      return;
    }
    if (rooms.length === 0) {
      toast.error("No room types for this property.");
      return;
    }
    if (!actorKey || tenantKey <= 0 || companyKey <= 0) {
      toast.error("Missing session context — sign in again.");
      return;
    }

    const payloadCells = rooms.map((room) => {
      const cell = cells[cellKey(room.propertyRoomId)] ?? {
        allotment: "",
        release: "",
        stopSell: false,
        closed: false,
      };
      const allotmentTrim = cell.allotment.trim();
      const releaseTrim = cell.release.trim();
      return {
        propertyContractInventoryId: cell.inventoryId,
        propertyRoomId: room.propertyRoomId,
        allotmentQty: allotmentTrim === "" ? null : Number(allotmentTrim),
        releaseDays: releaseTrim === "" ? null : Number(releaseTrim),
        isStopSell: cell.stopSell,
        isClosed: cell.closed,
      };
    });

    const hasData = payloadCells.some(
      (c) =>
        (c.allotmentQty != null && c.allotmentQty > 0) ||
        (c.releaseDays != null && c.releaseDays > 0) ||
        c.isStopSell ||
        c.isClosed
    );
    if (!hasData) {
      toast.error("Enter at least one inventory value.");
      return;
    }

    if (isAllotment) {
      const rowsWithData = payloadCells.filter(
        (c) =>
          (c.allotmentQty != null && c.allotmentQty > 0) ||
          (c.releaseDays != null && c.releaseDays > 0) ||
          c.isStopSell ||
          c.isClosed
      );
      if (rowsWithData.some((c) => (c.allotmentQty ?? 0) <= 0)) {
        toast.error("Allotment quantity is required for each room row when type is Allotment.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const result = await savePropertyContractInventoryMatrix({
        tenantId: tenantKey,
        companyId: companyKey,
        propertyContractId: contract.propertyContractKey,
        propertyContractSeasonPeriodId: seasonPeriodId,
        inventoryTypeId,
        createdBy: actorKey,
        cells: payloadCells,
      });
      toast.success(`${result.saved} inventory row${result.saved === 1 ? "" : "s"} saved`);
      router.push(returnHref);
    } catch (err) {
      toast.error(
        err instanceof PropertyContractInventoryApiError ? err.message : "Could not save inventory"
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingLookups) {
    return <p className="text-sm text-muted-foreground">Loading form…</p>;
  }

  const showMatrix = seasonPeriodId && inventoryTypeId && matrixMeta && !loadingMatrix && rooms.length > 0;

  return (
    <div className="max-w-6xl space-y-6">
      <Section
        icon={Boxes}
        title="Property contract inventory"
        description="Enter contracted inventory by season and inventory type."
      >
        <div className="space-y-1 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Contract</p>
          <p className="text-base font-semibold text-foreground">{contract.contractName}</p>
          <p className="text-muted-foreground">{contract.contractNumber}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label required>Season</Label>
            <SearchableCombobox
              value={seasonPeriodId}
              onChange={(v) => setSeasonPeriodId(v)}
              options={seasonPeriods.map((p) => ({
                value: p.propertyContractSeasonPeriodKey,
                label: seasonPeriodLabel(p),
                sublabel: p.seasonCode,
              }))}
              placeholder="Select season period…"
              emptyLabel="No season periods — add them on the contract first."
            />
          </div>
          <div className="space-y-2">
            <Label required>Inventory type</Label>
            <SearchableCombobox
              value={inventoryTypeId}
              onChange={(v) => setInventoryTypeId(v)}
              options={inventoryTypes.map((t) => ({
                value: t.inventoryTypeId,
                label: t.inventoryTypeName,
                sublabel: t.inventoryTypeCode,
              }))}
              placeholder="Select inventory type (e.g. Allotment)…"
              emptyLabel="No inventory types available."
            />
          </div>
        </div>

        {selectedSeason && (
          <div className="rounded-lg border border-dashed border-border px-4 py-3 text-sm">
            <p className="font-medium text-foreground">{seasonPeriodLabel(selectedSeason)}</p>
            <p className="text-muted-foreground">
              Period{" "}
              {selectedSeason.fromDate && selectedSeason.toDate
                ? `${formatPeriodDate(selectedSeason.fromDate)} → ${formatPeriodDate(selectedSeason.toDate)}`
                : "—"}
            </p>
          </div>
        )}

        {isAllotment && (
          <p className="text-sm text-muted-foreground">
            Allotment type selected — enter a quantity for each room row you save.
          </p>
        )}
      </Section>

      {loadingMatrix && <p className="text-sm text-muted-foreground">Loading inventory matrix…</p>}

      {!loadingMatrix && seasonPeriodId && inventoryTypeId && rooms.length === 0 && (
        <Card className="p-6 text-sm text-muted-foreground">
          No active room types for this property. Add rooms under Extranet → Rooms first.
        </Card>
      )}

      {!loadingMatrix && (!seasonPeriodId || !inventoryTypeId) && (
        <Card className="border-dashed p-6 text-sm text-muted-foreground">
          Select a <strong className="text-foreground">season period</strong> and{" "}
          <strong className="text-foreground">inventory type</strong> above to open the inventory grid.
        </Card>
      )}

      {showMatrix && (
        <Section
          icon={Boxes}
          title="Inventory matrix"
          description="Enter allotment, release days, and sale flags per room type."
        >
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="min-w-[160px]">Room type</TableHead>
                  <TableHead className="min-w-[6rem] text-center">Allotment</TableHead>
                  <TableHead className="min-w-[6rem] text-center">Release days</TableHead>
                  <TableHead className="min-w-[5rem] text-center">Stop sell</TableHead>
                  <TableHead className="min-w-[5rem] text-center">Closed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rooms.map((room) => {
                  const key = cellKey(room.propertyRoomId);
                  const cell = cells[key] ?? {
                    allotment: "",
                    release: "",
                    stopSell: false,
                    closed: false,
                  };
                  return (
                    <TableRow key={room.propertyRoomId}>
                      <TableCell>
                        <div className="font-medium">{room.roomName}</div>
                        <div className="text-xs text-muted-foreground">{room.roomCode}</div>
                      </TableCell>
                      <TableCell className="p-1">
                        <Input
                          type="number"
                          min={0}
                          className="h-8 min-w-[5rem] px-2 text-right font-mono text-sm tabular-nums"
                          placeholder="—"
                          value={cell.allotment}
                          onChange={(e) => updateCell(room.propertyRoomId, { allotment: e.target.value })}
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input
                          type="number"
                          min={0}
                          className="h-8 min-w-[5rem] px-2 text-right font-mono text-sm tabular-nums"
                          placeholder="—"
                          value={cell.release}
                          onChange={(e) => updateCell(room.propertyRoomId, { release: e.target.value })}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={cell.stopSell}
                          onCheckedChange={(checked) =>
                            updateCell(room.propertyRoomId, { stopSell: checked === true })
                          }
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={cell.closed}
                          onCheckedChange={(checked) =>
                            updateCell(room.propertyRoomId, { closed: checked === true })
                          }
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Section>
      )}

      <div className="flex items-center gap-2">
        <Button type="button" disabled={submitting || !showMatrix} onClick={() => void handleSubmit()}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save inventory
        </Button>
        <Button type="button" variant="outline" nativeButton={false} render={<Link href={returnHref} />}>
          <X className="h-4 w-4" />
          Cancel
        </Button>
      </div>
    </div>
  );
}
