"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Loader2, ListTodo } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchableCombobox } from "@/components/shared/SearchableCombobox";
import {
  saveAvailabilityCalendar,
  PropertyRoomAvailabilityApiError,
} from "@/lib/services/property-room-availability.service";
import {
  listPropertyContractSeasonPeriods,
  PropertyContractSeasonPeriodsApiError,
} from "@/lib/services/property-contract-season-periods.service";
import type { AvailabilityCalendarUpdate } from "@/types/property-room-availability";
import type { PropertyContractSeasonPeriod } from "@/types";

const WEEKDAYS = [
  { id: 1, label: "Mon" },
  { id: 2, label: "Tue" },
  { id: 3, label: "Wed" },
  { id: 4, label: "Thu" },
  { id: 5, label: "Fri" },
  { id: 6, label: "Sat" },
  { id: 0, label: "Sun" },
] as const;

function parseIso(date: string) {
  return new Date(`${date}T12:00:00.000Z`);
}

function toIso(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function datesInRange(from: string, to: string, weekdays: Set<number>): string[] {
  if (!from || !to || from > to) return [];
  const out: string[] = [];
  const cursor = parseIso(from);
  const end = parseIso(to);
  while (cursor <= end) {
    if (weekdays.has(cursor.getUTCDay())) out.push(toIso(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

function seasonPeriodLabel(p: PropertyContractSeasonPeriod) {
  const season = p.seasonName ?? p.seasonCode ?? "Season";
  return `${season} (${p.fromDate} → ${p.toDate})`;
}

function clampToSeason(from: string, to: string, seasonFrom: string, seasonTo: string) {
  const start = from < seasonFrom ? seasonFrom : from;
  const end = to > seasonTo ? seasonTo : to;
  if (start > end) return { from: seasonFrom, to: seasonTo };
  return { from: start, to: end };
}

export function AvailabilityBulkChangeDialog({
  open,
  onOpenChange,
  tenantId,
  companyId,
  propertyId,
  actorKey,
  rooms,
  defaultFrom,
  defaultTo,
  onApplied,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: number;
  companyId: number;
  propertyId: number;
  actorKey: number;
  rooms: { propertyRoomId: number; roomCode: string; roomName: string }[];
  defaultFrom: string;
  defaultTo: string;
  onApplied: () => Promise<void>;
}) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [weekdays, setWeekdays] = useState<Set<number>>(() => new Set(WEEKDAYS.map((d) => d.id)));
  const [roomIds, setRoomIds] = useState<Set<number>>(() => new Set(rooms.map((r) => r.propertyRoomId)));
  const [saving, setSaving] = useState(false);
  const [periods, setPeriods] = useState<PropertyContractSeasonPeriod[]>([]);
  const [periodsLoading, setPeriodsLoading] = useState(false);
  const [periodId, setPeriodId] = useState(0);

  const [applyAllotment, setApplyAllotment] = useState(false);
  const [allotment, setAllotment] = useState("");
  const [applyRate, setApplyRate] = useState(false);
  const [rate, setRate] = useState("");
  const [applyMinLos, setApplyMinLos] = useState(false);
  const [minLos, setMinLos] = useState("");
  const [applyMaxLos, setApplyMaxLos] = useState(false);
  const [maxLos, setMaxLos] = useState("");
  const [applyStopSell, setApplyStopSell] = useState(false);
  const [applyCta, setApplyCta] = useState(false);
  const [applyCtd, setApplyCtd] = useState(false);

  const selectedPeriod = periods.find((p) => p.propertyContractSeasonPeriodKey === periodId) ?? null;

  useEffect(() => {
    if (!open) return;
    setPeriodId(0);
    setFromDate("");
    setToDate("");
    setWeekdays(new Set(WEEKDAYS.map((d) => d.id)));
    setRoomIds(new Set(rooms.map((r) => r.propertyRoomId)));
    setApplyAllotment(false);
    setAllotment("");
    setApplyRate(false);
    setRate("");
    setApplyMinLos(false);
    setMinLos("");
    setApplyMaxLos(false);
    setMaxLos("");
    setApplyStopSell(false);
    setApplyCta(false);
    setApplyCtd(false);

    let cancelled = false;
    setPeriodsLoading(true);
    listPropertyContractSeasonPeriods({
      tenantId,
      propertyId,
      activeOnly: true,
    })
      .then((rows) => {
        if (!cancelled) setPeriods(rows);
      })
      .catch((err) => {
        if (cancelled) return;
        setPeriods([]);
        toast.error(
          err instanceof PropertyContractSeasonPeriodsApiError
            ? err.message
            : "Failed to load season periods"
        );
      })
      .finally(() => {
        if (!cancelled) setPeriodsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, defaultFrom, defaultTo, rooms, tenantId, propertyId]);

  function selectPeriod(id: number) {
    setPeriodId(id);
    const period = periods.find((p) => p.propertyContractSeasonPeriodKey === id);
    if (!period) {
      setFromDate("");
      setToDate("");
      return;
    }
    const clamped = clampToSeason(defaultFrom, defaultTo, period.fromDate, period.toDate);
    setFromDate(clamped.from);
    setToDate(clamped.to);
  }

  const dates = useMemo(
    () => datesInRange(fromDate, toDate, weekdays),
    [fromDate, toDate, weekdays]
  );
  const cellCount = dates.length * roomIds.size;

  function toggleWeekday(id: number, checked: boolean) {
    setWeekdays((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleRoom(id: number, checked: boolean) {
    setRoomIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function apply() {
    if (!selectedPeriod) {
      toast.error("Select a season period first");
      return;
    }
    if (!fromDate || !toDate) {
      toast.error("Select a date range within the season period");
      return;
    }
    if (fromDate < selectedPeriod.fromDate || toDate > selectedPeriod.toDate) {
      toast.error("Date range must stay inside the selected season period");
      return;
    }
    if (fromDate > toDate) {
      toast.error("To date must be on or after from date");
      return;
    }
    if (weekdays.size === 0) {
      toast.error("Select at least one day of week");
      return;
    }
    if (roomIds.size === 0) {
      toast.error("Select at least one room type");
      return;
    }
    if (!applyAllotment && !applyRate && !applyMinLos && !applyMaxLos && !applyStopSell && !applyCta && !applyCtd) {
      toast.error("Choose at least one value to update");
      return;
    }
    if (dates.length === 0) {
      toast.error("No dates match the selected range and weekdays");
      return;
    }
    if (cellCount > 2000) {
      toast.error("Range is too large. Narrow the dates, weekdays, or rooms.");
      return;
    }

    const patch: Omit<AvailabilityCalendarUpdate, "propertyRoomId" | "availabilityDate"> = {};
    if (applyAllotment) {
      const n = Math.max(0, Math.floor(Number(allotment) || 0));
      patch.availableUnits = n;
    }
    if (applyRate) {
      patch.dailyRateAmount = rate === "" ? null : Math.max(0, Number(rate) || 0);
    }
    if (applyMinLos) {
      patch.minLengthOfStay = minLos === "" ? null : Math.max(1, Number(minLos) || 1);
    }
    if (applyMaxLos) {
      patch.maxLengthOfStay = maxLos === "" ? null : Math.max(1, Number(maxLos) || 1);
    }
    if (applyStopSell) patch.stopSell = true;
    if (applyCta) patch.closedToArrival = true;
    if (applyCtd) patch.closedToDeparture = true;

    const updates: AvailabilityCalendarUpdate[] = [];
    for (const propertyRoomId of roomIds) {
      for (const availabilityDate of dates) {
        updates.push({ propertyRoomId, availabilityDate, ...patch });
      }
    }

    setSaving(true);
    try {
      const result = await saveAvailabilityCalendar({
        tenantId,
        companyId,
        propertyId,
        createdBy: actorKey,
        updates,
      });
      toast.success(`Updated ${result.saved} room-day ${result.saved === 1 ? "value" : "values"}`);
      onOpenChange(false);
      await onApplied();
    } catch (err) {
      toast.error(err instanceof PropertyRoomAvailabilityApiError ? err.message : "Could not apply bulk change");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk change</DialogTitle>
          <DialogDescription>
            Choose a season period, then a date range inside it. Tick only the values to apply.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label required>Season period</Label>
            {periodsLoading ? (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading season periods…
              </p>
            ) : periods.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No active season periods for this property. Add one on the contract first.
              </p>
            ) : (
              <SearchableCombobox
                value={periodId > 0 ? periodId : null}
                onChange={selectPeriod}
                options={periods.map((p) => ({
                  value: p.propertyContractSeasonPeriodKey,
                  label: seasonPeriodLabel(p),
                  sublabel: p.contractNumber ?? p.contractName,
                }))}
                placeholder="Select season period"
                emptyLabel="No matching season period"
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bulk-from" required>
                From date
              </Label>
              <Input
                id="bulk-from"
                type="date"
                disabled={!selectedPeriod}
                min={selectedPeriod?.fromDate}
                max={selectedPeriod?.toDate}
                value={fromDate}
                onChange={(e) => {
                  const next = e.target.value;
                  if (!selectedPeriod) return;
                  const clamped = next < selectedPeriod.fromDate ? selectedPeriod.fromDate : next;
                  setFromDate(clamped);
                  if (toDate && clamped > toDate) setToDate(clamped);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bulk-to" required>
                To date
              </Label>
              <Input
                id="bulk-to"
                type="date"
                disabled={!selectedPeriod}
                min={fromDate || selectedPeriod?.fromDate}
                max={selectedPeriod?.toDate}
                value={toDate}
                onChange={(e) => {
                  const next = e.target.value;
                  if (!selectedPeriod) return;
                  const clamped = next > selectedPeriod.toDate ? selectedPeriod.toDate : next;
                  setToDate(clamped);
                }}
              />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {selectedPeriod
              ? `Dates must stay inside ${selectedPeriod.fromDate} → ${selectedPeriod.toDate}. Same from and to updates a single day.`
              : "Select a season period to enable the date range."}
          </p>

          <div className="space-y-1.5">
            <Label required>Days of week</Label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((day) => (
                <label key={day.id} className="flex items-center gap-1.5 text-xs">
                  <Checkbox
                    checked={weekdays.has(day.id)}
                    onCheckedChange={(checked) => toggleWeekday(day.id, checked === true)}
                  />
                  {day.label}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label required>Room types</Label>
              <button
                type="button"
                className="text-[11px] text-primary hover:underline"
                onClick={() =>
                  setRoomIds(
                    roomIds.size === rooms.length
                      ? new Set()
                      : new Set(rooms.map((r) => r.propertyRoomId))
                  )
                }
              >
                {roomIds.size === rooms.length ? "Clear all" : "Select all"}
              </button>
            </div>
            <div className="max-h-32 space-y-1.5 overflow-y-auto rounded-md border p-2">
              {rooms.map((room) => (
                <label key={room.propertyRoomId} className="flex items-center gap-2 text-xs">
                  <Checkbox
                    checked={roomIds.has(room.propertyRoomId)}
                    onCheckedChange={(checked) => toggleRoom(room.propertyRoomId, checked === true)}
                  />
                  <span className="font-medium">{room.roomName}</span>
                  <span className="text-muted-foreground">{room.roomCode}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2 rounded-md border p-3">
            <p className="text-xs font-medium">Values to update</p>
            <p className="text-[11px] text-muted-foreground">
              Tick a row to change it. Unticked values stay as they are.
            </p>

            <BulkValueRow
              checked={applyAllotment}
              onCheckedChange={setApplyAllotment}
              label="Allotment"
              htmlFor="bulk-allotment"
            >
              <Input
                id="bulk-allotment"
                type="number"
                min={0}
                className="h-8"
                disabled={!applyAllotment}
                value={allotment}
                onChange={(e) => setAllotment(e.target.value)}
                placeholder="Units"
              />
            </BulkValueRow>

            <BulkValueRow checked={applyRate} onCheckedChange={setApplyRate} label="Rate" htmlFor="bulk-rate">
              <Input
                id="bulk-rate"
                type="number"
                min={0}
                step="0.01"
                className="h-8"
                disabled={!applyRate}
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="Amount"
              />
            </BulkValueRow>

            <BulkValueRow
              checked={applyMinLos}
              onCheckedChange={setApplyMinLos}
              label="Min LOS"
              htmlFor="bulk-minlos"
            >
              <Input
                id="bulk-minlos"
                type="number"
                min={1}
                className="h-8"
                disabled={!applyMinLos}
                value={minLos}
                onChange={(e) => setMinLos(e.target.value)}
                placeholder="Nights"
              />
            </BulkValueRow>

            <BulkValueRow
              checked={applyMaxLos}
              onCheckedChange={setApplyMaxLos}
              label="Max LOS"
              htmlFor="bulk-maxlos"
            >
              <Input
                id="bulk-maxlos"
                type="number"
                min={1}
                className="h-8"
                disabled={!applyMaxLos}
                value={maxLos}
                onChange={(e) => setMaxLos(e.target.value)}
                placeholder="Nights"
              />
            </BulkValueRow>

            <label className="flex items-center gap-2 pt-1 text-xs">
              <Checkbox
                checked={applyStopSell}
                onCheckedChange={(checked) => setApplyStopSell(checked === true)}
              />
              Stop sell
            </label>
            <label className="flex items-center gap-2 text-xs">
              <Checkbox
                checked={applyCta}
                onCheckedChange={(checked) => setApplyCta(checked === true)}
              />
              Close on arrival — no check-in
            </label>
            <label className="flex items-center gap-2 text-xs">
              <Checkbox
                checked={applyCtd}
                onCheckedChange={(checked) => setApplyCtd(checked === true)}
              />
              Close on departure — no check-out
            </label>
          </div>

          <p className="text-xs text-muted-foreground">
            {cellCount > 0
              ? `${cellCount} room-day${cellCount === 1 ? "" : "s"} will be updated.`
              : "No matching room-days."}
          </p>
        </div>

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
          <Button type="button" disabled={saving || !selectedPeriod || cellCount === 0} onClick={() => void apply()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ListTodo className="h-4 w-4" />}
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BulkValueRow({
  checked,
  onCheckedChange,
  label,
  htmlFor,
  children,
}: {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[1.35fr_1fr] items-center gap-2">
      <label htmlFor={htmlFor} className="flex items-center gap-2 text-xs">
        <Checkbox checked={checked} onCheckedChange={(v) => onCheckedChange(v === true)} />
        {label}
      </label>
      {children}
    </div>
  );
}
