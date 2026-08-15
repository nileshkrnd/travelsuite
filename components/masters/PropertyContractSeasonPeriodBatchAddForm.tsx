"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { CalendarDays, Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Section } from "@/components/masters/PropertyFormSection";
import { SearchableCombobox } from "@/components/shared/SearchableCombobox";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { resolveSessionCompanyKey } from "@/lib/session-company";
import { listPropertySeasons } from "@/lib/services/property-seasons.service";
import {
  createPropertyContractSeasonPeriod,
  listPropertyContractSeasonPeriods,
} from "@/lib/services/property-contract-season-periods.service";
import type { PropertyContract, PropertyContractSeasonPeriod, PropertySeason } from "@/types";

let tempIdSeq = 0;
function nextTempId() {
  tempIdSeq += 1;
  return `pending-season-period-${tempIdSeq}`;
}

interface SeasonPeriodRow {
  tempId: string;
  propertySeasonId: number;
  fromDate: string;
  toDate: string;
  minLengthOfStay: number | null;
  maxLengthOfStay: number | null;
}

function emptyRow(): SeasonPeriodRow {
  return {
    tempId: nextTempId(),
    propertySeasonId: 0,
    fromDate: "",
    toDate: "",
    minLengthOfStay: null,
    maxLengthOfStay: null,
  };
}

function rangesOverlap(aFrom: string, aTo: string, bFrom: string, bTo: string): boolean {
  return aFrom <= bTo && bFrom <= aTo;
}

function fieldError(row: SeasonPeriodRow): string | null {
  const touched = row.propertySeasonId > 0 || row.fromDate || row.toDate;
  if (!touched) return null;
  if (!row.propertySeasonId) return "Season is required";
  if (!row.fromDate || !row.toDate) return "From and To dates are required";
  if (row.toDate < row.fromDate) return "To date must be on or after from date";
  if (row.minLengthOfStay != null && row.maxLengthOfStay != null && row.maxLengthOfStay < row.minLengthOfStay) {
    return "Max LOS must be at least Min LOS";
  }
  return null;
}

/** Field errors plus overlap checks — against existing periods on this contract and other rows in this batch. */
function computeRowErrors(
  rows: SeasonPeriodRow[],
  existing: PropertyContractSeasonPeriod[]
): Map<string, string> {
  const errors = new Map<string, string>();
  for (const row of rows) {
    const basic = fieldError(row);
    if (basic) {
      errors.set(row.tempId, basic);
      continue;
    }
    if (!(row.propertySeasonId > 0 && row.fromDate && row.toDate)) continue;

    const existingHit = existing.find((p) => rangesOverlap(row.fromDate, row.toDate, p.fromDate, p.toDate));
    if (existingHit) {
      errors.set(row.tempId, `Overlaps an existing period (${existingHit.fromDate} to ${existingHit.toDate})`);
      continue;
    }

    const rowHit = rows.find(
      (other) =>
        other.tempId !== row.tempId &&
        other.propertySeasonId > 0 &&
        other.fromDate &&
        other.toDate &&
        rangesOverlap(row.fromDate, row.toDate, other.fromDate, other.toDate)
    );
    if (rowHit) {
      errors.set(row.tempId, "Overlaps another row in this batch");
    }
  }
  return errors;
}

/** Add multiple contract season date ranges in one go — a row per period, saved together. */
export function PropertyContractSeasonPeriodBatchAddForm({ contract }: { contract: PropertyContract }) {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();
  const sessionUser = useSessionStore((s) => s.user);
  const activeTenant = useTenantStore((s) => s.tenant);
  const tenantKey = sessionUser?.tenantKey ?? activeTenant.tenantKey ?? 0;
  const companyKey = resolveSessionCompanyKey(sessionUser) ?? 0;
  const actorKey = sessionUser?.userKey ?? 0;

  const returnHref = `/${role}/extranet/contracts/${contract.propertyContractKey}?tab=season-periods`;

  const [seasons, setSeasons] = useState<PropertySeason[]>([]);
  const [existingPeriods, setExistingPeriods] = useState<PropertyContractSeasonPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SeasonPeriodRow[]>([emptyRow()]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (tenantKey <= 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      listPropertySeasons({ tenantId: tenantKey, propertyId: contract.propertyId, activeOnly: true }),
      listPropertyContractSeasonPeriods({
        propertyContractId: contract.propertyContractKey,
        activeOnly: true,
      }),
    ])
      .then(([seasonRows, periodRows]) => {
        if (cancelled) return;
        setSeasons(seasonRows);
        setExistingPeriods(periodRows);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load seasons");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantKey, contract.propertyId, contract.propertyContractKey]);

  const rowErrors = useMemo(() => computeRowErrors(rows, existingPeriods), [rows, existingPeriods]);

  function updateRow(tempId: string, patch: Partial<SeasonPeriodRow>) {
    setRows((prev) => prev.map((r) => (r.tempId === tempId ? { ...r, ...patch } : r)));
  }

  function removeRow(tempId: string) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.tempId !== tempId) : prev));
  }

  async function handleSubmit() {
    setSubmitError(null);
    if (rowErrors.size > 0) {
      setSubmitError("Fix the highlighted rows before saving.");
      return;
    }
    const valid = rows.filter((r) => r.propertySeasonId > 0 && r.fromDate && r.toDate);
    if (valid.length === 0) {
      setSubmitError("Add at least one season period with a season and date range.");
      return;
    }
    if (!actorKey || tenantKey <= 0 || companyKey <= 0) {
      toast.error("Missing session context — sign in again.");
      return;
    }
    setSubmitting(true);
    let failures = 0;
    for (const row of valid) {
      try {
        await createPropertyContractSeasonPeriod({
          tenantId: tenantKey,
          companyId: companyKey,
          propertyContractId: contract.propertyContractKey,
          propertySeasonId: row.propertySeasonId,
          fromDate: row.fromDate,
          toDate: row.toDate,
          minLengthOfStay: row.minLengthOfStay,
          maxLengthOfStay: row.maxLengthOfStay,
          createdBy: actorKey,
        });
      } catch {
        failures += 1;
      }
    }
    setSubmitting(false);
    if (failures === 0) {
      toast.success(`${valid.length} season period${valid.length === 1 ? "" : "s"} added`);
      router.push(returnHref);
    } else {
      toast.error(`${failures} of ${valid.length} rows could not be saved`);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading form…</p>;
  }

  return (
    <div className="max-w-3xl space-y-6">
      <Section
        icon={CalendarDays}
        title="Contract season periods"
        description={`Add one or more season date ranges for ${contract.contractName} on ${contract.propertyName ?? "this property"}. Min/Max length of stay set here becomes the calendar's default for every date in the range, until overridden for a specific day.`}
      >
        <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
          <p className="font-medium text-foreground">{contract.contractName}</p>
          <p className="text-muted-foreground">
            {contract.contractNumber}
            {contract.propertyName ? ` · ${contract.propertyName}` : ""}
          </p>
        </div>

        {seasons.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No seasons for this property yet — create Property Seasons first.
          </p>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => {
              const error = rowErrors.get(row.tempId) ?? null;
              return (
                <div key={row.tempId} className="rounded-lg border border-border p-3">
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_repeat(2,minmax(0,150px))_auto] sm:items-end">
                    <div className="space-y-2">
                      <Label required>Season</Label>
                      <SearchableCombobox
                        value={row.propertySeasonId > 0 ? row.propertySeasonId : null}
                        onChange={(v) => updateRow(row.tempId, { propertySeasonId: v ?? 0 })}
                        options={seasons.map((s) => ({
                          value: s.propertySeasonKey,
                          label: s.seasonName,
                          sublabel: s.seasonCode,
                        }))}
                        placeholder="Search season…"
                        emptyLabel="No seasons found."
                        ariaInvalid={!!error}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label required>From date</Label>
                      <Input
                        type="date"
                        value={row.fromDate}
                        onChange={(e) => updateRow(row.tempId, { fromDate: e.target.value })}
                        aria-invalid={!!error}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label required>To date</Label>
                      <Input
                        type="date"
                        value={row.toDate}
                        onChange={(e) => updateRow(row.tempId, { toDate: e.target.value })}
                        aria-invalid={!!error}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeRow(row.tempId)}
                      disabled={rows.length === 1}
                      aria-label="Remove row"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-[repeat(2,minmax(0,150px))]">
                    <div className="space-y-2">
                      <Label>Min length of stay</Label>
                      <Input
                        type="number"
                        min={1}
                        placeholder="No minimum"
                        value={row.minLengthOfStay ?? ""}
                        onChange={(e) => {
                          const raw = e.target.value;
                          updateRow(row.tempId, {
                            minLengthOfStay: raw === "" ? null : Math.max(1, Number(raw) || 1),
                          });
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max length of stay</Label>
                      <Input
                        type="number"
                        min={1}
                        placeholder="No maximum"
                        value={row.maxLengthOfStay ?? ""}
                        onChange={(e) => {
                          const raw = e.target.value;
                          updateRow(row.tempId, {
                            maxLengthOfStay: raw === "" ? null : Math.max(1, Number(raw) || 1),
                          });
                        }}
                      />
                    </div>
                  </div>
                  {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
                </div>
              );
            })}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRows((prev) => [...prev, emptyRow()])}
            >
              <Plus className="h-3.5 w-3.5" />
              Add another row
            </Button>
          </div>
        )}

        {submitError && <p className="text-sm text-destructive">{submitError}</p>}
      </Section>

      <div className="flex items-center gap-2">
        <Button type="button" disabled={submitting || seasons.length === 0} onClick={() => void handleSubmit()}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save {rows.length > 1 ? `${rows.length} periods` : "period"}
        </Button>
        <Button type="button" variant="outline" nativeButton={false} render={<Link href={returnHref} />}>
          <X className="h-4 w-4" />
          Cancel
        </Button>
      </div>
    </div>
  );
}
