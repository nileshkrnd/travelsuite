"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableCombobox } from "@/components/shared/SearchableCombobox";
import { DayOfWeekCompactSelect } from "@/components/masters/DayOfWeekCompactSelect";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { resolveSessionCompanyKey } from "@/lib/session-company";
import {
  stopSaleTypeNeedsRatePlan,
  stopSaleTypeNeedsRoom,
} from "@/lib/constants/stop-sale-types";
import { listPropertyRooms } from "@/lib/services/property-rooms.service";
import { listPropertyContractRatePlans } from "@/lib/services/property-contract-rate-plans.service";
import { listDayOfWeeks } from "@/lib/services/day-of-weeks.service";
import {
  createPropertyContractStopSale,
  updatePropertyContractStopSale,
  ensureDefaultStopSaleTypes,
  ensureDefaultStopSaleReasons,
  listStopSaleTypes,
  listStopSaleReasons,
  PropertyContractStopSaleApiError,
} from "@/lib/services/property-contract-stop-sales.service";
import type { PropertyContract, PropertyContractRatePlan, PropertyRoom } from "@/types";
import type { DayOfWeek } from "@/types/day-of-week";
import type { StopSaleReason } from "@/types/stop-sale-reason";
import type { StopSaleType } from "@/types/stop-sale-type";
import type { PropertyContractStopSale } from "@/types/property-contract-stop-sale";

const baseRowSchema = z.object({
  stopSaleTypeId: z.number().int().positive("Choose a type"),
  propertyRoomId: z.number().int().positive().nullable(),
  propertyContractRatePlanId: z.number().int().positive().nullable(),
  fromDate: z.string().min(1, "Required"),
  toDate: z.string().min(1, "Required"),
  stopSaleReasonId: z.number().int().positive().nullable(),
  remarks: z.string().trim().max(500),
  isActive: z.boolean(),
  dayOfWeekIds: z.array(z.number().int().positive()),
});

type RowValues = z.infer<typeof baseRowSchema>;
type FormValues = { rows: RowValues[] };

function blankRow(contract: PropertyContract): RowValues {
  return {
    stopSaleTypeId: 0,
    propertyRoomId: null,
    propertyContractRatePlanId: null,
    fromDate: contract.startDate,
    toDate: contract.endDate,
    stopSaleReasonId: null,
    remarks: "",
    isActive: true,
    dayOfWeekIds: [],
  };
}

function rowFromEntry(entry: PropertyContractStopSale): RowValues {
  return {
    stopSaleTypeId: entry.stopSaleTypeId,
    propertyRoomId: entry.propertyRoomId,
    propertyContractRatePlanId: entry.propertyContractRatePlanId,
    fromDate: entry.fromDate,
    toDate: entry.toDate,
    stopSaleReasonId: entry.stopSaleReasonId,
    remarks: entry.remarks ?? "",
    isActive: entry.isActive,
    dayOfWeekIds: entry.dayOfWeekIds,
  };
}

function rangesOverlap(aFrom: string, aTo: string, bFrom: string, bTo: string): boolean {
  return aFrom <= bTo && bFrom <= aTo;
}

/** Create or edit contract stop sales — spreadsheet-style multi-row entry when adding, single row when editing. */
export function PropertyContractStopSaleForm({
  lockedContract,
  entry,
}: {
  lockedContract: PropertyContract;
  entry?: PropertyContractStopSale;
}) {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();
  const sessionUser = useSessionStore((s) => s.user);
  const activeTenant = useTenantStore((s) => s.tenant);
  const tenantKey =
    sessionUser?.tenantKey ?? activeTenant.tenantKey ?? lockedContract.tenantKey ?? 0;
  const companyKey =
    resolveSessionCompanyKey(sessionUser) ?? lockedContract.companyKey ?? 0;
  const actorKey = sessionUser?.userKey ?? 0;

  const returnHref = `/${role}/extranet/contracts/${lockedContract.propertyContractKey}?tab=stop-sales`;
  const isEdit = !!entry;

  const [rooms, setRooms] = useState<PropertyRoom[]>([]);
  const [ratePlans, setRatePlans] = useState<PropertyContractRatePlan[]>([]);
  const [stopSaleTypes, setStopSaleTypes] = useState<StopSaleType[]>([]);
  const [stopSaleReasons, setStopSaleReasons] = useState<StopSaleReason[]>([]);
  const [daysOfWeek, setDaysOfWeek] = useState<DayOfWeek[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const stopSaleTypesRef = useRef<StopSaleType[]>([]);
  useEffect(() => {
    stopSaleTypesRef.current = stopSaleTypes;
  }, [stopSaleTypes]);

  const rowSchema = useMemo(
    () =>
      baseRowSchema.superRefine((values, ctx) => {
        if (values.fromDate && values.toDate && values.fromDate > values.toDate) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "From date must be on or before to date",
            path: ["toDate"],
          });
        }
        const typeCode =
          stopSaleTypesRef.current
            .find((t) => t.stopSaleTypeKey === values.stopSaleTypeId)
            ?.stopSaleTypeCode.toUpperCase() ?? "";
        if (stopSaleTypeNeedsRoom(typeCode) && !values.propertyRoomId) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Room is required for this type",
            path: ["propertyRoomId"],
          });
        }
        if (stopSaleTypeNeedsRatePlan(typeCode) && !values.propertyContractRatePlanId) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Rate plan is required for this type",
            path: ["propertyContractRatePlanId"],
          });
        }
      }),
    []
  );

  const schema = useMemo(
    () => z.object({ rows: z.array(rowSchema).min(1, "Add at least one row") }),
    [rowSchema]
  );

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { rows: [entry ? rowFromEntry(entry) : blankRow(lockedContract)] },
  });

  const rowArray = useFieldArray({ control, name: "rows" });
  const rows = watch("rows");

  useEffect(() => {
    if (tenantKey <= 0 || companyKey <= 0 || !actorKey) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      listPropertyRooms({
        tenantId: tenantKey,
        propertyId: lockedContract.propertyId,
        activeOnly: true,
      }),
      listPropertyContractRatePlans({
        propertyContractId: lockedContract.propertyContractKey,
        activeOnly: true,
      }),
      listDayOfWeeks({ activeOnly: true }),
      ensureDefaultStopSaleTypes({
        tenantId: tenantKey,
        companyId: companyKey,
        createdBy: actorKey,
      }).catch(async () =>
        listStopSaleTypes({
          tenantId: tenantKey,
          companyId: companyKey,
          activeOnly: true,
        })
      ),
      ensureDefaultStopSaleReasons({
        tenantId: tenantKey,
        companyId: companyKey,
        createdBy: actorKey,
      }).catch(async () =>
        listStopSaleReasons({
          tenantId: tenantKey,
          companyId: companyKey,
          activeOnly: true,
        })
      ),
    ])
      .then(([roomRows, planRows, dayRows, typeRows, reasonRows]) => {
        if (cancelled) return;
        setRooms(roomRows);
        setRatePlans(planRows);
        setDaysOfWeek(dayRows);
        setStopSaleTypes(typeRows);
        setStopSaleReasons(reasonRows);
        if (!isEdit && typeRows.length > 0) {
          setValue("rows.0.stopSaleTypeId", typeRows[0].stopSaleTypeKey, { shouldValidate: true });
        }
      })
      .catch(() => {
        if (!cancelled) toast.error("Could not load reference data");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    tenantKey,
    companyKey,
    actorKey,
    lockedContract.propertyId,
    lockedContract.propertyContractKey,
    isEdit,
    setValue,
  ]);

  const roomOptions = useMemo(
    () =>
      rooms.map((r) => ({
        value: r.propertyRoomKey,
        label: `${r.roomName} (${r.roomCode})`,
      })),
    [rooms]
  );

  const ratePlanOptions = useMemo(
    () =>
      ratePlans.map((rp) => ({
        value: rp.propertyContractRatePlanKey,
        label: `${rp.ratePlanName} (${rp.ratePlanCode})`,
      })),
    [ratePlans]
  );

  function typeCodeFor(typeId: number): string {
    return stopSaleTypes.find((t) => t.stopSaleTypeKey === typeId)?.stopSaleTypeCode.toUpperCase() ?? "";
  }

  function selectType(index: number, id: number) {
    setValue(`rows.${index}.stopSaleTypeId`, id, { shouldValidate: true });
    const code = typeCodeFor(id);
    if (!stopSaleTypeNeedsRoom(code)) setValue(`rows.${index}.propertyRoomId`, null);
    if (!stopSaleTypeNeedsRatePlan(code)) setValue(`rows.${index}.propertyContractRatePlanId`, null);
  }

  function addRow() {
    rowArray.append(blankRow(lockedContract));
  }

  function toPayload(row: RowValues) {
    const code = typeCodeFor(row.stopSaleTypeId);
    return {
      tenantId: tenantKey,
      companyId: companyKey,
      propertyContractId: lockedContract.propertyContractKey,
      stopSaleTypeId: row.stopSaleTypeId,
      propertyRoomId: stopSaleTypeNeedsRoom(code) ? row.propertyRoomId : null,
      propertyContractRatePlanId: stopSaleTypeNeedsRatePlan(code) ? row.propertyContractRatePlanId : null,
      fromDate: row.fromDate,
      toDate: row.toDate,
      stopSaleReasonId: row.stopSaleReasonId,
      remarks: row.remarks.trim() || null,
      isActive: row.isActive,
      dayOfWeekIds: row.dayOfWeekIds,
    };
  }

  async function onSubmit(values: FormValues) {
    if (tenantKey <= 0 || companyKey <= 0 || !actorKey) {
      toast.error("Missing session context — sign in again.");
      return;
    }

    if (entry) {
      const row = values.rows[0]!;
      setSaving(true);
      try {
        await updatePropertyContractStopSale(entry.propertyContractStopSaleKey, {
          ...toPayload(row),
          modifiedBy: actorKey,
        });
        toast.success("Stop sale updated");
        router.push(returnHref);
      } catch (error) {
        toast.error(
          error instanceof PropertyContractStopSaleApiError ? error.message : "Could not save stop sale"
        );
      } finally {
        setSaving(false);
      }
      return;
    }

    // Lightweight in-batch guard: same type+room+rate plan combination shouldn't overlap in dates.
    for (let i = 0; i < values.rows.length; i++) {
      for (let j = i + 1; j < values.rows.length; j++) {
        const a = values.rows[i]!;
        const b = values.rows[j]!;
        if (
          a.stopSaleTypeId === b.stopSaleTypeId &&
          (a.propertyRoomId ?? null) === (b.propertyRoomId ?? null) &&
          (a.propertyContractRatePlanId ?? null) === (b.propertyContractRatePlanId ?? null) &&
          rangesOverlap(a.fromDate, a.toDate, b.fromDate, b.toDate)
        ) {
          toast.error(`Rows ${i + 1} and ${j + 1} overlap for the same type/room/rate plan — adjust the dates.`);
          return;
        }
      }
    }

    setSaving(true);
    let saved = 0;
    const failed: string[] = [];
    for (const [idx, row] of values.rows.entries()) {
      const label = `Row ${idx + 1} (${stopSaleTypes.find((t) => t.stopSaleTypeKey === row.stopSaleTypeId)?.stopSaleTypeName ?? "type"})`;
      try {
        await createPropertyContractStopSale({ ...toPayload(row), createdBy: actorKey });
        saved += 1;
      } catch (err) {
        const message = err instanceof PropertyContractStopSaleApiError ? err.message : "save failed";
        failed.push(`${label} (${message})`);
      }
    }
    setSaving(false);

    if (saved > 0) {
      toast.success(`${saved} stop sale${saved === 1 ? "" : "s"} added`);
    }
    if (failed.length > 0) {
      toast.error(`Could not add: ${failed.join(", ")}`);
    } else {
      router.push(returnHref);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  if (tenantKey <= 0 || companyKey <= 0) {
    return (
      <p className="text-sm text-destructive">
        Missing tenant or company context — refresh the page or sign in again.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-full space-y-6">
      <div className="space-y-1 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Contract</p>
        <p className="text-base font-semibold text-foreground">{lockedContract.contractName}</p>
        <p className="text-muted-foreground">{lockedContract.contractNumber}</p>
      </div>

      <div className="space-y-2">
        <div className="flex flex-nowrap items-center gap-2 px-1 text-[10px] font-medium uppercase text-muted-foreground">
          <span className="w-6 shrink-0" />
          <span className="w-36 shrink-0">
            Type<span className="text-destructive"> *</span>
          </span>
          <span className="w-40 shrink-0">Room</span>
          <span className="w-40 shrink-0">Rate plan</span>
          <span className="w-36 shrink-0">From *</span>
          <span className="w-36 shrink-0">To *</span>
          <span className="w-32 shrink-0">Reason</span>
          <span className="shrink-0">Days</span>
          <span className="min-w-0 flex-1">Remarks</span>
          <span className="w-10 shrink-0 text-center">Active</span>
          {!isEdit && <span className="w-8 shrink-0" />}
        </div>

        {rowArray.fields.map((field, index) => {
          const rowErrors = errors.rows?.[index];
          const row = rows[index];
          const typeId = row?.stopSaleTypeId ?? 0;
          const code = typeCodeFor(typeId);
          const needsRoom = stopSaleTypeNeedsRoom(code);
          const needsRatePlan = stopSaleTypeNeedsRatePlan(code);
          return (
            <div key={field.id} className="rounded-lg border border-border bg-muted/20 p-2">
              <div className="flex flex-nowrap items-center gap-2">
                <span className="w-6 shrink-0 text-xs text-muted-foreground">{index + 1}</span>

                <div className="w-36 min-w-0 shrink-0 space-y-1 overflow-hidden">
                  <Controller
                    control={control}
                    name={`rows.${index}.stopSaleTypeId`}
                    render={({ field: f }) => (
                      <Select
                        value={f.value > 0 ? String(f.value) : ""}
                        onValueChange={(v) => selectType(index, Number(v))}
                      >
                        <SelectTrigger className="h-9 w-full min-w-0 overflow-hidden">
                          <SelectValue placeholder="Select" className="truncate">
                            {() => stopSaleTypes.find((t) => t.stopSaleTypeKey === f.value)?.stopSaleTypeName ?? "Select"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {stopSaleTypes.map((t) => (
                            <SelectItem key={t.stopSaleTypeKey} value={String(t.stopSaleTypeKey)}>
                              {t.stopSaleTypeName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {rowErrors?.stopSaleTypeId && (
                    <p className="text-xs text-destructive">{rowErrors.stopSaleTypeId.message}</p>
                  )}
                </div>

                <div className="w-40 shrink-0 space-y-1">
                  <Controller
                    control={control}
                    name={`rows.${index}.propertyRoomId`}
                    render={({ field: f }) => (
                      <SearchableCombobox
                        value={f.value ?? null}
                        onChange={(v) => f.onChange(v === 0 ? null : v)}
                        options={roomOptions}
                        placeholder={needsRoom ? "Room…" : "N/A"}
                        disabled={!needsRoom}
                        ariaInvalid={!!rowErrors?.propertyRoomId}
                      />
                    )}
                  />
                  {rowErrors?.propertyRoomId && (
                    <p className="text-xs text-destructive">{rowErrors.propertyRoomId.message}</p>
                  )}
                </div>

                <div className="w-40 shrink-0 space-y-1">
                  <Controller
                    control={control}
                    name={`rows.${index}.propertyContractRatePlanId`}
                    render={({ field: f }) => (
                      <SearchableCombobox
                        value={f.value ?? null}
                        onChange={(v) => f.onChange(v === 0 ? null : v)}
                        options={ratePlanOptions}
                        placeholder={needsRatePlan ? "Rate plan…" : "N/A"}
                        disabled={!needsRatePlan}
                        ariaInvalid={!!rowErrors?.propertyContractRatePlanId}
                      />
                    )}
                  />
                  {rowErrors?.propertyContractRatePlanId && (
                    <p className="text-xs text-destructive">{rowErrors.propertyContractRatePlanId.message}</p>
                  )}
                </div>

                <div className="w-36 shrink-0 space-y-1">
                  <Input
                    type="date"
                    className="h-9 w-full min-w-0"
                    {...register(`rows.${index}.fromDate`)}
                    aria-invalid={!!rowErrors?.fromDate}
                  />
                  {rowErrors?.fromDate && (
                    <p className="text-xs text-destructive">{rowErrors.fromDate.message}</p>
                  )}
                </div>
                <div className="w-36 shrink-0 space-y-1">
                  <Input
                    type="date"
                    className="h-9 w-full min-w-0"
                    min={row?.fromDate || undefined}
                    {...register(`rows.${index}.toDate`)}
                    aria-invalid={!!rowErrors?.toDate}
                  />
                  {rowErrors?.toDate && (
                    <p className="text-xs text-destructive">{rowErrors.toDate.message}</p>
                  )}
                </div>

                <div className="w-32 min-w-0 shrink-0 overflow-hidden">
                  <Controller
                    control={control}
                    name={`rows.${index}.stopSaleReasonId`}
                    render={({ field: f }) => (
                      <Select
                        value={f.value != null && f.value > 0 ? String(f.value) : "0"}
                        onValueChange={(v) => f.onChange(v === "0" ? null : Number(v))}
                      >
                        <SelectTrigger className="h-9 w-full min-w-0 overflow-hidden">
                          <SelectValue placeholder="Reason" className="truncate">
                            {() =>
                              stopSaleReasons.find((r) => r.stopSaleReasonKey === f.value)?.stopSaleReasonName ??
                              "No reason"
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">No reason</SelectItem>
                          {stopSaleReasons.map((r) => (
                            <SelectItem key={r.stopSaleReasonKey} value={String(r.stopSaleReasonKey)}>
                              {r.stopSaleReasonName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="shrink-0">
                  <Controller
                    control={control}
                    name={`rows.${index}.dayOfWeekIds`}
                    render={({ field: f }) => (
                      <DayOfWeekCompactSelect days={daysOfWeek} value={f.value} onChange={f.onChange} />
                    )}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <Input
                    className="h-9 w-full min-w-0"
                    {...register(`rows.${index}.remarks`)}
                    placeholder="Optional"
                  />
                </div>

                <div className="flex w-10 shrink-0 items-center justify-center">
                  <Controller
                    control={control}
                    name={`rows.${index}.isActive`}
                    render={({ field: f }) => (
                      <Checkbox checked={f.value} onCheckedChange={(c) => f.onChange(c === true)} />
                    )}
                  />
                </div>

                {!isEdit && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="w-8 shrink-0"
                    disabled={rowArray.fields.length <= 1}
                    onClick={() => rowArray.remove(index)}
                    aria-label="Remove row"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!isEdit && (
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="h-4 w-4" />
          Add row
        </Button>
      )}

      <div className="flex flex-wrap gap-2 border-t pt-4">
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isEdit ? "Save changes" : rows.length > 1 ? `Create ${rows.length} stop sales` : "Create stop sale"}
        </Button>
        <Button type="button" variant="outline" nativeButton={false} render={<Link href={returnHref} />}>
          <X className="h-4 w-4" />
          Cancel
        </Button>
      </div>
    </form>
  );
}
