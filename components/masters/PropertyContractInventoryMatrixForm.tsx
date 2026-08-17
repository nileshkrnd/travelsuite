"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { listPropertySeasons } from "@/lib/services/property-seasons.service";
import {
  getPropertyContractInventoryMatrix,
  listInventoryTypes,
  savePropertyContractInventoryMatrix,
  PropertyContractInventoryApiError,
} from "@/lib/services/property-contract-inventories.service";
import type { PropertyContract, PropertyContractSeasonPeriod, PropertySeason } from "@/types";

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

function sanitizeIntegerInput(raw: string): string {
  return raw.replace(/[^0-9]/g, "");
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

  const [propertySeasons, setPropertySeasons] = useState<PropertySeason[]>([]);
  const [seasonPeriods, setSeasonPeriods] = useState<PropertyContractSeasonPeriod[]>([]);
  const [inventoryTypes, setInventoryTypes] = useState<
    { inventoryTypeId: number; inventoryTypeCode: string; inventoryTypeName: string }[]
  >([]);
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [seasonMasterId, setSeasonMasterId] = useState<number | null>(null);
  const [selectedPeriodIds, setSelectedPeriodIds] = useState<number[]>([]);
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

  const periodsForSeason = useMemo(
    () => seasonPeriods.filter((p) => p.propertySeasonId === seasonMasterId),
    [seasonPeriods, seasonMasterId]
  );
  const selectedPeriods = useMemo(
    () => periodsForSeason.filter((p) => selectedPeriodIds.includes(p.propertyContractSeasonPeriodKey)),
    [periodsForSeason, selectedPeriodIds]
  );
  const structuralPeriodId = selectedPeriodIds[0] ?? null;
  const isSinglePeriod = selectedPeriodIds.length === 1;
  const allPeriodsSelected =
    periodsForSeason.length > 0 && selectedPeriodIds.length === periodsForSeason.length;

  function selectSeasonMaster(id: number | null) {
    setSeasonMasterId(id);
    const periods = seasonPeriods.filter((p) => p.propertySeasonId === id);
    setSelectedPeriodIds(periods.map((p) => p.propertyContractSeasonPeriodKey));
  }

  function togglePeriod(periodId: number, checked: boolean) {
    setSelectedPeriodIds((prev) => {
      const set = new Set(prev);
      if (checked) set.add(periodId);
      else set.delete(periodId);
      return [...set];
    });
  }

  function toggleAllPeriods(checked: boolean) {
    setSelectedPeriodIds(checked ? periodsForSeason.map((p) => p.propertyContractSeasonPeriodKey) : []);
  }

  const selectedInventoryType = inventoryTypes.find((t) => t.inventoryTypeId === inventoryTypeId);
  const isAllotment = selectedInventoryType?.inventoryTypeCode === "ALLOTMENT";

  useEffect(() => {
    let cancelled = false;
    setLoadingLookups(true);

    Promise.all([
      tenantKey > 0 && companyKey > 0
        ? listPropertySeasons({ tenantId: tenantKey, companyId: companyKey, propertyId: contract.propertyId, activeOnly: true })
        : Promise.resolve([] as PropertySeason[]),
      listPropertyContractSeasonPeriods({ propertyContractId: contract.propertyContractKey }),
      listInventoryTypes({ activeOnly: true }),
    ])
      .then(([seasons, periods, types]) => {
        if (cancelled) return;
        setPropertySeasons(seasons);
        setSeasonPeriods(periods);
        setInventoryTypes(
          types.map((t) => ({
            inventoryTypeId: t.inventoryTypeKey,
            inventoryTypeCode: t.inventoryTypeCode,
            inventoryTypeName: t.inventoryTypeName,
          }))
        );

        const deepLinkedPeriod =
          Number.isFinite(initialSeasonPeriodId) && initialSeasonPeriodId > 0
            ? periods.find((p) => p.propertyContractSeasonPeriodKey === initialSeasonPeriodId)
            : undefined;

        if (deepLinkedPeriod) {
          setSeasonMasterId(deepLinkedPeriod.propertySeasonId);
          setSelectedPeriodIds([deepLinkedPeriod.propertyContractSeasonPeriodKey]);
        } else if (seasons.length === 1) {
          setSeasonMasterId(seasons[0]!.propertySeasonKey);
          setSelectedPeriodIds(
            periods
              .filter((p) => p.propertySeasonId === seasons[0]!.propertySeasonKey)
              .map((p) => p.propertyContractSeasonPeriodKey)
          );
        }

        const allotment = types.find((t) => t.inventoryTypeCode === "ALLOTMENT");
        const nextTypeId =
          Number.isFinite(initialInventoryTypeId) && initialInventoryTypeId > 0
            ? initialInventoryTypeId
            : allotment?.inventoryTypeKey ?? types[0]?.inventoryTypeKey ?? null;
        if (nextTypeId) setInventoryTypeId(nextTypeId);
      })
      .catch(() => {
        if (!cancelled) toast.error("Could not load seasons, season periods, or inventory types");
      })
      .finally(() => {
        if (!cancelled) setLoadingLookups(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tenantKey, companyKey, contract.propertyContractKey, contract.propertyId, initialSeasonPeriodId, initialInventoryTypeId]);

  const loadMatrix = useCallback(async () => {
    if (!structuralPeriodId || !inventoryTypeId) {
      setMatrixMeta(null);
      setCells({});
      setRooms([]);
      return;
    }
    setLoadingMatrix(true);
    try {
      const data = await getPropertyContractInventoryMatrix({
        propertyContractId: contract.propertyContractKey,
        propertyContractSeasonPeriodId: structuralPeriodId,
        inventoryTypeId,
      });
      setRooms(data.rooms);
      setMatrixMeta({
        fromDate: data.fromDate,
        toDate: data.toDate,
        seasonName: data.seasonName,
      });

      if (!isSinglePeriod) {
        // Only prefill from existing data when exactly one period is targeted — its
        // propertyContractInventoryId values belong to that period and must not be
        // reused when saving multiple periods (would relocate this period's rows).
        setCells({});
      } else {
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
      }
    } catch (err) {
      toast.error(
        err instanceof PropertyContractInventoryApiError ? err.message : "Failed to load inventory matrix"
      );
      setMatrixMeta(null);
    } finally {
      setLoadingMatrix(false);
    }
  }, [structuralPeriodId, isSinglePeriod, inventoryTypeId, contract.propertyContractKey]);

  useEffect(() => {
    void loadMatrix();
  }, [loadMatrix]);

  function updateCell(roomId: number, patch: Partial<CellState>) {
    const key = cellKey(roomId);
    const sanitizedPatch: Partial<CellState> = { ...patch };
    if (sanitizedPatch.allotment !== undefined) {
      sanitizedPatch.allotment = sanitizeIntegerInput(sanitizedPatch.allotment);
    }
    if (sanitizedPatch.release !== undefined) {
      sanitizedPatch.release = sanitizeIntegerInput(sanitizedPatch.release);
    }
    setCells((prev) => {
      const base: CellState = prev[key] ?? { allotment: "", release: "", stopSell: false, closed: false };
      return { ...prev, [key]: { ...base, ...sanitizedPatch } };
    });
  }

  async function handleSubmit() {
    if (selectedPeriodIds.length === 0 || !inventoryTypeId) {
      toast.error("Select a season, at least one period, and inventory type.");
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

    const hasNegative = payloadCells.some(
      (c) => (c.allotmentQty != null && c.allotmentQty < 0) || (c.releaseDays != null && c.releaseDays < 0)
    );
    if (hasNegative) {
      toast.error("Allotment and release days cannot be negative.");
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

    // Strong duplicate guard: a room can only have one inventory row per season
    // period (the DB's unique key doesn't even scope by inventory type). When
    // multiple periods are targeted, none of them were prefilled from existing
    // data (to avoid the propertyContractInventoryId cross-period reuse bug), so
    // a room the user is entering here could silently collide with a row that
    // already exists for that room on one of the other selected periods. Check
    // every selected period's live data before attempting any save, and block
    // the whole submission if a collision is found.
    if (selectedPeriodIds.length > 1) {
      const enteredRoomIds = new Set(
        payloadCells
          .filter(
            (c) =>
              (c.allotmentQty != null && c.allotmentQty > 0) ||
              (c.releaseDays != null && c.releaseDays > 0) ||
              c.isStopSell ||
              c.isClosed
          )
          .map((c) => c.propertyRoomId)
      );
      const conflicts: string[] = [];
      for (const periodId of selectedPeriodIds) {
        try {
          const data = await getPropertyContractInventoryMatrix({
            propertyContractId: contract.propertyContractKey,
            propertyContractSeasonPeriodId: periodId,
            inventoryTypeId,
          });
          const existingRoomIds = new Set(
            data.cells
              .filter(
                (c) =>
                  (c.allotmentQty != null && c.allotmentQty > 0) ||
                  (c.releaseDays != null && c.releaseDays > 0) ||
                  c.isStopSell ||
                  c.isClosed
              )
              .map((c) => c.propertyRoomId)
          );
          const dupCount = [...enteredRoomIds].filter((id) => existingRoomIds.has(id)).length;
          if (dupCount > 0) {
            const period = seasonPeriods.find((p) => p.propertyContractSeasonPeriodKey === periodId);
            const label = period
              ? `${formatPeriodDate(period.fromDate)} – ${formatPeriodDate(period.toDate)}`
              : `#${periodId}`;
            conflicts.push(`${label} (${dupCount} room${dupCount === 1 ? "" : "s"} already set)`);
          }
        } catch {
          // If the check itself fails, fall through — the save attempt below will
          // still fail safely per period rather than silently double-writing.
        }
      }
      if (conflicts.length > 0) {
        setSubmitting(false);
        toast.error(
          `Duplicate inventory already exists for this season — edit these periods individually instead: ${conflicts.join(", ")}`
        );
        return;
      }
    }

    let totalSaved = 0;
    let totalRemoved = 0;
    const failedPeriods: string[] = [];
    for (const periodId of selectedPeriodIds) {
      try {
        const result = await savePropertyContractInventoryMatrix({
          tenantId: tenantKey,
          companyId: companyKey,
          propertyContractId: contract.propertyContractKey,
          propertyContractSeasonPeriodId: periodId,
          inventoryTypeId,
          createdBy: actorKey,
          cells: payloadCells,
        });
        totalSaved += result.saved;
        totalRemoved += result.removed;
      } catch (err) {
        const period = seasonPeriods.find((p) => p.propertyContractSeasonPeriodKey === periodId);
        const label = period ? `${formatPeriodDate(period.fromDate)} – ${formatPeriodDate(period.toDate)}` : `#${periodId}`;
        const message = err instanceof PropertyContractInventoryApiError ? err.message : "save failed";
        failedPeriods.push(`${label} (${message})`);
      }
    }
    setSubmitting(false);

    const savedPeriodCount = selectedPeriodIds.length - failedPeriods.length;
    if (savedPeriodCount > 0) {
      const parts = [`${totalSaved} inventory row${totalSaved === 1 ? "" : "s"} saved`];
      if (totalRemoved > 0) parts.push(`${totalRemoved} cleared`);
      toast.success(`${parts.join(", ")} across ${savedPeriodCount} period${savedPeriodCount === 1 ? "" : "s"}`);
    }
    if (failedPeriods.length > 0) {
      toast.error(`Could not save: ${failedPeriods.join(", ")}`);
    } else {
      router.push(returnHref);
    }
  }

  if (loadingLookups) {
    return <p className="text-sm text-muted-foreground">Loading form…</p>;
  }

  const showMatrix = selectedPeriodIds.length > 0 && inventoryTypeId && matrixMeta && !loadingMatrix && rooms.length > 0;

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
              value={seasonMasterId}
              onChange={(v) => selectSeasonMaster(v)}
              options={propertySeasons.map((s) => ({
                value: s.propertySeasonKey,
                label: s.seasonName,
                sublabel: s.seasonCode,
              }))}
              placeholder="Select season…"
              emptyLabel="No seasons configured for this property yet."
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

        {seasonMasterId && (
          <div className="space-y-2 rounded-lg border border-border px-4 py-3">
            <div className="flex items-center justify-between">
              <Label>Season periods</Label>
              {periodsForSeason.length > 0 && (
                <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Checkbox
                    checked={allPeriodsSelected}
                    onCheckedChange={(checked) => toggleAllPeriods(checked === true)}
                  />
                  Select all periods for this season
                </label>
              )}
            </div>
            {periodsForSeason.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No date periods for this season yet — add them on the contract first.
              </p>
            ) : (
              <div className="space-y-1">
                {periodsForSeason.map((p) => (
                  <label
                    key={p.propertyContractSeasonPeriodKey}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={selectedPeriodIds.includes(p.propertyContractSeasonPeriodKey)}
                      onCheckedChange={(checked) =>
                        togglePeriod(p.propertyContractSeasonPeriodKey, checked === true)
                      }
                    />
                    <span>
                      {p.fromDate && p.toDate
                        ? `${formatPeriodDate(p.fromDate)} → ${formatPeriodDate(p.toDate)}`
                        : "—"}
                    </span>
                  </label>
                ))}
              </div>
            )}
            {selectedPeriods.length > 1 && (
              <p className="text-xs text-muted-foreground">
                The inventory below will be saved identically to all {selectedPeriods.length} selected periods.
              </p>
            )}
          </div>
        )}

        {isAllotment && (
          <p className="text-sm text-muted-foreground">
            Allotment type selected — enter a quantity for each room row you save.
          </p>
        )}
      </Section>

      {loadingMatrix && <p className="text-sm text-muted-foreground">Loading inventory matrix…</p>}

      {!loadingMatrix && selectedPeriodIds.length > 0 && inventoryTypeId && rooms.length === 0 && (
        <Card className="p-6 text-sm text-muted-foreground">
          No active room types for this property. Add rooms under Extranet → Rooms first.
        </Card>
      )}

      {!loadingMatrix && (selectedPeriodIds.length === 0 || !inventoryTypeId) && (
        <Card className="border-dashed p-6 text-sm text-muted-foreground">
          Select a <strong className="text-foreground">season</strong>, at least one{" "}
          <strong className="text-foreground">period</strong>, and{" "}
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
                          type="text"
                          inputMode="numeric"
                          className="h-8 min-w-[5rem] px-2 text-right font-mono text-sm tabular-nums"
                          placeholder="—"
                          value={cell.allotment}
                          onChange={(e) => updateCell(room.propertyRoomId, { allotment: e.target.value })}
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input
                          type="text"
                          inputMode="numeric"
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
