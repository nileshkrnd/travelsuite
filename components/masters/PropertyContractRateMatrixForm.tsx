"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { BadgeDollarSign, Loader2, Save, X } from "lucide-react";
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
import { FALLBACK_DAYS_OF_WEEK } from "@/lib/constants/day-of-week-fallback";
import { listPropertyContractSeasonPeriods } from "@/lib/services/property-contract-season-periods.service";
import { listPropertyContractRatePlans } from "@/lib/services/property-contract-rate-plans.service";
import { listRatePlanTypes } from "@/lib/services/rate-plan-types.service";
import { listDayOfWeeks } from "@/lib/services/day-of-weeks.service";
import {
  getPropertyContractRateMatrix,
  savePropertyContractRateMatrix,
  PropertyContractRatesApiError,
} from "@/lib/services/property-contract-rates.service";
import type {
  DayOfWeek,
  PropertyContract,
  PropertyContractRatePlan,
  PropertyContractSeasonPeriod,
  RatePlanType,
} from "@/types";

type DayPreset = "all" | "weekdays" | "weekend" | "custom";

type CellKey = string;

function cellKey(planId: number, roomId: number, occId: number): CellKey {
  return `${planId}-${roomId}-${occId}`;
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

function occupancyShort(code: string) {
  const map: Record<string, string> = { SINGLE: "SGL", DOUBLE: "DBL", TRIPLE: "TPL" };
  return map[code.toUpperCase()] ?? code.slice(0, 3).toUpperCase();
}

function presetDayIds(preset: DayPreset, days: DayOfWeek[]): number[] {
  const byCode = new Map(days.map((d) => [d.dayOfWeekCode, d.dayOfWeekId]));
  if (preset === "all") return days.map((d) => d.dayOfWeekId);
  if (preset === "weekdays") {
    return ["MON", "TUE", "WED", "THU", "FRI"]
      .map((c) => byCode.get(c))
      .filter((id): id is number => id != null);
  }
  if (preset === "weekend") {
    return ["SAT", "SUN"]
      .map((c) => byCode.get(c))
      .filter((id): id is number => id != null);
  }
  return [];
}

function detectPreset(selected: number[], days: DayOfWeek[]): DayPreset {
  const sorted = [...selected].sort((a, b) => a - b);
  const all = presetDayIds("all", days).sort((a, b) => a - b);
  const weekdays = presetDayIds("weekdays", days).sort((a, b) => a - b);
  const weekend = presetDayIds("weekend", days).sort((a, b) => a - b);
  const eq = (a: number[], b: number[]) => a.length === b.length && a.every((v, i) => v === b[i]);
  if (eq(sorted, all)) return "all";
  if (eq(sorted, weekdays)) return "weekdays";
  if (eq(sorted, weekend)) return "weekend";
  return "custom";
}

/** Matrix rate entry — season, days, rate plan type, room × meal plan × occupancy grid. */
export function PropertyContractRateMatrixForm({ contract }: { contract: PropertyContract }) {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSeasonPeriodId = Number(searchParams.get("seasonPeriodId"));
  const initialRatePlanTypeId = Number(searchParams.get("ratePlanTypeId"));
  const sessionUser = useSessionStore((s) => s.user);
  const activeTenant = useTenantStore((s) => s.tenant);
  const tenantKey = sessionUser?.tenantKey ?? activeTenant.tenantKey ?? 0;
  const companyKey = resolveSessionCompanyKey(sessionUser) ?? 0;
  const actorKey = sessionUser?.userKey ?? 0;

  const returnHref = `/${role}/extranet/contracts/${contract.propertyContractKey}?tab=rates`;

  const [seasonPeriods, setSeasonPeriods] = useState<PropertyContractSeasonPeriod[]>([]);
  const [contractRatePlans, setContractRatePlans] = useState<PropertyContractRatePlan[]>([]);
  const [ratePlanTypes, setRatePlanTypes] = useState<RatePlanType[]>([]);
  const [daysOfWeek, setDaysOfWeek] = useState<DayOfWeek[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [seasonPeriodId, setSeasonPeriodId] = useState<number | null>(null);
  const [ratePlanTypeId, setRatePlanTypeId] = useState<number | null>(null);
  const [dayPreset, setDayPreset] = useState<DayPreset>("all");
  const [selectedDayIds, setSelectedDayIds] = useState<number[]>([]);
  const [cells, setCells] = useState<Record<CellKey, { amount: string; rateId?: number }>>({});
  const [matrixMeta, setMatrixMeta] = useState<{
    columns: import("@/types").PropertyContractRateMatrixColumn[];
    rooms: import("@/types").PropertyContractRateMatrixPayload["rooms"];
    occupancies: import("@/types").PropertyContractRateMatrixPayload["occupancies"];
    fromDate?: string;
    toDate?: string;
    seasonName?: string;
    currencyCode?: string;
  } | null>(null);

  const selectedSeason = seasonPeriods.find((p) => p.propertyContractSeasonPeriodKey === seasonPeriodId);

  const availableRatePlanTypes = useMemo(() => {
    const fromMaster = new Map(ratePlanTypes.map((t) => [t.ratePlanTypeId, t]));
    for (const plan of contractRatePlans) {
      if (!fromMaster.has(plan.ratePlanTypeId)) {
        fromMaster.set(plan.ratePlanTypeId, {
          ratePlanTypeId: plan.ratePlanTypeId,
          ratePlanTypeCode: plan.ratePlanTypeCode ?? String(plan.ratePlanTypeId),
          ratePlanTypeName: plan.ratePlanTypeName ?? plan.ratePlanTypeCode ?? "Rate plan type",
          tenantKey: plan.tenantKey,
          companyKey: plan.companyKey,
          displayOrder: 0,
          isActive: true,
          createdBy: 0,
          createdAt: "",
          modifiedBy: null,
          modifiedDtTm: null,
        });
      }
    }
    const usedTypeIds = new Set(contractRatePlans.map((p) => p.ratePlanTypeId));
    return [...fromMaster.values()].filter((t) => usedTypeIds.has(t.ratePlanTypeId));
  }, [contractRatePlans, ratePlanTypes]);

  useEffect(() => {
    let cancelled = false;
    setLoadingLookups(true);

    async function loadLookups() {
      const [periodsResult, plansResult, typesResult, daysResult] = await Promise.allSettled([
        listPropertyContractSeasonPeriods({ propertyContractId: contract.propertyContractKey }),
        listPropertyContractRatePlans({ propertyContractId: contract.propertyContractKey }),
        tenantKey > 0 && companyKey > 0
          ? listRatePlanTypes({ tenantId: tenantKey, companyId: companyKey, activeOnly: true })
          : Promise.resolve([] as RatePlanType[]),
        listDayOfWeeks({ activeOnly: true }),
      ]);

      if (cancelled) return;

      const failures: string[] = [];
      const periods = periodsResult.status === "fulfilled" ? periodsResult.value : [];
      const plans = plansResult.status === "fulfilled" ? plansResult.value : [];
      const types = typesResult.status === "fulfilled" ? typesResult.value : [];
      const days = daysResult.status === "fulfilled" ? daysResult.value : [];

      if (periodsResult.status === "rejected") failures.push("season periods");
      if (plansResult.status === "rejected") failures.push("rate plans");
      if (typesResult.status === "rejected") failures.push("rate plan types");
      if (daysResult.status === "rejected") failures.push("days of week");

      const resolvedDays = days.length > 0 ? days : FALLBACK_DAYS_OF_WEEK;
      setSeasonPeriods(periods);
      setContractRatePlans(plans);
      setRatePlanTypes(types);
      setDaysOfWeek(resolvedDays);
      setSelectedDayIds(presetDayIds("all", resolvedDays));

      const typeOptions = (() => {
        const fromMaster = new Map(types.map((t) => [t.ratePlanTypeId, t]));
        for (const plan of plans) {
          if (!fromMaster.has(plan.ratePlanTypeId)) {
            fromMaster.set(plan.ratePlanTypeId, {
              ratePlanTypeId: plan.ratePlanTypeId,
              ratePlanTypeCode: plan.ratePlanTypeCode ?? String(plan.ratePlanTypeId),
              ratePlanTypeName: plan.ratePlanTypeName ?? plan.ratePlanTypeCode ?? "Rate plan type",
              tenantKey: plan.tenantKey,
              companyKey: plan.companyKey,
              displayOrder: 0,
              isActive: true,
              createdBy: 0,
              createdAt: "",
              modifiedBy: null,
              modifiedDtTm: null,
            });
          }
        }
        const usedTypeIds = new Set(plans.map((p) => p.ratePlanTypeId));
        return [...fromMaster.values()].filter((t) => usedTypeIds.has(t.ratePlanTypeId));
      })();

      const nextSeasonId =
        Number.isFinite(initialSeasonPeriodId) && initialSeasonPeriodId > 0
          ? initialSeasonPeriodId
          : periods.length === 1
            ? periods[0]!.propertyContractSeasonPeriodKey
            : null;
      const nextRatePlanTypeId =
        Number.isFinite(initialRatePlanTypeId) && initialRatePlanTypeId > 0
          ? initialRatePlanTypeId
          : typeOptions.length === 1
            ? typeOptions[0]!.ratePlanTypeId
            : null;

      if (nextSeasonId) setSeasonPeriodId(nextSeasonId);
      if (nextRatePlanTypeId) setRatePlanTypeId(nextRatePlanTypeId);

      if (failures.length > 0) {
        toast.error(`Could not load: ${failures.join(", ")}`);
      }
    }

    void loadLookups().finally(() => {
      if (!cancelled) setLoadingLookups(false);
    });

    return () => {
      cancelled = true;
    };
  }, [tenantKey, companyKey, contract.propertyContractKey, initialSeasonPeriodId, initialRatePlanTypeId]);

  const loadMatrix = useCallback(async () => {
    if (!seasonPeriodId || !ratePlanTypeId) {
      setMatrixMeta(null);
      setCells({});
      return;
    }
    setLoadingMatrix(true);
    try {
      const data = await getPropertyContractRateMatrix({
        propertyContractId: contract.propertyContractKey,
        propertyContractSeasonPeriodId: seasonPeriodId,
        ratePlanTypeId,
      });
      setMatrixMeta({
        columns: data.columns,
        rooms: data.rooms,
        occupancies: data.occupancies,
        fromDate: data.fromDate,
        toDate: data.toDate,
        seasonName: data.seasonName,
        currencyCode: data.currencyCode ?? contract.contractCurrencyCode,
      });
      const nextCells: Record<CellKey, { amount: string; rateId?: number }> = {};
      for (const cell of data.cells) {
        nextCells[cellKey(cell.propertyContractRatePlanId, cell.propertyRoomId, cell.occupancyTypeId)] = {
          amount: cell.rateAmount != null ? String(cell.rateAmount) : "",
          rateId: cell.propertyContractRateId,
        };
      }
      setCells(nextCells);
      if (data.dayOfWeekIds.length > 0) {
        setSelectedDayIds(data.dayOfWeekIds);
        setDayPreset(detectPreset(data.dayOfWeekIds, daysOfWeek));
      } else {
        setSelectedDayIds(presetDayIds("all", daysOfWeek));
        setDayPreset("all");
      }
    } catch (err) {
      toast.error(err instanceof PropertyContractRatesApiError ? err.message : "Failed to load rate matrix");
      setMatrixMeta(null);
    } finally {
      setLoadingMatrix(false);
    }
  }, [seasonPeriodId, ratePlanTypeId, contract.propertyContractKey, contract.contractCurrencyCode, daysOfWeek]);

  useEffect(() => {
    void loadMatrix();
  }, [loadMatrix]);

  function applyPreset(preset: DayPreset) {
    setDayPreset(preset);
    if (preset !== "custom") {
      setSelectedDayIds(presetDayIds(preset, daysOfWeek));
    }
  }

  function toggleDay(dayId: number, checked: boolean) {
    setDayPreset("custom");
    setSelectedDayIds((prev) => {
      const set = new Set(prev);
      if (checked) set.add(dayId);
      else set.delete(dayId);
      return [...set].sort((a, b) => a - b);
    });
  }

  function setCellAmount(planId: number, roomId: number, occId: number, value: string) {
    const key = cellKey(planId, roomId, occId);
    setCells((prev) => ({
      ...prev,
      [key]: { ...prev[key], amount: value, rateId: prev[key]?.rateId },
    }));
  }

  async function handleSubmit() {
    if (!seasonPeriodId || !ratePlanTypeId) {
      toast.error("Select season period and rate plan type.");
      return;
    }
    if (selectedDayIds.length === 0) {
      toast.error("Select at least one applicable day.");
      return;
    }
    if (!matrixMeta || matrixMeta.columns.length === 0) {
      toast.error("No rate plan columns for this selection.");
      return;
    }
    if (!actorKey || tenantKey <= 0 || companyKey <= 0) {
      toast.error("Missing session context — sign in again.");
      return;
    }

    const payloadCells: {
      propertyContractRateId?: number;
      propertyContractRatePlanId: number;
      propertyRoomId: number;
      occupancyTypeId: number;
      rateAmount: number | null;
    }[] = [];

    for (const room of matrixMeta.rooms) {
      for (const col of matrixMeta.columns) {
        for (const occ of matrixMeta.occupancies) {
          const key = cellKey(col.propertyContractRatePlanId, room.propertyRoomId, occ.occupancyTypeId);
          const cell = cells[key];
          const trimmed = cell?.amount?.trim() ?? "";
          payloadCells.push({
            propertyContractRateId: cell?.rateId,
            propertyContractRatePlanId: col.propertyContractRatePlanId,
            propertyRoomId: room.propertyRoomId,
            occupancyTypeId: occ.occupancyTypeId,
            rateAmount: trimmed === "" ? null : Number(trimmed),
          });
        }
      }
    }

    const hasRate = payloadCells.some((c) => c.rateAmount != null && !Number.isNaN(c.rateAmount));
    if (!hasRate) {
      toast.error("Enter at least one rate amount.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await savePropertyContractRateMatrix({
        tenantId: tenantKey,
        companyId: companyKey,
        propertyContractId: contract.propertyContractKey,
        propertyContractSeasonPeriodId: seasonPeriodId,
        ratePlanTypeId,
        dayOfWeekIds: selectedDayIds,
        createdBy: actorKey,
        cells: payloadCells,
      });
      toast.success(`${result.saved} rate${result.saved === 1 ? "" : "s"} saved`);
      router.push(returnHref);
    } catch (err) {
      toast.error(err instanceof PropertyContractRatesApiError ? err.message : "Could not save rates");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingLookups) {
    return <p className="text-sm text-muted-foreground">Loading form…</p>;
  }

  const currency = matrixMeta?.currencyCode ?? contract.contractCurrencyCode ?? "—";
  const showMatrix = seasonPeriodId && ratePlanTypeId && matrixMeta && !loadingMatrix;

  return (
    <div className="max-w-6xl space-y-6">
      <Section
        icon={BadgeDollarSign}
        title="Property contract rate"
        description="Enter contracted rates by season, applicable days, and rate plan type."
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
            <Label required>Rate plan</Label>
            <SearchableCombobox
              value={ratePlanTypeId}
              onChange={(v) => setRatePlanTypeId(v)}
              options={availableRatePlanTypes.map((t) => ({
                value: t.ratePlanTypeId,
                label: t.ratePlanTypeName,
                sublabel: t.ratePlanTypeCode,
              }))}
              placeholder="Select rate plan type (e.g. FIT)…"
              emptyLabel="No rate plan types on this contract."
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

        <div className="space-y-3">
          <Label>Applicable days</Label>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["all", "All Days"],
                ["weekdays", "Weekdays"],
                ["weekend", "Weekend"],
                ["custom", "Custom"],
              ] as const
            ).map(([key, label]) => (
              <Button
                key={key}
                type="button"
                size="sm"
                variant={dayPreset === key ? "default" : "outline"}
                onClick={() => applyPreset(key)}
              >
                {label}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-4 rounded-lg border border-border px-4 py-3">
            {daysOfWeek.map((day) => (
              <label key={day.dayOfWeekId} className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={selectedDayIds.includes(day.dayOfWeekId)}
                  onCheckedChange={(checked) => toggleDay(day.dayOfWeekId, checked === true)}
                />
                <span>{day.shortName}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Currency</span>
          <span className="font-mono font-semibold">{currency}</span>
        </div>
      </Section>

      {loadingMatrix && (
        <p className="text-sm text-muted-foreground">Loading rate matrix…</p>
      )}

      {!loadingMatrix && seasonPeriodId && ratePlanTypeId && !matrixMeta && (
        <Card className="p-6 text-sm text-muted-foreground">
          Could not load the rate matrix for this season and rate plan type.
        </Card>
      )}

      {!loadingMatrix && (!seasonPeriodId || !ratePlanTypeId) && (
        <Card className="border-dashed p-6 text-sm text-muted-foreground">
          Select a <strong className="text-foreground">season period</strong> and{" "}
          <strong className="text-foreground">rate plan type</strong> above to open the rate matrix grid.
        </Card>
      )}

      {seasonPeriodId && ratePlanTypeId && !loadingMatrix && matrixMeta && matrixMeta.columns.length === 0 && (
        <Card className="p-6 text-sm text-muted-foreground">
          No contract rate plans found for this rate plan type. Add rate plans (e.g. RO, BB) under Rate Plans first.
        </Card>
      )}

      {showMatrix && matrixMeta.columns.length > 0 && (
        <Section
          icon={BadgeDollarSign}
          title="Rate matrix"
          description="Enter amounts per room type, meal plan, and occupancy."
        >
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead rowSpan={2} className="min-w-[140px] align-bottom">
                    Room type
                  </TableHead>
                  {matrixMeta.columns.map((col) => (
                    <TableHead
                      key={col.propertyContractRatePlanId}
                      colSpan={matrixMeta.occupancies.length}
                      className="border-l border-border text-center"
                    >
                      {col.mealPlanName}
                    </TableHead>
                  ))}
                </TableRow>
                <TableRow className="bg-muted/30">
                  {matrixMeta.columns.map((col) =>
                    matrixMeta.occupancies.map((occ) => (
                      <TableHead
                        key={`${col.propertyContractRatePlanId}-${occ.occupancyTypeId}`}
                        className="border-l border-border px-2 text-center text-xs font-medium"
                      >
                        {occupancyShort(occ.occupancyTypeCode)}
                      </TableHead>
                    ))
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {matrixMeta.rooms.map((room) => (
                  <TableRow key={room.propertyRoomId}>
                    <TableCell className="font-medium">{room.roomName}</TableCell>
                    {matrixMeta.columns.map((col) =>
                      matrixMeta.occupancies.map((occ) => {
                        const key = cellKey(
                          col.propertyContractRatePlanId,
                          room.propertyRoomId,
                          occ.occupancyTypeId
                        );
                        return (
                          <TableCell
                            key={key}
                            className="border-l border-border p-1"
                          >
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              className="h-8 min-w-[4.5rem] px-2 text-right font-mono text-sm tabular-nums"
                              placeholder="—"
                              value={cells[key]?.amount ?? ""}
                              onChange={(e) =>
                                setCellAmount(
                                  col.propertyContractRatePlanId,
                                  room.propertyRoomId,
                                  occ.occupancyTypeId,
                                  e.target.value
                                )
                              }
                            />
                          </TableCell>
                        );
                      })
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Section>
      )}

      <div className="flex items-center gap-2">
        <Button
          type="button"
          disabled={submitting || !showMatrix}
          onClick={() => void handleSubmit()}
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save rates
        </Button>
        <Button type="button" variant="outline" nativeButton={false} render={<Link href={returnHref} />}>
          <X className="h-4 w-4" />
          Cancel
        </Button>
      </div>
    </div>
  );
}
