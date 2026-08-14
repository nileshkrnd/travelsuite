"use client";

import { useEffect, useState } from "react";
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
import { createPropertyContractSeasonPeriod } from "@/lib/services/property-contract-season-periods.service";
import type { PropertyContract, PropertySeason } from "@/types";

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
}

function emptyRow(): SeasonPeriodRow {
  return { tempId: nextTempId(), propertySeasonId: 0, fromDate: "", toDate: "" };
}

function rowError(row: SeasonPeriodRow): string | null {
  const touched = row.propertySeasonId > 0 || row.fromDate || row.toDate;
  if (!touched) return null;
  if (!row.propertySeasonId) return "Season is required";
  if (!row.fromDate || !row.toDate) return "From and To dates are required";
  if (row.toDate < row.fromDate) return "To date must be on or after from date";
  return null;
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
    listPropertySeasons({ tenantId: tenantKey, propertyId: contract.propertyId, activeOnly: true })
      .then((rows) => {
        if (!cancelled) setSeasons(rows);
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
  }, [tenantKey, contract.propertyId]);

  function updateRow(tempId: string, patch: Partial<SeasonPeriodRow>) {
    setRows((prev) => prev.map((r) => (r.tempId === tempId ? { ...r, ...patch } : r)));
  }

  function removeRow(tempId: string) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.tempId !== tempId) : prev));
  }

  async function handleSubmit() {
    setSubmitError(null);
    if (rows.some((r) => rowError(r))) {
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
        description={`Add one or more season date ranges for ${contract.contractName} on ${contract.propertyName ?? "this property"}.`}
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
              const error = rowError(row);
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
