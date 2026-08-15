"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Ban,
  CalendarCheck,
  CalendarX2,
  ChevronLeft,
  ChevronRight,
  Loader2,
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
import type { AvailabilityCalendarCell } from "@/types/property-room-availability";

type ViewMode = "week" | "fortnight" | "month";

type CellState = {
  /** Contract allotment — baseline available units from supplier inventory. */
  contractAllotment: number | null;
  /** Daily override; null means use contract allotment. */
  dailyAllotment: number | null;
  hasSavedRow: boolean;
  stopSell: boolean;
  dirty: boolean;
  contractRate: number | null;
  dailyRateAmount: number | null;
  minLengthOfStay: number | null;
  maxLengthOfStay: number | null;
  contractInventoryStopSell: boolean;
  contractInventoryClosed: boolean;
  contractStopSale: boolean;
  contractBlackout: boolean;
};

type CellPatch = Partial<
  Pick<
    CellState,
    "dailyAllotment" | "stopSell" | "dailyRateAmount" | "minLengthOfStay" | "maxLengthOfStay"
  >
>;

type RestrictionKind = "open" | "stopSell" | "blackout" | "closed" | "soldOut" | "none";

const METRICS = [
  { id: "allotment", label: "Allotment", short: "Allot" },
  { id: "rate", label: "Rate", short: "Rate" },
  { id: "minLos", label: "Min LOS", short: "Min" },
  { id: "maxLos", label: "Max LOS", short: "Max" },
  { id: "status", label: "Status", short: "Status" },
] as const;

type MetricId = (typeof METRICS)[number]["id"];

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

function emptyCell(): CellState {
  return {
    contractAllotment: null,
    dailyAllotment: null,
    hasSavedRow: false,
    stopSell: false,
    dirty: false,
    contractRate: null,
    dailyRateAmount: null,
    minLengthOfStay: null,
    maxLengthOfStay: null,
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
    dirty: false,
    contractRate: cell.contractRate ?? null,
    dailyRateAmount: cell.dailyRateAmount ?? null,
    minLengthOfStay: cell.minLengthOfStay ?? null,
    maxLengthOfStay: cell.maxLengthOfStay ?? null,
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
  const [cells, setCells] = useState<Map<string, CellState>>(new Map());

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
      const next = new Map<string, CellState>();
      let currency: string | null = null;

      for (const payload of payloads) {
        currency = payload.currencyCode ?? currency;
        for (const room of payload.rooms) {
          roomMap.set(room.propertyRoomId, room);
        }
        for (const cell of payload.cells) {
          if (!days.includes(cell.availabilityDate)) continue;
          next.set(cellKey(cell.propertyRoomId, cell.availabilityDate), cellFromPayload(cell));
        }
      }

      setRooms([...roomMap.values()].sort((a, b) => a.roomName.localeCompare(b.roomName)));
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
        const allotment = effectiveAllotment(state);
        if (allotment != null && allotment > 0 && kind === "open") {
          withAllotment += 1;
          totalUnits += allotment;
        }
      }
    }

    return { open, stopSell, blackout, soldOut, withAllotment, totalUnits };
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
          <Button type="button" size="sm" disabled={saving || dirtyCount === 0} onClick={() => void handleSave()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save changes{dirtyCount > 0 ? ` (${dirtyCount})` : ""}
          </Button>
        )}
      </div>

      {!loading && rooms.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryChip label="Open room-days" value={String(summary.open)} tone="emerald" />
          <SummaryChip label="Units available" value={String(summary.totalUnits)} tone="blue" />
          <SummaryChip label="Stop sell" value={String(summary.stopSell)} tone="destructive" />
          <SummaryChip label="Blackout / closed" value={String(summary.blackout)} tone="violet" />
          <SummaryChip label="Sold out (0)" value={String(summary.soldOut)} tone="amber" />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
        <span className="font-medium text-foreground">Legend</span>
        <LegendSwatch className="bg-emerald-500/20 ring-emerald-500/40" label="Open" />
        <LegendSwatch className="bg-destructive/20 ring-destructive/40" label="Stop sell (SS)" />
        <LegendSwatch className="bg-violet-500/20 ring-violet-500/40" label="Blackout (BO)" />
        <LegendSwatch className="bg-slate-500/20 ring-slate-500/40" label="Closed (CL)" />
        <LegendSwatch className="bg-amber-500/20 ring-amber-500/40" label="Sold out" />
        <span className="underline decoration-dotted">Underlined = daily override</span>
        <span>Min / Max = length of stay restrictions</span>
      </div>

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
                    <th className="sticky left-[11rem] z-40 min-w-[4.75rem] border-r bg-muted px-2 py-2 text-left text-[10px] font-medium text-muted-foreground">
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
  tone: "emerald" | "blue" | "destructive" | "violet" | "amber";
}) {
  const tones: Record<typeof tone, string> = {
    emerald: "border-emerald-500/25 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300",
    blue: "border-blue-500/25 bg-blue-500/5 text-blue-800 dark:text-blue-300",
    destructive: "border-destructive/25 bg-destructive/5 text-destructive",
    violet: "border-violet-500/25 bg-violet-500/5 text-violet-800 dark:text-violet-300",
    amber: "border-amber-500/25 bg-amber-500/5 text-amber-800 dark:text-amber-300",
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
  getCell,
  onChange,
}: {
  room: { propertyRoomId: number; roomCode: string; roomName: string };
  days: string[];
  today: string;
  currencyCode: string | null;
  canEdit: boolean;
  getCell: (roomId: number, date: string) => CellState;
  onChange: (date: string, patch: CellPatch) => void;
}) {
  return (
    <>
      {METRICS.map((metric, metricIndex) => (
        <tr
          key={`${room.propertyRoomId}-${metric.id}`}
          className={cn(
            "border-b",
            metricIndex === METRICS.length - 1 && "border-b-2 border-border/80",
            metric.id === "status" && "bg-muted/10"
          )}
        >
          {metricIndex === 0 ? (
            <td
              rowSpan={METRICS.length}
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
}: {
  date: string;
  today: string;
  metric: MetricId;
  currencyCode: string | null;
  state: CellState;
  canEdit: boolean;
  onChange: (patch: CellPatch) => void;
}) {
  const allotment = effectiveAllotment(state);
  const rate = effectiveRate(state);
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
  } else if (metric === "rate") {
    display = formatAmount(rate);
    valueClass = cn(
      rate == null ? "text-muted-foreground" : "font-medium text-blue-700 dark:text-blue-400",
      state.dailyRateAmount != null && "underline decoration-dotted decoration-blue-500/70"
    );
  } else if (metric === "minLos") {
    display = state.minLengthOfStay != null ? String(state.minLengthOfStay) : "·";
    valueClass = state.minLengthOfStay != null ? "font-medium tabular-nums" : "text-muted-foreground";
  } else if (metric === "maxLos") {
    display = state.maxLengthOfStay != null ? String(state.maxLengthOfStay) : "·";
    valueClass = state.maxLengthOfStay != null ? "font-medium tabular-nums" : "text-muted-foreground";
  } else {
    display = statusLabel(kind);
    valueClass = cn("rounded px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide", statusTone(kind));
  }

  const cellTone =
    kind === "stopSell"
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
                metric === "status" && "text-[10px]"
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
}: {
  date: string;
  currencyCode: string | null;
  state: CellState;
  canEdit: boolean;
  onChange: (patch: CellPatch) => void;
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
          Edit daily ARI: allotment, rate, length of stay, and stop sell. Contract blackouts remain read-only.
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
                placeholder="—"
                onChange={(e) => {
                  const raw = e.target.value;
                  onChange({
                    minLengthOfStay: raw === "" ? null : Math.max(1, Number(raw) || 1),
                  });
                }}
              />
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
                placeholder="—"
                onChange={(e) => {
                  const raw = e.target.value;
                  onChange({
                    maxLengthOfStay: raw === "" ? null : Math.max(1, Number(raw) || 1),
                  });
                }}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs">
            <Checkbox
              checked={state.stopSell}
              onCheckedChange={(checked) => onChange({ stopSell: checked === true })}
            />
            Stop sell (daily)
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
          <dd className="text-right font-mono tabular-nums">{state.minLengthOfStay ?? "—"}</dd>
          <dt className="text-muted-foreground">Max LOS</dt>
          <dd className="text-right font-mono tabular-nums">{state.maxLengthOfStay ?? "—"}</dd>
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
