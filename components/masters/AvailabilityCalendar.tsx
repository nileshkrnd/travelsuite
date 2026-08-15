"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Ban,
  CalendarCheck,
  CalendarX2,
  ChevronLeft,
  ChevronRight,
  ListTodo,
  Loader2,
  LogIn,
  LogOut,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  getAvailabilityCalendar,
  saveAvailabilityCalendar,
  PropertyRoomAvailabilityApiError,
} from "@/lib/services/property-room-availability.service";
import type {
  AvailabilityCalendarCell,
  AvailabilityCalendarOccupancy,
  AvailabilityCalendarOccupancyRate,
  AvailabilityCalendarRatePlan,
} from "@/types/property-room-availability";
import { AvailabilityBulkChangeDialog } from "@/components/masters/AvailabilityBulkChangeDialog";

type ViewMode = "week" | "fortnight" | "month";

type CellState = {
  /** Contract allotment — baseline available units from supplier inventory. */
  contractAllotment: number | null;
  /** Daily override; null means use contract allotment. */
  dailyAllotment: number | null;
  hasSavedRow: boolean;
  stopSell: boolean;
  closedToArrival: boolean;
  closedToDeparture: boolean;
  dirty: boolean;
  contractRate: number | null;
  dailyRateAmount: number | null;
  occupancyRates: AvailabilityCalendarOccupancyRate[];
  /** Daily override; null means use the contract season period's default. */
  minLengthOfStay: number | null;
  /** Daily override; null means use the contract season period's default. */
  maxLengthOfStay: number | null;
  /** Default min LOS from the contract season period covering this date. */
  contractMinLengthOfStay: number | null;
  /** Default max LOS from the contract season period covering this date. */
  contractMaxLengthOfStay: number | null;
  contractInventoryStopSell: boolean;
  contractInventoryClosed: boolean;
  contractStopSale: boolean;
  contractBlackout: boolean;
};

type CellPatch = Partial<
  Pick<
    CellState,
    "dailyAllotment" | "stopSell" | "closedToArrival" | "closedToDeparture" | "dailyRateAmount" | "minLengthOfStay" | "maxLengthOfStay"
  >
>;

type RestrictionKind = "open" | "stopSell" | "blackout" | "closed" | "soldOut" | "none";

const INVENTORY_METRICS = [
  { id: "allotment", label: "Allotment" },
  { id: "minLos", label: "Min LOS" },
  { id: "maxLos", label: "Max LOS" },
  { id: "cta", label: "No check-in" },
  { id: "ctd", label: "No check-out" },
  { id: "status", label: "Status" },
] as const;

type InventoryMetricId = (typeof INVENTORY_METRICS)[number]["id"];

function cellKey(roomId: number, date: string) {
  return `${roomId}:${date}`;
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseIso(date: string) {
  return new Date(`${date}T12:00:00.000Z`);
}

function toIso(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function addDaysIso(date: string, days: number) {
  const d = parseIso(date);
  d.setUTCDate(d.getUTCDate() + days);
  return toIso(d);
}

/** Monday-start week (common for hotel ARI calendars). */
function mondayOf(date: string) {
  const d = parseIso(date);
  const dow = d.getUTCDay(); // 0 Sun … 6 Sat
  const offset = dow === 0 ? -6 : 1 - dow;
  d.setUTCDate(d.getUTCDate() + offset);
  return toIso(d);
}

function dayOfWeekShort(date: string) {
  return parseIso(date).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
}

function dayOfMonth(date: string) {
  return Number(date.slice(8, 10));
}

function monthShort(date: string) {
  return parseIso(date).toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });
}

function isWeekend(date: string) {
  const dow = parseIso(date).getUTCDay();
  return dow === 0 || dow === 6;
}

function monthLabel(year: number, month: number) {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function rangeLabel(days: string[]) {
  if (days.length === 0) return "";
  const first = parseIso(days[0]);
  const last = parseIso(days[days.length - 1]);
  const sameMonth =
    first.getUTCFullYear() === last.getUTCFullYear() && first.getUTCMonth() === last.getUTCMonth();
  if (sameMonth) {
    return `${first.getUTCDate()}–${last.getUTCDate()} ${monthLabel(first.getUTCFullYear(), first.getUTCMonth() + 1)}`;
  }
  const left = first.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  const right = last.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  return `${left} – ${right}`;
}

function occupancyShort(code: string) {
  const map: Record<string, string> = {
    SINGLE: "SGL",
    DOUBLE: "DBL",
    TRIPLE: "TPL",
    QUAD: "QAD",
    QUADRUPLE: "QAD",
  };
  const upper = code.toUpperCase();
  return map[upper] ?? upper.slice(0, 3);
}

function ratePlanShortLabel(plan: AvailabilityCalendarRatePlan) {
  return plan.mealPlanCode || plan.ratePlanCode;
}

function occupancyRateAmount(
  rates: AvailabilityCalendarOccupancyRate[],
  planId: number,
  occupancyTypeId: number
): number | null {
  return (
    rates.find(
      (r) => r.propertyContractRatePlanId === planId && r.occupancyTypeId === occupancyTypeId
    )?.rateAmount ?? null
  );
}

function formatAmount(value: number | null) {
  if (value == null) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(0);
}

function effectiveAllotment(state: CellState) {
  return state.dailyAllotment ?? state.contractAllotment;
}

function effectiveRate(state: CellState) {
  return state.dailyRateAmount ?? state.contractRate;
}

function allotmentOverridden(state: CellState) {
  return state.dailyAllotment != null && state.dailyAllotment !== state.contractAllotment;
}

function effectiveMinLengthOfStay(state: CellState) {
  return state.minLengthOfStay ?? state.contractMinLengthOfStay;
}

function effectiveMaxLengthOfStay(state: CellState) {
  return state.maxLengthOfStay ?? state.contractMaxLengthOfStay;
}

function minLosOverridden(state: CellState) {
  return state.minLengthOfStay != null && state.minLengthOfStay !== state.contractMinLengthOfStay;
}

function maxLosOverridden(state: CellState) {
  return state.maxLengthOfStay != null && state.maxLengthOfStay !== state.contractMaxLengthOfStay;
}

function emptyCell(): CellState {
  return {
    contractAllotment: null,
    dailyAllotment: null,
    hasSavedRow: false,
    stopSell: false,
    closedToArrival: false,
    closedToDeparture: false,
    dirty: false,
    contractRate: null,
    dailyRateAmount: null,
    occupancyRates: [],
    minLengthOfStay: null,
    maxLengthOfStay: null,
    contractMinLengthOfStay: null,
    contractMaxLengthOfStay: null,
    contractInventoryStopSell: false,
    contractInventoryClosed: false,
    contractStopSale: false,
    contractBlackout: false,
  };
}

function cellFromPayload(cell: AvailabilityCalendarCell): CellState {
  const contractAllotment = cell.inventoryAllotment ?? null;
  const hasSavedRow = cell.propertyRoomAvailabilityKey != null;

  let dailyAllotment: number | null = null;
  if (hasSavedRow) {
    dailyAllotment = cell.availableUnits ?? cell.dailyInventoryQty ?? null;
  }

  return {
    contractAllotment,
    dailyAllotment,
    hasSavedRow,
    stopSell: cell.stopSell ?? false,
    closedToArrival: cell.closedToArrival ?? false,
    closedToDeparture: cell.closedToDeparture ?? false,
    dirty: false,
    contractRate: cell.contractRate ?? null,
    dailyRateAmount: cell.dailyRateAmount ?? null,
    occupancyRates: cell.occupancyRates ?? [],
    minLengthOfStay: cell.minLengthOfStay ?? null,
    maxLengthOfStay: cell.maxLengthOfStay ?? null,
    contractMinLengthOfStay: cell.contractMinLengthOfStay ?? null,
    contractMaxLengthOfStay: cell.contractMaxLengthOfStay ?? null,
    contractInventoryStopSell: cell.contractInventoryStopSell ?? false,
    contractInventoryClosed: cell.contractInventoryClosed ?? false,
    contractStopSale: cell.contractStopSale ?? false,
    contractBlackout: cell.contractBlackout ?? false,
  };
}

function isStopSell(state: CellState) {
  return state.stopSell || state.contractInventoryStopSell || state.contractStopSale;
}

function isBlackout(state: CellState) {
  return state.contractBlackout || state.contractInventoryClosed;
}

function restrictionKind(state: CellState): RestrictionKind {
  if (isBlackout(state)) return state.contractBlackout ? "blackout" : "closed";
  if (isStopSell(state)) return "stopSell";
  const allotment = effectiveAllotment(state);
  if (allotment == null && state.contractRate == null && !state.hasSavedRow) return "none";
  if (allotment === 0) return "soldOut";
  if (allotment != null && allotment > 0) return "open";
  return "none";
}

function statusLabel(kind: RestrictionKind) {
  switch (kind) {
    case "open":
      return "Open";
    case "stopSell":
      return "SS";
    case "blackout":
      return "BO";
    case "closed":
      return "CL";
    case "soldOut":
      return "0";
    default:
      return "·";
  }
}

function statusTone(kind: RestrictionKind) {
  switch (kind) {
    case "open":
      return "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300";
    case "stopSell":
      return "bg-destructive/15 text-destructive";
    case "blackout":
      return "bg-violet-500/15 text-violet-800 dark:text-violet-300";
    case "closed":
      return "bg-slate-500/15 text-slate-700 dark:text-slate-300";
    case "soldOut":
      return "bg-amber-500/15 text-amber-800 dark:text-amber-300";
    default:
      return "bg-muted/40 text-muted-foreground";
  }
}

function monthsCovered(days: string[]): { year: number; month: number }[] {
  const seen = new Set<string>();
  const out: { year: number; month: number }[] = [];
  for (const date of days) {
    const year = Number(date.slice(0, 4));
    const month = Number(date.slice(5, 7));
    const key = `${year}-${month}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ year, month });
  }
  return out;
}

function buildVisibleDays(viewMode: ViewMode, year: number, month: number, rangeStart: string): string[] {
  if (viewMode === "month") {
    const last = new Date(Date.UTC(year, month, 0, 12, 0, 0)).getUTCDate();
    return Array.from({ length: last }, (_, i) => {
      const d = i + 1;
      return `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    });
  }
  const length = viewMode === "week" ? 7 : 14;
  const start = mondayOf(rangeStart);
  return Array.from({ length }, (_, i) => addDaysIso(start, i));
}

interface AvailabilityCalendarProps {
  tenantId: number;
  companyId: number;
  propertyId: number;
  actorKey: number;
  canEdit: boolean;
}

export function AvailabilityCalendar({
  tenantId,
  companyId,
  propertyId,
  actorKey,
  canEdit,
}: AvailabilityCalendarProps) {
  const now = new Date();
  const today = todayIso();
  const [viewMode, setViewMode] = useState<ViewMode>("fortnight");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [rangeStart, setRangeStart] = useState(() => mondayOf(today));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currencyCode, setCurrencyCode] = useState<string | null>(null);
  const [rooms, setRooms] = useState<{ propertyRoomId: number; roomCode: string; roomName: string }[]>([]);
  const [ratePlans, setRatePlans] = useState<AvailabilityCalendarRatePlan[]>([]);
  const [occupancies, setOccupancies] = useState<AvailabilityCalendarOccupancy[]>([]);
  const [selectedRatePlanIds, setSelectedRatePlanIds] = useState<number[] | null>(null);
  const [cells, setCells] = useState<Map<string, CellState>>(new Map());
  const [bulkOpen, setBulkOpen] = useState(false);

  const visibleDays = useMemo(
    () => buildVisibleDays(viewMode, year, month, rangeStart),
    [viewMode, year, month, rangeStart]
  );

  const load = useCallback(async () => {
    if (tenantId <= 0 || propertyId <= 0) return;
    setLoading(true);
    try {
      const days = buildVisibleDays(viewMode, year, month, rangeStart);
      const spans = monthsCovered(days);
      const payloads = await Promise.all(
        spans.map((span) =>
          getAvailabilityCalendar({
            tenantId,
            propertyId,
            year: span.year,
            month: span.month,
          })
        )
      );

      const roomMap = new Map<number, { propertyRoomId: number; roomCode: string; roomName: string }>();
      const planMap = new Map<number, AvailabilityCalendarRatePlan>();
      const occMap = new Map<number, AvailabilityCalendarOccupancy>();
      const next = new Map<string, CellState>();
      let currency: string | null = null;

      for (const payload of payloads) {
        currency = payload.currencyCode ?? currency;
        for (const room of payload.rooms) {
          roomMap.set(room.propertyRoomId, room);
        }
        for (const plan of payload.ratePlans ?? []) {
          planMap.set(plan.propertyContractRatePlanId, plan);
        }
        for (const occ of payload.occupancies ?? []) {
          occMap.set(occ.occupancyTypeId, occ);
        }
        for (const cell of payload.cells) {
          if (!days.includes(cell.availabilityDate)) continue;
          next.set(cellKey(cell.propertyRoomId, cell.availabilityDate), cellFromPayload(cell));
        }
      }

      const nextPlans = [...planMap.values()].sort((a, b) => {
        if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
        return a.ratePlanCode.localeCompare(b.ratePlanCode);
      });
      const nextOccupancies = [...occMap.values()].sort((a, b) => {
        if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
        return a.occupancyTypeCode.localeCompare(b.occupancyTypeCode);
      });

      setRooms([...roomMap.values()].sort((a, b) => a.roomName.localeCompare(b.roomName)));
      setRatePlans(nextPlans);
      setOccupancies(nextOccupancies);
      setSelectedRatePlanIds((prev) => {
        if (prev == null) return nextPlans.map((p) => p.propertyContractRatePlanId);
        const keep = prev.filter((id) => planMap.has(id));
        return keep.length > 0 ? keep : nextPlans.map((p) => p.propertyContractRatePlanId);
      });
      setCurrencyCode(currency);
      setCells(next);
    } catch (err) {
      toast.error(err instanceof PropertyRoomAvailabilityApiError ? err.message : "Failed to load calendar");
    } finally {
      setLoading(false);
    }
  }, [tenantId, propertyId, year, month, rangeStart, viewMode]);

  useEffect(() => {
    void load();
  }, [load]);

  function shiftPeriod(delta: number) {
    if (viewMode === "month") {
      const d = new Date(Date.UTC(year, month - 1 + delta, 1));
      setYear(d.getUTCFullYear());
      setMonth(d.getUTCMonth() + 1);
      return;
    }
    const step = viewMode === "week" ? 7 : 14;
    setRangeStart((prev) => addDaysIso(prev, delta * step));
  }

  function goToday() {
    const n = new Date();
    setYear(n.getFullYear());
    setMonth(n.getMonth() + 1);
    setRangeStart(mondayOf(todayIso()));
  }

  function getCell(roomId: number, date: string): CellState {
    return cells.get(cellKey(roomId, date)) ?? emptyCell();
  }

  function updateCell(roomId: number, date: string, patch: CellPatch) {
    setCells((prev) => {
      const key = cellKey(roomId, date);
      const current = prev.get(key) ?? emptyCell();
      const next = new Map(prev);
      next.set(key, {
        ...current,
        ...patch,
        dirty: true,
      });
      return next;
    });
  }

  const dirtyCount = useMemo(() => {
    let n = 0;
    for (const v of cells.values()) if (v.dirty) n += 1;
    return n;
  }, [cells]);

  const summary = useMemo(() => {
    let open = 0;
    let stopSell = 0;
    let blackout = 0;
    let soldOut = 0;
    let noCheckIn = 0;
    let noCheckOut = 0;
    let withAllotment = 0;
    let totalUnits = 0;

    for (const room of rooms) {
      for (const date of visibleDays) {
        const state = getCell(room.propertyRoomId, date);
        const kind = restrictionKind(state);
        if (kind === "open") open += 1;
        if (kind === "stopSell") stopSell += 1;
        if (kind === "blackout" || kind === "closed") blackout += 1;
        if (kind === "soldOut") soldOut += 1;
        if (state.closedToArrival) noCheckIn += 1;
        if (state.closedToDeparture) noCheckOut += 1;
        const allotment = effectiveAllotment(state);
        if (allotment != null && allotment > 0 && kind === "open") {
          withAllotment += 1;
          totalUnits += allotment;
        }
      }
    }

    return { open, stopSell, blackout, soldOut, noCheckIn, noCheckOut, withAllotment, totalUnits };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- getCell reads cells map
  }, [rooms, visibleDays, cells]);

  async function handleSave() {
    if (!canEdit || dirtyCount === 0) return;
    const updates: Parameters<typeof saveAvailabilityCalendar>[0]["updates"] = [];
    for (const [key, state] of cells.entries()) {
      if (!state.dirty) continue;
      const [roomIdStr, date] = key.split(":");
      const propertyRoomId = Number(roomIdStr);
      if (!propertyRoomId || !date) continue;

      const allotment = effectiveAllotment(state) ?? 0;
      updates.push({
        propertyRoomId,
        availabilityDate: date,
        availableUnits: allotment,
        stopSell: state.stopSell,
        closedToArrival: state.closedToArrival,
        closedToDeparture: state.closedToDeparture,
        dailyRateAmount: state.dailyRateAmount,
        minLengthOfStay: state.minLengthOfStay,
        maxLengthOfStay: state.maxLengthOfStay,
      });
    }
    if (updates.length === 0) return;

    setSaving(true);
    try {
      const result = await saveAvailabilityCalendar({
        tenantId,
        companyId,
        propertyId,
        createdBy: actorKey,
        updates,
      });
      toast.success(`Saved ${result.saved} day ${result.saved === 1 ? "update" : "updates"}`);
      await load();
    } catch (err) {
      toast.error(err instanceof PropertyRoomAvailabilityApiError ? err.message : "Failed to save calendar");
    } finally {
      setSaving(false);
    }
  }

  const visibleRatePlans = useMemo(() => {
    if (selectedRatePlanIds == null || selectedRatePlanIds.length === 0) return ratePlans;
    const allow = new Set(selectedRatePlanIds);
    return ratePlans.filter((p) => allow.has(p.propertyContractRatePlanId));
  }, [ratePlans, selectedRatePlanIds]);

  const showContractOnRateRows = useMemo(() => {
    const ids = new Set(visibleRatePlans.map((p) => p.propertyContractId));
    return ids.size > 1;
  }, [visibleRatePlans]);

  const periodTitle =
    viewMode === "month" ? monthLabel(year, month) : rangeLabel(visibleDays);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="icon-sm" onClick={() => shiftPeriod(-1)} disabled={loading}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[12rem] text-center text-sm font-medium">{periodTitle}</div>
          <Button type="button" variant="outline" size="icon-sm" onClick={() => shiftPeriod(1)} disabled={loading}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={goToday}>
            Today
          </Button>

          <div className="ml-1 flex rounded-md border p-0.5">
            {(
              [
                ["week", "Week"],
                ["fortnight", "14 days"],
                ["month", "Month"],
              ] as const
            ).map(([mode, label]) => (
              <Button
                key={mode}
                type="button"
                size="sm"
                variant={viewMode === mode ? "secondary" : "ghost"}
                className="h-7 px-2.5 text-xs"
                onClick={() => {
                  setViewMode(mode);
                  if (mode !== "month") {
                    const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;
                    const anchor = today.startsWith(monthPrefix)
                      ? today
                      : `${monthPrefix}-01`;
                    setRangeStart(mondayOf(anchor));
                  }
                }}
              >
                {label}
              </Button>
            ))}
          </div>

          {currencyCode && (
            <span className="text-xs text-muted-foreground">
              Rates in <span className="font-mono font-medium">{currencyCode}</span>
            </span>
          )}
        </div>

        {canEdit && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={saving || loading || rooms.length === 0}
              onClick={() => setBulkOpen(true)}
            >
              <ListTodo className="h-4 w-4" />
              Bulk change
            </Button>
            <Button type="button" size="sm" disabled={saving || dirtyCount === 0} onClick={() => void handleSave()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save changes{dirtyCount > 0 ? ` (${dirtyCount})` : ""}
            </Button>
          </div>
        )}
      </div>

      {!loading && rooms.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <SummaryChip label="Open room-days" value={String(summary.open)} tone="emerald" />
          <SummaryChip label="Units available" value={String(summary.totalUnits)} tone="blue" />
          <SummaryChip label="Stop sell" value={String(summary.stopSell)} tone="destructive" />
          <SummaryChip label="Blackout / closed" value={String(summary.blackout)} tone="violet" />
          <SummaryChip label="Sold out (0)" value={String(summary.soldOut)} tone="amber" />
          <SummaryChip label="No check-in" value={String(summary.noCheckIn)} tone="orange" />
          <SummaryChip label="No check-out" value={String(summary.noCheckOut)} tone="rose" />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
        <span className="font-medium text-foreground">Legend</span>
        <LegendSwatch className="bg-emerald-500/20 ring-emerald-500/40" label="Open" />
        <LegendSwatch className="bg-destructive/20 ring-destructive/40" label="Stop sell (SS)" />
        <LegendSwatch className="bg-violet-500/20 ring-violet-500/40" label="Blackout (BO)" />
        <LegendSwatch className="bg-slate-500/20 ring-slate-500/40" label="Closed (CL)" />
        <LegendSwatch className="bg-amber-500/20 ring-amber-500/40" label="Sold out" />
        <LegendSwatch className="bg-orange-500/20 ring-orange-500/40" label="No check-in (CTA)" />
        <LegendSwatch className="bg-rose-500/20 ring-rose-500/40" label="No check-out (CTD)" />
        <span className="underline decoration-dotted">Underlined = daily override</span>
        <span>Min / Max = length of stay restrictions</span>
        <span className="text-blue-700 dark:text-blue-400">SGL / DBL / TPL = occupancy rates from contract rate plans</span>
      </div>

      {ratePlans.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-medium text-muted-foreground">Rate plans</span>
          <Button
            type="button"
            size="xs"
            variant={
              selectedRatePlanIds != null && selectedRatePlanIds.length === ratePlans.length
                ? "secondary"
                : "outline"
            }
            onClick={() => setSelectedRatePlanIds(ratePlans.map((p) => p.propertyContractRatePlanId))}
          >
            All
          </Button>
          {ratePlans.map((plan) => {
            const id = plan.propertyContractRatePlanId;
            const active = selectedRatePlanIds?.includes(id) ?? true;
            return (
              <Button
                key={id}
                type="button"
                size="xs"
                variant={active ? "secondary" : "outline"}
                onClick={() => {
                  setSelectedRatePlanIds((prev) => {
                    const current = prev ?? ratePlans.map((p) => p.propertyContractRatePlanId);
                    if (current.includes(id) && current.length === 1) return current;
                    return current.includes(id)
                      ? current.filter((x) => x !== id)
                      : [...current, id];
                  });
                }}
              >
                {ratePlanShortLabel(plan)}
                <span className="ml-1 font-normal text-muted-foreground">{plan.ratePlanCode}</span>
              </Button>
            );
          })}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading calendar…
            </div>
          ) : rooms.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center text-sm text-muted-foreground">
              <CalendarCheck className="h-8 w-8 opacity-40" />
              <p>No active room types for this property.</p>
              <p className="text-xs">Add room types under Extranet → Rooms first.</p>
            </div>
          ) : (
            <div className="overflow-auto max-h-[calc(100vh-18rem)]">
              <table className="w-full min-w-max border-collapse text-xs">
                <thead className="sticky top-0 z-30">
                  <tr className="border-b bg-muted/95 backdrop-blur">
                    <th className="sticky left-0 z-40 min-w-[11rem] border-r bg-muted px-3 py-2 text-left text-xs font-medium">
                      Room / ARI
                    </th>
                    <th className="sticky left-[11rem] z-40 min-w-[7.5rem] border-r bg-muted px-2 py-2 text-left text-[10px] font-medium text-muted-foreground">
                      Metric
                    </th>
                    {visibleDays.map((date) => (
                      <th
                        key={date}
                        className={cn(
                          "min-w-[3.75rem] border-l px-1 py-1.5 text-center text-xs font-medium",
                          isWeekend(date) && "bg-muted/80",
                          date === today && "bg-primary/15 text-primary"
                        )}
                      >
                        <div className="text-[10px] font-normal uppercase tracking-wide text-muted-foreground">
                          {dayOfWeekShort(date)}
                        </div>
                        <div className="tabular-nums text-sm leading-tight">{dayOfMonth(date)}</div>
                        {(viewMode !== "month" || dayOfMonth(date) === 1) && (
                          <div className="text-[10px] font-normal text-muted-foreground">{monthShort(date)}</div>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((room) => (
                    <RoomAriBlock
                      key={room.propertyRoomId}
                      room={room}
                      days={visibleDays}
                      today={today}
                      currencyCode={currencyCode}
                      canEdit={canEdit}
                      ratePlans={visibleRatePlans}
                      occupancies={occupancies}
                      showContractOnRateRows={showContractOnRateRows}
                      getCell={getCell}
                      onChange={(date, patch) => updateCell(room.propertyRoomId, date, patch)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {canEdit && (
        <AvailabilityBulkChangeDialog
          open={bulkOpen}
          onOpenChange={setBulkOpen}
          tenantId={tenantId}
          companyId={companyId}
          propertyId={propertyId}
          actorKey={actorKey}
          rooms={rooms}
          defaultFrom={visibleDays[0] ?? today}
          defaultTo={visibleDays[visibleDays.length - 1] ?? today}
          onApplied={load}
        />
      )}
    </div>
  );
}

function SummaryChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "emerald" | "blue" | "destructive" | "violet" | "amber" | "orange" | "rose";
}) {
  const tones: Record<typeof tone, string> = {
    emerald: "border-emerald-500/25 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300",
    blue: "border-blue-500/25 bg-blue-500/5 text-blue-800 dark:text-blue-300",
    destructive: "border-destructive/25 bg-destructive/5 text-destructive",
    violet: "border-violet-500/25 bg-violet-500/5 text-violet-800 dark:text-violet-300",
    amber: "border-amber-500/25 bg-amber-500/5 text-amber-800 dark:text-amber-300",
    orange: "border-orange-500/25 bg-orange-500/5 text-orange-800 dark:text-orange-300",
    rose: "border-rose-500/25 bg-rose-500/5 text-rose-800 dark:text-rose-300",
  };
  return (
    <div className={cn("rounded-md border px-3 py-2", tones[tone])}>
      <div className="text-[10px] uppercase tracking-wide opacity-80">{label}</div>
      <div className="text-lg font-semibold tabular-nums leading-tight">{value}</div>
    </div>
  );
}

function LegendSwatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("inline-block h-3 w-3 rounded-sm ring-1", className)} />
      {label}
    </span>
  );
}

function RoomAriBlock({
  room,
  days,
  today,
  currencyCode,
  canEdit,
  ratePlans,
  occupancies,
  showContractOnRateRows,
  getCell,
  onChange,
}: {
  room: { propertyRoomId: number; roomCode: string; roomName: string };
  days: string[];
  today: string;
  currencyCode: string | null;
  canEdit: boolean;
  ratePlans: AvailabilityCalendarRatePlan[];
  occupancies: AvailabilityCalendarOccupancy[];
  showContractOnRateRows: boolean;
  getCell: (roomId: number, date: string) => CellState;
  onChange: (date: string, patch: CellPatch) => void;
}) {
  const occupancyRows = ratePlans.flatMap((plan) =>
    occupancies.map((occ) => ({
      id: `${plan.propertyContractRatePlanId}:${occ.occupancyTypeId}`,
      plan,
      occ,
      label: [
        showContractOnRateRows && plan.contractLabel ? plan.contractLabel : null,
        ratePlanShortLabel(plan),
        occupancyShort(occ.occupancyTypeCode),
      ]
        .filter(Boolean)
        .join(" · "),
    }))
  );
  const rowCount = INVENTORY_METRICS.length + occupancyRows.length;

  return (
    <>
      {INVENTORY_METRICS.map((metric, metricIndex) => (
        <tr
          key={`${room.propertyRoomId}-${metric.id}`}
          className={cn(
            "border-b",
            metricIndex === INVENTORY_METRICS.length - 1 && occupancyRows.length === 0 && "border-b-2 border-border/80",
            metric.id === "status" && "bg-muted/10"
          )}
        >
          {metricIndex === 0 ? (
            <td
              rowSpan={rowCount}
              className="sticky left-0 z-20 border-r bg-background px-3 py-2 align-top"
            >
              <div className="font-medium leading-tight">{room.roomName}</div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">{room.roomCode}</div>
            </td>
          ) : null}
          <td className="sticky left-[11rem] z-20 border-r bg-background px-2 py-1 text-[10px] font-medium text-muted-foreground">
            {metric.label}
          </td>
          {days.map((date) => {
            const state = getCell(room.propertyRoomId, date);
            return (
              <MetricCell
                key={`${date}-${metric.id}`}
                date={date}
                today={today}
                metric={metric.id}
                currencyCode={currencyCode}
                state={state}
                canEdit={canEdit}
                onChange={(patch) => onChange(date, patch)}
                ratePlans={ratePlans}
                occupancies={occupancies}
              />
            );
          })}
        </tr>
      ))}
      {occupancyRows.map((row, rowIndex) => (
        <tr
          key={`${room.propertyRoomId}-rate-${row.id}`}
          className={cn(
            "border-b bg-blue-500/[0.03]",
            rowIndex === occupancyRows.length - 1 && "border-b-2 border-border/80"
          )}
        >
          <td className="sticky left-[11rem] z-20 border-r bg-background px-2 py-1 text-[10px] font-medium leading-tight text-blue-800 dark:text-blue-300">
            {row.label}
          </td>
          {days.map((date) => {
            const state = getCell(room.propertyRoomId, date);
            const amount = occupancyRateAmount(
              state.occupancyRates,
              row.plan.propertyContractRatePlanId,
              row.occ.occupancyTypeId
            );
            return (
              <OccupancyRateCell
                key={`${date}-${row.id}`}
                date={date}
                today={today}
                amount={amount}
                currencyCode={currencyCode}
                state={state}
                canEdit={canEdit}
                onChange={(patch) => onChange(date, patch)}
                ratePlans={ratePlans}
                occupancies={occupancies}
              />
            );
          })}
        </tr>
      ))}
    </>
  );
}

function MetricCell({
  date,
  today,
  metric,
  currencyCode,
  state,
  canEdit,
  onChange,
  ratePlans,
  occupancies,
}: {
  date: string;
  today: string;
  metric: InventoryMetricId;
  currencyCode: string | null;
  state: CellState;
  canEdit: boolean;
  onChange: (patch: CellPatch) => void;
  ratePlans: AvailabilityCalendarRatePlan[];
  occupancies: AvailabilityCalendarOccupancy[];
}) {
  const allotment = effectiveAllotment(state);
  const kind = restrictionKind(state);
  const stopSellBlocked = isStopSell(state);
  const blackoutBlocked = isBlackout(state);

  let display = "·";
  let valueClass = "text-muted-foreground";

  if (metric === "allotment") {
    display = allotment != null ? String(allotment) : "·";
    valueClass = cn(
      allotment == null && "text-muted-foreground",
      allotment === 0 && "font-semibold text-amber-700 dark:text-amber-400",
      allotment != null && allotment > 0 && "font-semibold text-emerald-700 dark:text-emerald-400",
      allotmentOverridden(state) && "underline decoration-dotted decoration-emerald-500/70"
    );
  } else if (metric === "minLos") {
    const minLos = effectiveMinLengthOfStay(state);
    display = minLos != null ? String(minLos) : "·";
    valueClass = cn(
      minLos == null ? "text-muted-foreground" : "font-medium tabular-nums",
      minLosOverridden(state) && "underline decoration-dotted decoration-emerald-500/70"
    );
  } else if (metric === "maxLos") {
    const maxLos = effectiveMaxLengthOfStay(state);
    display = maxLos != null ? String(maxLos) : "·";
    valueClass = cn(
      maxLos == null ? "text-muted-foreground" : "font-medium tabular-nums",
      maxLosOverridden(state) && "underline decoration-dotted decoration-emerald-500/70"
    );
  } else if (metric === "cta") {
    display = state.closedToArrival ? "CTA" : "·";
    valueClass = state.closedToArrival
      ? "rounded px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-orange-500/15 text-orange-800 dark:text-orange-300"
      : "text-muted-foreground";
  } else if (metric === "ctd") {
    display = state.closedToDeparture ? "CTD" : "·";
    valueClass = state.closedToDeparture
      ? "rounded px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-rose-500/15 text-rose-800 dark:text-rose-300"
      : "text-muted-foreground";
  } else {
    display = statusLabel(kind);
    valueClass = cn("rounded px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide", statusTone(kind));
  }

  const cellTone =
    metric === "cta" && state.closedToArrival
      ? "bg-orange-500/5"
      : metric === "ctd" && state.closedToDeparture
        ? "bg-rose-500/5"
        : kind === "stopSell"
          ? "bg-destructive/5"
          : kind === "blackout"
            ? "bg-violet-500/5"
            : kind === "closed"
              ? "bg-slate-500/5"
              : kind === "soldOut"
                ? "bg-amber-500/5"
                : "";

  const cellContent = (
    <>
      {metric === "status" && stopSellBlocked && (
        <Ban className="absolute right-0.5 top-0.5 h-2.5 w-2.5 text-destructive/70" aria-hidden />
      )}
      {metric === "status" && !stopSellBlocked && blackoutBlocked && (
        <CalendarX2 className="absolute right-0.5 top-0.5 h-2.5 w-2.5 text-violet-600/70" aria-hidden />
      )}
      {metric === "cta" && state.closedToArrival && (
        <LogIn className="absolute right-0.5 top-0.5 h-2.5 w-2.5 text-orange-600/70" aria-hidden />
      )}
      {metric === "ctd" && state.closedToDeparture && (
        <LogOut className="absolute right-0.5 top-0.5 h-2.5 w-2.5 text-rose-600/70" aria-hidden />
      )}
      <span className={valueClass}>{display}</span>
    </>
  );

  return (
    <td
      className={cn(
        "border-l p-0 align-middle",
        isWeekend(date) && "bg-muted/10",
        date === today && "bg-primary/5"
      )}
    >
      <Popover>
        <PopoverTrigger
          nativeButton={false}
          render={
            <button
              type="button"
              className={cn(
                "relative flex h-8 w-full min-w-[3.75rem] items-center justify-center px-1 tabular-nums transition-colors hover:bg-muted/40",
                cellTone,
                state.dirty && "ring-2 ring-inset ring-primary/35",
                (metric === "status" || metric === "cta" || metric === "ctd") && "text-[10px]"
              )}
            />
          }
        >
          {cellContent}
        </PopoverTrigger>
        <DayEditorPopover
          date={date}
          currencyCode={currencyCode}
          state={state}
          canEdit={canEdit}
          onChange={onChange}
          ratePlans={ratePlans}
          occupancies={occupancies}
        />
      </Popover>
    </td>
  );
}

function OccupancyRateCell({
  date,
  today,
  amount,
  currencyCode,
  state,
  canEdit,
  onChange,
  ratePlans,
  occupancies,
}: {
  date: string;
  today: string;
  amount: number | null;
  currencyCode: string | null;
  state: CellState;
  canEdit: boolean;
  onChange: (patch: CellPatch) => void;
  ratePlans: AvailabilityCalendarRatePlan[];
  occupancies: AvailabilityCalendarOccupancy[];
}) {
  return (
    <td
      className={cn(
        "border-l p-0 align-middle",
        isWeekend(date) && "bg-muted/10",
        date === today && "bg-primary/5"
      )}
    >
      <Popover>
        <PopoverTrigger
          nativeButton={false}
          render={
            <button
              type="button"
              className={cn(
                "relative flex h-8 w-full min-w-[3.75rem] items-center justify-center px-1 tabular-nums transition-colors hover:bg-muted/40",
                isStopSell(state) && "bg-destructive/5",
                isBlackout(state) && "bg-violet-500/5",
                state.dirty && "ring-2 ring-inset ring-primary/35"
              )}
            />
          }
        >
          <span
            className={cn(
              amount == null
                ? "text-muted-foreground"
                : "font-medium text-blue-700 dark:text-blue-400"
            )}
          >
            {formatAmount(amount)}
          </span>
        </PopoverTrigger>
        <DayEditorPopover
          date={date}
          currencyCode={currencyCode}
          state={state}
          canEdit={canEdit}
          onChange={onChange}
          ratePlans={ratePlans}
          occupancies={occupancies}
        />
      </Popover>
    </td>
  );
}

function DayEditorPopover({
  date,
  currencyCode,
  state,
  canEdit,
  onChange,
  ratePlans = [],
  occupancies = [],
}: {
  date: string;
  currencyCode: string | null;
  state: CellState;
  canEdit: boolean;
  onChange: (patch: CellPatch) => void;
  ratePlans?: AvailabilityCalendarRatePlan[];
  occupancies?: AvailabilityCalendarOccupancy[];
}) {
  const allotment = effectiveAllotment(state);
  const rate = effectiveRate(state);
  const kind = restrictionKind(state);
  const stopSellBlocked = isStopSell(state);
  const blackoutBlocked = isBlackout(state);

  return (
    <PopoverContent className="w-80 space-y-3" align="center" side="bottom">
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">
            {parseIso(date).toLocaleDateString("en-GB", {
              weekday: "short",
              day: "numeric",
              month: "short",
              year: "numeric",
              timeZone: "UTC",
            })}
          </p>
          <Badge variant="outline" className={cn("text-[10px]", statusTone(kind))}>
            {statusLabel(kind) === "SS"
              ? "Stop sell"
              : statusLabel(kind) === "BO"
                ? "Blackout"
                : statusLabel(kind) === "CL"
                  ? "Closed"
                  : statusLabel(kind) === "0"
                    ? "Sold out"
                    : statusLabel(kind) === "Open"
                      ? "Open"
                      : "No data"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Edit daily ARI: allotment, rate, length of stay, stop sell, and no check-in / no check-out.
          Contract blackouts remain read-only.
        </p>
        {state.dirty && (
          <Badge variant="outline" className="text-[10px]">
            Unsaved
          </Badge>
        )}
      </div>

      {canEdit ? (
        <div className="space-y-3 border-t pt-3">
          <div className="space-y-1.5">
            <Label htmlFor={`allotment-${date}`} className="text-xs">
              Allotment (available units)
            </Label>
            <Input
              id={`allotment-${date}`}
              type="number"
              min={0}
              className="h-8"
              value={state.dailyAllotment ?? ""}
              placeholder={
                state.contractAllotment != null
                  ? `Contract: ${state.contractAllotment}`
                  : "No contract allotment"
              }
              onChange={(e) => {
                const raw = e.target.value;
                onChange({ dailyAllotment: raw === "" ? null : Math.max(0, Number(raw) || 0) });
              }}
            />
            {state.contractAllotment != null && (
              <p className="text-[10px] text-muted-foreground">
                Contract allotment: {state.contractAllotment} units
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`rate-${date}`} className="text-xs">
              Rate {currencyCode ? `(${currencyCode})` : ""}
            </Label>
            <Input
              id={`rate-${date}`}
              type="number"
              min={0}
              step="0.01"
              className="h-8"
              value={state.dailyRateAmount ?? ""}
              placeholder={
                state.contractRate != null ? `Contract: ${formatAmount(state.contractRate)}` : "No contract rate"
              }
              onChange={(e) => {
                const raw = e.target.value;
                onChange({ dailyRateAmount: raw === "" ? null : Math.max(0, Number(raw) || 0) });
              }}
            />
            {state.contractRate != null && (
              <p className="text-[10px] text-muted-foreground">
                Contract rate: {formatAmount(state.contractRate)}
                {currencyCode ? ` ${currencyCode}` : ""}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor={`minlos-${date}`} className="text-xs">
                Min LOS
              </Label>
              <Input
                id={`minlos-${date}`}
                type="number"
                min={1}
                className="h-8"
                value={state.minLengthOfStay ?? ""}
                placeholder={state.contractMinLengthOfStay != null ? `Contract: ${state.contractMinLengthOfStay}` : "—"}
                onChange={(e) => {
                  const raw = e.target.value;
                  onChange({
                    minLengthOfStay: raw === "" ? null : Math.max(1, Number(raw) || 1),
                  });
                }}
              />
              {state.contractMinLengthOfStay != null && (
                <p className="text-[10px] text-muted-foreground">
                  Contract default: {state.contractMinLengthOfStay}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`maxlos-${date}`} className="text-xs">
                Max LOS
              </Label>
              <Input
                id={`maxlos-${date}`}
                type="number"
                min={1}
                className="h-8"
                value={state.maxLengthOfStay ?? ""}
                placeholder={state.contractMaxLengthOfStay != null ? `Contract: ${state.contractMaxLengthOfStay}` : "—"}
                onChange={(e) => {
                  const raw = e.target.value;
                  onChange({
                    maxLengthOfStay: raw === "" ? null : Math.max(1, Number(raw) || 1),
                  });
                }}
              />
              {state.contractMaxLengthOfStay != null && (
                <p className="text-[10px] text-muted-foreground">
                  Contract default: {state.contractMaxLengthOfStay}
                </p>
              )}
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs">
            <Checkbox
              checked={state.stopSell}
              onCheckedChange={(checked) => onChange({ stopSell: checked === true })}
            />
            Stop sell (daily)
          </label>

          <label className="flex items-center gap-2 text-xs">
            <Checkbox
              checked={state.closedToArrival}
              onCheckedChange={(checked) => onChange({ closedToArrival: checked === true })}
            />
            Close on arrival — no check-in
          </label>

          <label className="flex items-center gap-2 text-xs">
            <Checkbox
              checked={state.closedToDeparture}
              onCheckedChange={(checked) => onChange({ closedToDeparture: checked === true })}
            />
            Close on departure — no check-out
          </label>

          {(state.contractInventoryStopSell || state.contractStopSale) && (
            <p className="text-[10px] text-destructive">
              {state.contractStopSale && state.contractInventoryStopSell
                ? "Contract inventory stop sell and stop-sale period active"
                : state.contractStopSale
                  ? "Stop-sale period active"
                  : "Contract inventory stop sell active"}
            </p>
          )}

          {(state.contractInventoryClosed || state.contractBlackout) && (
            <p className="text-[10px] text-violet-700 dark:text-violet-400">
              {state.contractBlackout && state.contractInventoryClosed
                ? "Contract inventory closed and blackout active"
                : state.contractBlackout
                  ? "Blackout period active"
                  : "Contract inventory closed"}
            </p>
          )}
        </div>
      ) : (
        <dl className="grid grid-cols-2 gap-x-2 gap-y-1 border-t pt-3 text-xs">
          <dt className="text-muted-foreground">Allotment</dt>
          <dd className="text-right font-mono tabular-nums">{allotment ?? "—"}</dd>
          <dt className="text-muted-foreground">Rate</dt>
          <dd className="text-right font-mono tabular-nums">
            {rate != null ? `${formatAmount(rate)}${currencyCode ? ` ${currencyCode}` : ""}` : "—"}
          </dd>
          <dt className="text-muted-foreground">Min LOS</dt>
          <dd className="text-right font-mono tabular-nums">{effectiveMinLengthOfStay(state) ?? "—"}</dd>
          <dt className="text-muted-foreground">Max LOS</dt>
          <dd className="text-right font-mono tabular-nums">{effectiveMaxLengthOfStay(state) ?? "—"}</dd>
          {state.closedToArrival && (
            <>
              <dt className="text-orange-700 dark:text-orange-400">No check-in</dt>
              <dd className="text-right text-orange-700 dark:text-orange-400">Closed to arrival</dd>
            </>
          )}
          {state.closedToDeparture && (
            <>
              <dt className="text-rose-700 dark:text-rose-400">No check-out</dt>
              <dd className="text-right text-rose-700 dark:text-rose-400">Closed to departure</dd>
            </>
          )}
          {stopSellBlocked && (
            <>
              <dt className="text-destructive">Stop sell</dt>
              <dd className="text-right text-destructive">Active</dd>
            </>
          )}
          {blackoutBlocked && (
            <>
              <dt className="text-violet-700 dark:text-violet-400">Blackout</dt>
              <dd className="text-right text-violet-700 dark:text-violet-400">Active</dd>
            </>
          )}
        </dl>
      )}
    </PopoverContent>
  );
}
