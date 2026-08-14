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
  contractInventoryStopSell: boolean;
  contractInventoryClosed: boolean;
  contractStopSale: boolean;
  contractBlackout: boolean;
};

function cellKey(roomId: number, date: string) {
  return `${roomId}:${date}`;
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dayOfWeekShort(date: string) {
  const d = new Date(`${date}T12:00:00`);
  return d.toLocaleDateString("en-GB", { weekday: "short" });
}

function isWeekend(date: string) {
  const dow = new Date(`${date}T12:00:00`).getUTCDay();
  return dow === 0 || dow === 6;
}

function dayNumber(date: string) {
  return Number(date.slice(8, 10));
}

function monthLabel(year: number, month: number) {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
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

function cellFromPayload(cell: AvailabilityCalendarCell): CellState {
  const contractAllotment = cell.inventoryAllotment ?? null;
  const hasSavedRow = cell.propertyRoomAvailabilityKey != null;

  let dailyAllotment: number | null = null;
  if (hasSavedRow) {
    dailyAllotment =
      cell.availableUnits ?? cell.dailyInventoryQty ?? null;
  }

  return {
    contractAllotment,
    dailyAllotment,
    hasSavedRow,
    stopSell: hasSavedRow ? (cell.stopSell ?? false) : (cell.stopSell ?? false),
    dirty: false,
    contractRate: cell.contractRate ?? null,
    dailyRateAmount: cell.dailyRateAmount ?? null,
    contractInventoryStopSell: cell.contractInventoryStopSell ?? false,
    contractInventoryClosed: cell.contractInventoryClosed ?? false,
    contractStopSale: cell.contractStopSale ?? false,
    contractBlackout: cell.contractBlackout ?? false,
  };
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
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currencyCode, setCurrencyCode] = useState<string | null>(null);
  const [rooms, setRooms] = useState<{ propertyRoomId: number; roomCode: string; roomName: string }[]>([]);
  const [days, setDays] = useState<string[]>([]);
  const [cells, setCells] = useState<Map<string, CellState>>(new Map());

  const load = useCallback(async () => {
    if (tenantId <= 0 || propertyId <= 0) return;
    setLoading(true);
    try {
      const payload = await getAvailabilityCalendar({ tenantId, propertyId, year, month });
      setRooms(payload.rooms);
      setDays(payload.days);
      setCurrencyCode(payload.currencyCode ?? null);

      const next = new Map<string, CellState>();
      for (const cell of payload.cells) {
        next.set(cellKey(cell.propertyRoomId, cell.availabilityDate), cellFromPayload(cell));
      }
      setCells(next);
    } catch (err) {
      toast.error(err instanceof PropertyRoomAvailabilityApiError ? err.message : "Failed to load calendar");
    } finally {
      setLoading(false);
    }
  }, [tenantId, propertyId, year, month]);

  useEffect(() => {
    void load();
  }, [load]);

  function shiftMonth(delta: number) {
    const d = new Date(Date.UTC(year, month - 1 + delta, 1));
    setYear(d.getUTCFullYear());
    setMonth(d.getUTCMonth() + 1);
  }

  function getCell(roomId: number, date: string): CellState {
    return (
      cells.get(cellKey(roomId, date)) ?? {
        contractAllotment: null,
        dailyAllotment: null,
        hasSavedRow: false,
        stopSell: false,
        dirty: false,
        contractRate: null,
        dailyRateAmount: null,
        contractInventoryStopSell: false,
        contractInventoryClosed: false,
        contractStopSale: false,
        contractBlackout: false,
      }
    );
  }

  function updateCell(
    roomId: number,
    date: string,
    patch: Partial<Pick<CellState, "dailyAllotment" | "stopSell" | "dailyRateAmount">>
  ) {
    setCells((prev) => {
      const key = cellKey(roomId, date);
      const current = prev.get(key) ?? getCell(roomId, date);
      const next = new Map(prev);
      next.set(key, {
        ...current,
        dailyAllotment:
          patch.dailyAllotment !== undefined ? patch.dailyAllotment : current.dailyAllotment,
        stopSell: patch.stopSell !== undefined ? patch.stopSell : current.stopSell,
        dailyRateAmount:
          patch.dailyRateAmount !== undefined ? patch.dailyRateAmount : current.dailyRateAmount,
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

  const today = todayIso();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="icon-sm" onClick={() => shiftMonth(-1)} disabled={loading}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[10rem] text-center text-sm font-medium">{monthLabel(year, month)}</div>
          <Button type="button" variant="outline" size="icon-sm" onClick={() => shiftMonth(1)} disabled={loading}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              const n = new Date();
              setYear(n.getFullYear());
              setMonth(n.getMonth() + 1);
            }}
          >
            Today
          </Button>
          {currencyCode && (
            <span className="text-xs text-muted-foreground">
              Rates in <span className="font-mono font-medium">{currencyCode}</span>
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">ARI</span>
            <span className="text-emerald-700 dark:text-emerald-400">Allotment</span>
            <span className="text-blue-700 dark:text-blue-400">Rate</span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-sm bg-destructive/20 ring-1 ring-destructive/40" />
              Stop sell
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-sm bg-violet-500/20 ring-1 ring-violet-500/40" />
              Blackout
            </span>
          </div>
          {canEdit && (
            <Button type="button" size="sm" disabled={saving || dirtyCount === 0} onClick={() => void handleSave()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save changes{dirtyCount > 0 ? ` (${dirtyCount})` : ""}
            </Button>
          )}
        </div>
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
            <div className="overflow-x-auto">
              <table className="w-full min-w-max border-collapse text-xs">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th
                      rowSpan={2}
                      className="sticky left-0 z-20 min-w-[12rem] border-r bg-muted/95 px-3 py-2 text-left text-xs font-medium align-bottom"
                    >
                      Room type
                    </th>
                    {days.map((date) => (
                      <th
                        key={date}
                        className={cn(
                          "min-w-[4.5rem] border-l px-1 py-1.5 text-center text-xs font-medium",
                          isWeekend(date) && "bg-muted/60",
                          date === today && "bg-primary/10 text-primary"
                        )}
                      >
                        <div className="tabular-nums text-sm">{dayNumber(date)}</div>
                        <div className="text-[10px] font-normal text-muted-foreground">{dayOfWeekShort(date)}</div>
                      </th>
                    ))}
                  </tr>
                  <tr className="border-b bg-muted/30 text-[10px] text-muted-foreground">
                    {days.map((date) => (
                      <th
                        key={`${date}-ari`}
                        className={cn(
                          "border-l px-1 py-1 text-center font-normal",
                          isWeekend(date) && "bg-muted/40",
                          date === today && "bg-primary/5"
                        )}
                      >
                        <div className="grid grid-cols-2 gap-1">
                          <span>Allot</span>
                          <span>Rate</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((room) => (
                    <tr key={room.propertyRoomId} className="border-b last:border-b-0">
                      <td className="sticky left-0 z-10 border-r bg-background px-3 py-2 align-top text-xs">
                        <div className="font-medium leading-tight">{room.roomName}</div>
                        <div className="text-[10px] text-muted-foreground">{room.roomCode}</div>
                      </td>
                      {days.map((date) => {
                        const state = getCell(room.propertyRoomId, date);
                        return (
                          <AvailabilityCell
                            key={date}
                            date={date}
                            today={today}
                            currencyCode={currencyCode}
                            state={state}
                            canEdit={canEdit}
                            onChange={(patch) => updateCell(room.propertyRoomId, date, patch)}
                          />
                        );
                      })}
                    </tr>
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

function AvailabilityCell({
  date,
  today,
  currencyCode,
  state,
  canEdit,
  onChange,
}: {
  date: string;
  today: string;
  currencyCode: string | null;
  state: CellState;
  canEdit: boolean;
  onChange: (patch: Partial<Pick<CellState, "dailyAllotment" | "stopSell" | "dailyRateAmount">>) => void;
}) {
  const allotment = effectiveAllotment(state);
  const rate = effectiveRate(state);
  const hasAllotment = allotment != null;
  const stopSellBlocked =
    state.stopSell ||
    state.contractInventoryStopSell ||
    state.contractStopSale;
  const blackoutBlocked = state.contractInventoryClosed || state.contractBlackout;
  const blocked = stopSellBlocked || blackoutBlocked;
  const rateOverridden = state.dailyRateAmount != null;
  const showAllotmentOverride = allotmentOverridden(state);

  const tone = stopSellBlocked
    ? "bg-destructive/10 ring-destructive/30"
    : blackoutBlocked
      ? "bg-violet-500/10 ring-violet-500/30"
      : hasAllotment && allotment === 0
        ? "bg-amber-500/10 ring-amber-500/30"
        : hasAllotment && allotment > 0
          ? "bg-emerald-500/5 ring-emerald-500/20"
          : "bg-background ring-border/50";

  const cellContent = (
    <>
      {stopSellBlocked && (
        <Ban className="absolute right-1 top-1 h-3 w-3 text-destructive/80" aria-hidden />
      )}
      {!stopSellBlocked && blackoutBlocked && (
        <CalendarX2 className="absolute right-1 top-1 h-3 w-3 text-violet-600/80 dark:text-violet-400/80" aria-hidden />
      )}
      <div className="grid w-full grid-cols-2 gap-1 px-1 py-1.5 tabular-nums">
        <span
          className={cn(
            "text-center font-semibold",
            hasAllotment && allotment === 0 && "text-amber-700 dark:text-amber-400",
            hasAllotment && allotment > 0 && "text-emerald-700 dark:text-emerald-400",
            !hasAllotment && "text-muted-foreground",
            showAllotmentOverride && "underline decoration-dotted decoration-emerald-500/60"
          )}
        >
          {hasAllotment ? allotment : "·"}
        </span>
        <span
          className={cn(
            "text-center font-medium text-blue-700 dark:text-blue-400",
            rateOverridden && "underline decoration-dotted decoration-blue-500/60",
            rate == null && "text-muted-foreground"
          )}
        >
          {formatAmount(rate)}
        </span>
      </div>
    </>
  );

  const popoverBody = (
    <PopoverContent className="w-72 space-y-3" align="center" side="bottom">
      <div className="space-y-1">
        <p className="text-sm font-medium">{date}</p>
        <p className="text-xs text-muted-foreground">
          Allotment is the supplier&apos;s available units for this day. Rate can be overridden daily.
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
          <dd className="text-right font-mono tabular-nums">{hasAllotment ? allotment : "—"}</dd>
          <dt className="text-muted-foreground">Rate</dt>
          <dd className="text-right font-mono tabular-nums">
            {rate != null ? `${formatAmount(rate)}${currencyCode ? ` ${currencyCode}` : ""}` : "—"}
          </dd>
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

  return (
    <td
      className={cn(
        "relative border-l p-0 align-middle",
        isWeekend(date) && "bg-muted/10",
        date === today && "bg-primary/5"
      )}
    >
      {canEdit ? (
        <Popover>
          <PopoverTrigger
            nativeButton={false}
            render={
              <button
                type="button"
                className={cn(
                  "relative flex min-h-[2.5rem] w-full min-w-[4.5rem] items-center justify-center rounded-none ring-1 ring-inset transition-colors",
                  tone,
                  canEdit && "cursor-pointer hover:bg-muted/30",
                  state.dirty && "ring-2 ring-primary/40"
                )}
              />
            }
          >
            {cellContent}
          </PopoverTrigger>
          {popoverBody}
        </Popover>
      ) : (
        <div
          className={cn(
            "relative flex min-h-[2.5rem] w-full min-w-[4.5rem] items-center justify-center ring-1 ring-inset",
            tone
          )}
        >
          {cellContent}
        </div>
      )}
    </td>
  );
}
