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
import { listPropertySeasons } from "@/lib/services/property-seasons.service";
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
  PropertySeason,
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

function sanitizeAmountInput(raw: string): string {
  let value = raw.replace(/[^0-9.]/g, "");
  const firstDot = value.indexOf(".");
  if (firstDot !== -1) {
    value = value.slice(0, firstDot + 1) + value.slice(firstDot + 1).replace(/\./g, "");
  }
  return value;
}

function isNegativeAmount(value: string | undefined): boolean {
  if (!value || value.trim() === "") return false;
  const n = Number(value);
  return !Number.isNaN(n) && n < 0;
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

  const [propertySeasons, setPropertySeasons] = useState<PropertySeason[]>([]);
  const [seasonPeriods, setSeasonPeriods] = useState<PropertyContractSeasonPeriod[]>([]);
  const [contractRatePlans, setContractRatePlans] = useState<PropertyContractRatePlan[]>([]);
  const [ratePlanTypes, setRatePlanTypes] = useState<RatePlanType[]>([]);
  const [daysOfWeek, setDaysOfWeek] = useState<DayOfWeek[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [seasonMasterId, setSeasonMasterId] = useState<number | null>(null);
  const [selectedPeriodIds, setSelectedPeriodIds] = useState<number[]>([]);
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
      const [seasonsResult, periodsResult, plansResult, typesResult, daysResult] = await Promise.allSettled([
        tenantKey > 0 && companyKey > 0
          ? listPropertySeasons({ tenantId: tenantKey, companyId: companyKey, propertyId: contract.propertyId, activeOnly: true })
          : Promise.resolve([] as PropertySeason[]),
        listPropertyContractSeasonPeriods({ propertyContractId: contract.propertyContractKey }),
        listPropertyContractRatePlans({ propertyContractId: contract.propertyContractKey }),
        tenantKey > 0 && companyKey > 0
          ? listRatePlanTypes({ tenantId: tenantKey, companyId: companyKey, activeOnly: true })
          : Promise.resolve([] as RatePlanType[]),
        listDayOfWeeks({ activeOnly: true }),
      ]);

      if (cancelled) return;

      const failures: string[] = [];
      const seasons = seasonsResult.status === "fulfilled" ? seasonsResult.value : [];
      const periods = periodsResult.status === "fulfilled" ? periodsResult.value : [];
      const plans = plansResult.status === "fulfilled" ? plansResult.value : [];
      const types = typesResult.status === "fulfilled" ? typesResult.value : [];
      const days = daysResult.status === "fulfilled" ? daysResult.value : [];

      if (seasonsResult.status === "rejected") failures.push("property seasons");
      if (periodsResult.status === "rejected") failures.push("season periods");
      if (plansResult.status === "rejected") failures.push("rate plans");
      if (typesResult.status === "rejected") failures.push("rate plan types");
      if (daysResult.status === "rejected") failures.push("days of week");

      const resolvedDays = days.length > 0 ? days : FALLBACK_DAYS_OF_WEEK;
      setPropertySeasons(seasons);
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

      const nextRatePlanTypeId =
        Number.isFinite(initialRatePlanTypeId) && initialRatePlanTypeId > 0
          ? initialRatePlanTypeId
          : typeOptions.length === 1
            ? typeOptions[0]!.ratePlanTypeId
            : null;

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
  }, [tenantKey, companyKey, contract.propertyContractKey, contract.propertyId, initialSeasonPeriodId, initialRatePlanTypeId]);

  const loadMatrix = useCallback(async () => {
    if (!structuralPeriodId || !ratePlanTypeId) {
      setMatrixMeta(null);
      setCells({});
      return;
    }
    setLoadingMatrix(true);
    try {
      const data = await getPropertyContractRateMatrix({
        propertyContractId: contract.propertyContractKey,
        propertyContractSeasonPeriodId: structuralPeriodId,
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
      if (isSinglePeriod) {
        // Only prefill amounts/rate ids when exactly one period is targeted — its
        // propertyContractRateId values belong to that period and must not be reused
        // when saving multiple periods (would relocate this period's rows onto another).
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
      } else {
        setCells({});
        setSelectedDayIds(presetDayIds("all", daysOfWeek));
        setDayPreset("all");
      }
    } catch (err) {
      toast.error(err instanceof PropertyContractRatesApiError ? err.message : "Failed to load rate matrix");
      setMatrixMeta(null);
    } finally {
      setLoadingMatrix(false);
    }
  }, [structuralPeriodId, isSinglePeriod, ratePlanTypeId, contract.propertyContractKey, contract.contractCurrencyCode, daysOfWeek]);

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
    const sanitized = sanitizeAmountInput(value);
    setCells((prev) => ({
      ...prev,
      [key]: { ...prev[key], amount: sanitized, rateId: prev[key]?.rateId },
    }));
  }

  async function handleSubmit() {
    if (selectedPeriodIds.length === 0 || !ratePlanTypeId) {
      toast.error("Select a season, at least one period, and rate plan type.");
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

    const hasNegative = payloadCells.some((c) => c.rateAmount != null && c.rateAmount < 0);
    if (hasNegative) {
      toast.error("Rate amounts cannot be negative.");
      return;
    }

    setSubmitting(true);

    // Strong duplicate guard: when multiple periods are targeted, none of them were
    // prefilled from existing data (to avoid the propertyContractRateId cross-period
    // reuse bug), so a cell the user is entering here could silently collide with a
    // rate that already exists for that season + rate plan + room + occupancy on one
    // of the other selected periods. Check every selected period's live data before
    // attempting any save, and block the whole submission if a collision is found.
    if (selectedPeriodIds.length > 1) {
      const enteredCells = payloadCells.filter((c) => c.rateAmount != null);
      const conflicts: string[] = [];
      for (const periodId of selectedPeriodIds) {
        try {
          const data = await getPropertyContractRateMatrix({
            propertyContractId: contract.propertyContractKey,
            propertyContractSeasonPeriodId: periodId,
            ratePlanTypeId,
          });
          const existingKeys = new Set(
            data.cells
              .filter((c) => c.rateAmount != null)
              .map((c) => cellKey(c.propertyContractRatePlanId, c.propertyRoomId, c.occupancyTypeId))
          );
          const dupCount = enteredCells.filter((c) =>
            existingKeys.has(cellKey(c.propertyContractRatePlanId, c.propertyRoomId, c.occupancyTypeId))
          ).length;
          if (dupCount > 0) {
            const period = seasonPeriods.find((p) => p.propertyContractSeasonPeriodKey === periodId);
            const label = period
              ? `${formatPeriodDate(period.fromDate)} – ${formatPeriodDate(period.toDate)}`
              : `#${periodId}`;
            conflicts.push(`${label} (${dupCount} rate${dupCount === 1 ? "" : "s"} already set)`);
          }
        } catch {
          // If the check itself fails, fall through — the save attempt below will
          // still fail safely per period rather than silently double-writing.
        }
      }
      if (conflicts.length > 0) {
        setSubmitting(false);
        toast.error(
          `Duplicate rates already exist for this season and rate plan — edit these periods individually instead: ${conflicts.join(", ")}`
        );
        return;
      }
    }

    let totalSaved = 0;
    const failedPeriods: string[] = [];
    for (const periodId of selectedPeriodIds) {
      try {
        const result = await savePropertyContractRateMatrix({
          tenantId: tenantKey,
          companyId: companyKey,
          propertyContractId: contract.propertyContractKey,
          propertyContractSeasonPeriodId: periodId,
          ratePlanTypeId,
          dayOfWeekIds: selectedDayIds,
          createdBy: actorKey,
          cells: payloadCells,
        });
        totalSaved += result.saved;
      } catch (err) {
        const period = seasonPeriods.find((p) => p.propertyContractSeasonPeriodKey === periodId);
        const label = period ? `${formatPeriodDate(period.fromDate)} – ${formatPeriodDate(period.toDate)}` : `#${periodId}`;
        const message = err instanceof PropertyContractRatesApiError ? err.message : "save failed";
        failedPeriods.push(`${label} (${message})`);
      }
    }
    setSubmitting(false);

    const savedPeriodCount = selectedPeriodIds.length - failedPeriods.length;
    if (savedPeriodCount > 0) {
      toast.success(
        `${totalSaved} rate${totalSaved === 1 ? "" : "s"} saved across ${savedPeriodCount} period${savedPeriodCount === 1 ? "" : "s"}`
      );
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

  const currency = matrixMeta?.currencyCode ?? contract.contractCurrencyCode ?? "—";
  const showMatrix = selectedPeriodIds.length > 0 && ratePlanTypeId && matrixMeta && !loadingMatrix;

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
          <div className="flex flex-wrap gap-x-6 gap-y-1 pt-1 text-xs text-muted-foreground">
            <span>
              Property <span className="font-medium text-foreground">{contract.propertyName ?? "—"}</span>
            </span>
            <span>
              Supplier <span className="font-medium text-foreground">{contract.supplierName ?? "—"}</span>
            </span>
          </div>
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
                The rate matrix below will be saved identically to all {selectedPeriods.length} selected periods.
              </p>
            )}
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

      {!loadingMatrix && selectedPeriodIds.length > 0 && ratePlanTypeId && !matrixMeta && (
        <Card className="p-6 text-sm text-muted-foreground">
          Could not load the rate matrix for this season and rate plan type.
        </Card>
      )}

      {!loadingMatrix && (selectedPeriodIds.length === 0 || !ratePlanTypeId) && (
        <Card className="border-dashed p-6 text-sm text-muted-foreground">
          Select a <strong className="text-foreground">season</strong>, at least one{" "}
          <strong className="text-foreground">period</strong>, and{" "}
          <strong className="text-foreground">rate plan type</strong> above to open the rate matrix grid.
        </Card>
      )}

      {selectedPeriodIds.length > 0 && ratePlanTypeId && !loadingMatrix && matrixMeta && matrixMeta.columns.length === 0 && (
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
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Currency</span>
            <span className="font-mono font-semibold">{currency}</span>
          </div>
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
                        const negative = isNegativeAmount(cells[key]?.amount);
                        return (
                          <TableCell
                            key={key}
                            className="border-l border-border p-1"
                          >
                            <Input
                              type="text"
                              inputMode="decimal"
                              aria-invalid={negative}
                              className={`h-8 min-w-[4.5rem] px-2 text-right font-mono text-sm tabular-nums ${negative ? "border-destructive text-destructive focus-visible:ring-destructive" : ""}`}
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
