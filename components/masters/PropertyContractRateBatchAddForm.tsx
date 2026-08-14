"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { BadgeDollarSign, Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Section } from "@/components/masters/PropertyFormSection";
import { SearchableCombobox } from "@/components/shared/SearchableCombobox";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { resolveSessionCompanyKey } from "@/lib/session-company";
import { listPropertyContractSeasonPeriods } from "@/lib/services/property-contract-season-periods.service";
import { listPropertyContractRatePlans } from "@/lib/services/property-contract-rate-plans.service";
import { listPropertyRooms } from "@/lib/services/property-rooms.service";
import { createOccupancyType, listOccupancyTypes } from "@/lib/services/occupancy-types.service";
import { createPropertyContractRate } from "@/lib/services/property-contract-rates.service";
import type {
  PropertyContract,
  PropertyContractRatePlan,
  PropertyContractSeasonPeriod,
  PropertyRoom,
} from "@/types";
import type { OccupancyType } from "@/types";

let tempIdSeq = 0;
function nextTempId() {
  tempIdSeq += 1;
  return `pending-contract-rate-${tempIdSeq}`;
}

const DEFAULT_OCCUPANCY = [
  { code: "SINGLE", name: "Single", order: 1 },
  { code: "DOUBLE", name: "Double", order: 2 },
  { code: "TRIPLE", name: "Triple", order: 3 },
];

interface RateRow {
  tempId: string;
  propertyContractSeasonPeriodId: number;
  propertyContractRatePlanId: number;
  propertyRoomId: number;
  occupancyTypeId: number;
  rateAmount: number | null;
}

function emptyRow(): RateRow {
  return {
    tempId: nextTempId(),
    propertyContractSeasonPeriodId: 0,
    propertyContractRatePlanId: 0,
    propertyRoomId: 0,
    occupancyTypeId: 0,
    rateAmount: null,
  };
}

function seasonPeriodLabel(p: PropertyContractSeasonPeriod) {
  const season = p.seasonName ?? p.seasonCode ?? "Season";
  return `${season} (${p.fromDate} → ${p.toDate})`;
}

function rowError(row: RateRow): string | null {
  const touched =
    row.propertyContractSeasonPeriodId > 0 ||
    row.propertyContractRatePlanId > 0 ||
    row.propertyRoomId > 0 ||
    row.occupancyTypeId > 0 ||
    row.rateAmount != null;
  if (!touched) return null;
  if (!row.propertyContractSeasonPeriodId) return "Season period is required";
  if (!row.propertyContractRatePlanId) return "Rate plan is required";
  if (!row.propertyRoomId) return "Room type is required";
  if (!row.occupancyTypeId) return "Occupancy type is required";
  if (row.rateAmount == null || row.rateAmount < 0) return "Rate amount is required";
  return null;
}

/** Add multiple contract rates — one row per season/plan/room/occupancy combination. */
export function PropertyContractRateBatchAddForm({ contract }: { contract: PropertyContract }) {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();
  const sessionUser = useSessionStore((s) => s.user);
  const activeTenant = useTenantStore((s) => s.tenant);
  const tenantKey = sessionUser?.tenantKey ?? activeTenant.tenantKey ?? 0;
  const companyKey = resolveSessionCompanyKey(sessionUser) ?? 0;
  const actorKey = sessionUser?.userKey ?? 0;

  const returnHref = `/${role}/extranet/contracts/${contract.propertyContractKey}?tab=rates`;

  const [seasonPeriods, setSeasonPeriods] = useState<PropertyContractSeasonPeriod[]>([]);
  const [ratePlans, setRatePlans] = useState<PropertyContractRatePlan[]>([]);
  const [rooms, setRooms] = useState<PropertyRoom[]>([]);
  const [occupancyTypes, setOccupancyTypes] = useState<OccupancyType[]>([]);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<RateRow[]>([emptyRow()]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const lookupsReady =
    seasonPeriods.length > 0 &&
    ratePlans.length > 0 &&
    rooms.length > 0 &&
    occupancyTypes.length > 0;

  useEffect(() => {
    if (tenantKey <= 0 || companyKey <= 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    async function loadOccupancyTypes() {
      let types = await listOccupancyTypes({
        tenantId: tenantKey,
        companyId: companyKey,
        activeOnly: true,
      });
      if (types.length === 0 && actorKey > 0) {
        for (const item of DEFAULT_OCCUPANCY) {
          try {
            await createOccupancyType({
              occupancyTypeCode: item.code,
              occupancyTypeName: item.name,
              displayOrder: item.order,
              tenantId: tenantKey,
              companyId: companyKey,
              createdBy: actorKey,
            });
          } catch {
            /* ignore duplicate bootstrap */
          }
        }
        types = await listOccupancyTypes({
          tenantId: tenantKey,
          companyId: companyKey,
          activeOnly: true,
        });
      }
      return types;
    }

    Promise.all([
      listPropertyContractSeasonPeriods({ propertyContractId: contract.propertyContractKey }),
      listPropertyContractRatePlans({ propertyContractId: contract.propertyContractKey }),
      listPropertyRooms({ tenantId: tenantKey, propertyId: contract.propertyId, activeOnly: true }),
      loadOccupancyTypes(),
    ])
      .then(([periods, plans, roomRows, occTypes]) => {
        if (cancelled) return;
        setSeasonPeriods(periods);
        setRatePlans(plans);
        setRooms(roomRows);
        setOccupancyTypes(occTypes);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load rate form lookups");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantKey, companyKey, actorKey, contract.propertyContractKey, contract.propertyId]);

  function updateRow(tempId: string, patch: Partial<RateRow>) {
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
    const valid = rows.filter(
      (r) =>
        r.propertyContractSeasonPeriodId > 0 &&
        r.propertyContractRatePlanId > 0 &&
        r.propertyRoomId > 0 &&
        r.occupancyTypeId > 0 &&
        r.rateAmount != null &&
        r.rateAmount >= 0
    );
    if (valid.length === 0) {
      setSubmitError("Add at least one complete rate row.");
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
        await createPropertyContractRate({
          tenantId: tenantKey,
          companyId: companyKey,
          propertyContractId: contract.propertyContractKey,
          propertyContractSeasonPeriodId: row.propertyContractSeasonPeriodId,
          propertyContractRatePlanId: row.propertyContractRatePlanId,
          propertyRoomId: row.propertyRoomId,
          occupancyTypeId: row.occupancyTypeId,
          rateAmount: row.rateAmount!,
          createdBy: actorKey,
        });
      } catch {
        failures += 1;
      }
    }
    setSubmitting(false);
    if (failures === 0) {
      toast.success(`${valid.length} rate${valid.length === 1 ? "" : "s"} added`);
      router.push(returnHref);
    } else {
      toast.error(`${failures} of ${valid.length} rows could not be saved`);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading form…</p>;
  }

  const missingMessage = !seasonPeriods.length
    ? "Add contract season periods first."
    : !ratePlans.length
      ? "Add contract rate plans first."
      : !rooms.length
        ? "Add property room types for this property first."
        : !occupancyTypes.length
          ? "Occupancy types could not be loaded."
          : null;

  return (
    <div className="max-w-3xl space-y-6">
      <Section
        icon={BadgeDollarSign}
        title="Contract rates"
        description={`Set contracted rates for ${contract.contractName} by season, rate plan, room type, and occupancy.`}
      >
        <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
          <p className="font-medium text-foreground">{contract.contractName}</p>
          <p className="text-muted-foreground">
            {contract.contractNumber}
            {contract.propertyName ? ` · ${contract.propertyName}` : ""}
          </p>
        </div>

        {missingMessage ? (
          <p className="text-sm text-muted-foreground">{missingMessage}</p>
        ) : (
          <div className="space-y-4">
            {rows.map((row, index) => {
              const error = rowError(row);
              return (
                <div key={row.tempId} className="rounded-lg border border-border p-4">
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">Rate {index + 1}</p>
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

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label required>Season period</Label>
                      <SearchableCombobox
                        value={
                          row.propertyContractSeasonPeriodId > 0
                            ? row.propertyContractSeasonPeriodId
                            : null
                        }
                        onChange={(v) =>
                          updateRow(row.tempId, { propertyContractSeasonPeriodId: v ?? 0 })
                        }
                        options={seasonPeriods.map((p) => ({
                          value: p.propertyContractSeasonPeriodKey,
                          label: seasonPeriodLabel(p),
                          sublabel: p.seasonCode,
                        }))}
                        placeholder="Search season period…"
                        emptyLabel="No season periods found."
                        ariaInvalid={!!error}
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label required>Rate plan</Label>
                        <SearchableCombobox
                          value={
                            row.propertyContractRatePlanId > 0 ? row.propertyContractRatePlanId : null
                          }
                          onChange={(v) =>
                            updateRow(row.tempId, { propertyContractRatePlanId: v ?? 0 })
                          }
                          options={ratePlans.map((p) => ({
                            value: p.propertyContractRatePlanKey,
                            label: p.ratePlanName,
                            sublabel: p.ratePlanCode,
                          }))}
                          placeholder="Search rate plan…"
                          emptyLabel="No rate plans found."
                          ariaInvalid={!!error}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label required>Room type</Label>
                        <SearchableCombobox
                          value={row.propertyRoomId > 0 ? row.propertyRoomId : null}
                          onChange={(v) => updateRow(row.tempId, { propertyRoomId: v ?? 0 })}
                          options={rooms.map((r) => ({
                            value: r.propertyRoomKey,
                            label: r.roomName,
                            sublabel: r.roomCode,
                          }))}
                          placeholder="Search room type…"
                          emptyLabel="No room types found."
                          ariaInvalid={!!error}
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label required>Occupancy type</Label>
                        <SearchableCombobox
                          value={row.occupancyTypeId > 0 ? row.occupancyTypeId : null}
                          onChange={(v) => updateRow(row.tempId, { occupancyTypeId: v ?? 0 })}
                          options={occupancyTypes.map((o) => ({
                            value: o.occupancyTypeId,
                            label: o.occupancyTypeName,
                            sublabel: o.occupancyTypeCode,
                          }))}
                          placeholder="Search occupancy…"
                          emptyLabel="No occupancy types found."
                          ariaInvalid={!!error}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label required>Rate amount</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.0001"
                          placeholder="0.00"
                          value={row.rateAmount ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            updateRow(row.tempId, {
                              rateAmount: v === "" ? null : Number(v),
                            });
                          }}
                          aria-invalid={!!error}
                        />
                      </div>
                    </div>
                  </div>

                  {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
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
        <Button
          type="button"
          disabled={submitting || !lookupsReady}
          onClick={() => void handleSubmit()}
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save {rows.length > 1 ? `${rows.length} rates` : "rate"}
        </Button>
        <Button type="button" variant="outline" nativeButton={false} render={<Link href={returnHref} />}>
          <X className="h-4 w-4" />
          Cancel
        </Button>
      </div>
    </div>
  );
}
