"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Ban,
  CalendarCheck,
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
  availableUnits: number | null;
  stopSell: boolean;
  dirty: boolean;
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
      const next = new Map<string, CellState>();
      for (const cell of payload.cells) {
        next.set(cellKey(cell.propertyRoomId, cell.availabilityDate), {
          availableUnits: cell.availableUnits,
          stopSell: cell.stopSell,
          dirty: false,
        });
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
    return cells.get(cellKey(roomId, date)) ?? { availableUnits: null, stopSell: false, dirty: false };
  }

  function updateCell(roomId: number, date: string, patch: Partial<Pick<CellState, "availableUnits" | "stopSell">>) {
    setCells((prev) => {
      const key = cellKey(roomId, date);
      const current = prev.get(key) ?? { availableUnits: null, stopSell: false, dirty: false };
      const next = new Map(prev);
      next.set(key, {
        availableUnits: patch.availableUnits !== undefined ? patch.availableUnits : current.availableUnits,
        stopSell: patch.stopSell !== undefined ? patch.stopSell : current.stopSell,
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
    const updates: AvailabilityCalendarCell[] = [];
    for (const [key, state] of cells.entries()) {
      if (!state.dirty) continue;
      const [roomIdStr, date] = key.split(":");
      const propertyRoomId = Number(roomIdStr);
      if (!propertyRoomId || !date) continue;
      updates.push({
        propertyRoomId,
        availabilityDate: date,
        availableUnits: state.availableUnits ?? 0,
        stopSell: state.stopSell,
        minLengthOfStay: null,
        maxLengthOfStay: null,
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
      toast.success(`Saved ${result.saved} availability ${result.saved === 1 ? "entry" : "entries"}`);
      await load();
    } catch (err) {
      toast.error(err instanceof PropertyRoomAvailabilityApiError ? err.message : "Failed to save availability");
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
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-sm bg-emerald-500/20 ring-1 ring-emerald-500/40" />
              Available
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-sm bg-amber-500/20 ring-1 ring-amber-500/40" />
              Zero
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-sm bg-destructive/20 ring-1 ring-destructive/40" />
              Stop sell
            </span>
          </div>
          {canEdit && (
            <Button type="button" size="sm" disabled={saving || dirtyCount === 0} onClick={() => void handleSave()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save{dirtyCount > 0 ? ` (${dirtyCount})` : ""}
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
                    <th className="sticky left-0 z-20 min-w-[11rem] border-r bg-muted/95 px-3 py-2 text-left font-medium">
                      Room type
                    </th>
                    {days.map((date) => (
                      <th
                        key={date}
                        className={cn(
                          "min-w-[2.25rem] px-0.5 py-2 text-center font-medium",
                          isWeekend(date) && "bg-muted/60",
                          date === today && "bg-primary/10 text-primary"
                        )}
                      >
                        <div className="tabular-nums">{dayNumber(date)}</div>
                        <div className="text-[10px] font-normal text-muted-foreground">{dayOfWeekShort(date)}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((room) => (
                    <tr key={room.propertyRoomId} className="border-b last:border-b-0">
                      <td className="sticky left-0 z-10 border-r bg-background px-3 py-2 align-top">
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
  state,
  canEdit,
  onChange,
}: {
  date: string;
  today: string;
  state: CellState;
  canEdit: boolean;
  onChange: (patch: Partial<Pick<CellState, "availableUnits" | "stopSell">>) => void;
}) {
  const units = state.availableUnits;
  const hasValue = units !== null;
  const display = hasValue ? String(units) : "—";

  const tone = state.stopSell
    ? "bg-destructive/15 text-destructive ring-destructive/30"
    : hasValue && units === 0
      ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 ring-amber-500/30"
      : hasValue && units > 0
        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 ring-emerald-500/30"
        : "bg-transparent text-muted-foreground";

  const cellButton = (
    <button
      type="button"
      disabled={!canEdit}
      className={cn(
        "mx-auto flex h-8 w-8 items-center justify-center rounded-md text-[11px] font-medium tabular-nums ring-1 ring-transparent transition-colors",
        tone,
        date === today && "ring-primary/50",
        isWeekend(date) && !hasValue && "bg-muted/30",
        canEdit && "hover:ring-border cursor-pointer",
        !canEdit && "cursor-default"
      )}
    >
      {state.stopSell ? <Ban className="h-3.5 w-3.5" /> : display}
    </button>
  );

  if (!canEdit) {
    return (
      <td className={cn("px-0.5 py-1 text-center align-middle", isWeekend(date) && "bg-muted/20")}>
        {cellButton}
      </td>
    );
  }

  return (
    <td className={cn("px-0.5 py-1 text-center align-middle", isWeekend(date) && "bg-muted/20")}>
      <Popover>
        <PopoverTrigger render={cellButton} />
        <PopoverContent className="w-52 space-y-3" align="center">
          <div className="space-y-1">
            <p className="text-xs font-medium">{date}</p>
            {state.dirty && (
              <Badge variant="outline" className="text-[10px]">
                Unsaved
              </Badge>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`units-${date}`} className="text-xs">
              Available units
            </Label>
            <Input
              id={`units-${date}`}
              type="number"
              min={0}
              className="h-8"
              value={units ?? ""}
              placeholder="0"
              onChange={(e) => {
                const raw = e.target.value;
                onChange({ availableUnits: raw === "" ? 0 : Math.max(0, Number(raw) || 0) });
              }}
            />
          </div>
          <label className="flex items-center gap-2 text-xs">
            <Checkbox
              checked={state.stopSell}
              onCheckedChange={(checked) => onChange({ stopSell: checked === true })}
            />
            Stop sell
          </label>
        </PopoverContent>
      </Popover>
    </td>
  );
}
