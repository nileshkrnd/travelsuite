"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SearchableCombobox } from "@/components/shared/SearchableCombobox";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { resolveSessionCompanyKey } from "@/lib/session-company";
import {
  blackoutTypeNeedsRatePlan,
  blackoutTypeNeedsRoom,
} from "@/lib/constants/blackout-types";
import { listPropertyRooms } from "@/lib/services/property-rooms.service";
import { listPropertyContractRatePlans } from "@/lib/services/property-contract-rate-plans.service";
import { listDayOfWeeks } from "@/lib/services/day-of-weeks.service";
import {
  createPropertyContractBlackout,
  updatePropertyContractBlackout,
  ensureDefaultBlackoutTypes,
  ensureDefaultBlackoutReasons,
  listBlackoutTypes,
  listBlackoutReasons,
  PropertyContractBlackoutApiError,
} from "@/lib/services/property-contract-blackouts.service";
import type { PropertyContract, PropertyContractRatePlan, PropertyRoom } from "@/types";
import type { DayOfWeek } from "@/types/day-of-week";
import type { BlackoutReason } from "@/types/blackout-reason";
import type { BlackoutType } from "@/types/blackout-type";
import type { PropertyContractBlackout } from "@/types/property-contract-blackout";
import { cn } from "@/lib/utils";

const schema = z
  .object({
    propertyContractId: z.number().int().positive(),
    blackoutTypeId: z.number().int().positive("Choose a blackout type"),
    propertyRoomId: z.number().int().positive().nullable(),
    propertyContractRatePlanId: z.number().int().positive().nullable(),
    fromDate: z.string().min(1, "From date is required"),
    toDate: z.string().min(1, "To date is required"),
    blackoutReasonId: z.number().int().positive().nullable(),
    remarks: z.string().trim().max(500),
    isActive: z.boolean(),
    dayOfWeekIds: z.array(z.number().int().positive()),
  })
  .superRefine((values, ctx) => {
    if (values.fromDate && values.toDate && values.fromDate > values.toDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "From date must be on or before to date",
        path: ["toDate"],
      });
    }
  });

type FormValues = z.infer<typeof schema>;

function defaultValues(contract: PropertyContract): FormValues {
  return {
    propertyContractId: contract.propertyContractKey,
    blackoutTypeId: 0,
    propertyRoomId: null,
    propertyContractRatePlanId: null,
    fromDate: contract.startDate,
    toDate: contract.endDate,
    blackoutReasonId: null,
    remarks: "",
    isActive: true,
    dayOfWeekIds: [],
  };
}

function valuesFromEntry(entry: PropertyContractBlackout): FormValues {
  return {
    propertyContractId: entry.propertyContractId,
    blackoutTypeId: entry.blackoutTypeId,
    propertyRoomId: entry.propertyRoomId,
    propertyContractRatePlanId: entry.propertyContractRatePlanId,
    fromDate: entry.fromDate,
    toDate: entry.toDate,
    blackoutReasonId: entry.blackoutReasonId,
    remarks: entry.remarks ?? "",
    isActive: entry.isActive,
    dayOfWeekIds: entry.dayOfWeekIds,
  };
}

function blackoutTypeDisplayLabel(
  types: BlackoutType[],
  value: string | null,
  placeholder: string
): string {
  if (!value) return placeholder;
  const match = types.find((t) => String(t.blackoutTypeKey) === value);
  return match?.blackoutTypeName ?? placeholder;
}

function blackoutReasonDisplayLabel(
  reasons: BlackoutReason[],
  value: string | null,
  placeholder: string
): string {
  if (!value || value === "0") return placeholder;
  const match = reasons.find((r) => String(r.blackoutReasonKey) === value);
  return match?.blackoutReasonName ?? placeholder;
}

export function PropertyContractBlackoutForm({
  lockedContract,
  entry,
}: {
  lockedContract: PropertyContract;
  entry?: PropertyContractBlackout;
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

  const returnHref = `/${role}/extranet/contracts/${lockedContract.propertyContractKey}?tab=blackouts`;

  const [rooms, setRooms] = useState<PropertyRoom[]>([]);
  const [ratePlans, setRatePlans] = useState<PropertyContractRatePlan[]>([]);
  const [blackoutTypes, setBlackoutTypes] = useState<BlackoutType[]>([]);
  const [blackoutReasons, setBlackoutReasons] = useState<BlackoutReason[]>([]);
  const [daysOfWeek, setDaysOfWeek] = useState<DayOfWeek[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(true);
  const [saving, setSaving] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: entry ? valuesFromEntry(entry) : defaultValues(lockedContract),
  });

  const selectedTypeId = watch("blackoutTypeId");
  const selectedDayIds = watch("dayOfWeekIds");

  const selectedTypeCode = useMemo(() => {
    return (
      blackoutTypes
        .find((t) => t.blackoutTypeKey === selectedTypeId)
        ?.blackoutTypeCode.toUpperCase() ?? ""
    );
  }, [blackoutTypes, selectedTypeId]);

  const showRoom = blackoutTypeNeedsRoom(selectedTypeCode);
  const showRatePlan = blackoutTypeNeedsRatePlan(selectedTypeCode);

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

  useEffect(() => {
    if (tenantKey <= 0 || companyKey <= 0 || !actorKey) {
      setLoadingRefs(false);
      return;
    }
    let cancelled = false;
    setLoadingRefs(true);
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
      ensureDefaultBlackoutTypes({
        tenantId: tenantKey,
        companyId: companyKey,
        createdBy: actorKey,
      }).catch(async () =>
        listBlackoutTypes({
          tenantId: tenantKey,
          companyId: companyKey,
          activeOnly: true,
        })
      ),
      ensureDefaultBlackoutReasons({
        tenantId: tenantKey,
        companyId: companyKey,
        createdBy: actorKey,
      }).catch(async () =>
        listBlackoutReasons({
          tenantId: tenantKey,
          companyId: companyKey,
          activeOnly: true,
        })
      ),
    ])
      .then(([roomRows, planRows, dayRows, typeRows, reasonRows]) => {
        if (!cancelled) {
          setRooms(roomRows);
          setRatePlans(planRows);
          setDaysOfWeek(dayRows);
          setBlackoutTypes(typeRows);
          setBlackoutReasons(reasonRows);
          if (!entry && typeRows.length > 0) {
            setValue("blackoutTypeId", typeRows[0].blackoutTypeKey, { shouldValidate: true });
          }
        }
      })
      .catch(() => {
        if (!cancelled) toast.error("Could not load reference data");
      })
      .finally(() => {
        if (!cancelled) setLoadingRefs(false);
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
    entry,
    setValue,
  ]);

  useEffect(() => {
    if (!showRoom) setValue("propertyRoomId", null, { shouldDirty: true });
    if (!showRatePlan) setValue("propertyContractRatePlanId", null, { shouldDirty: true });
  }, [showRoom, showRatePlan, setValue]);

  function toggleDay(dayId: number, checked: boolean) {
    const current = new Set(selectedDayIds);
    if (checked) current.add(dayId);
    else current.delete(dayId);
    setValue("dayOfWeekIds", [...current], { shouldDirty: true });
  }

  async function onSubmit(values: FormValues) {
    if (tenantKey <= 0 || companyKey <= 0 || !actorKey) {
      toast.error("Missing session context — sign in again.");
      return;
    }

    const typeCode =
      blackoutTypes
        .find((t) => t.blackoutTypeKey === values.blackoutTypeId)
        ?.blackoutTypeCode.toUpperCase() ?? "";

    if (blackoutTypeNeedsRoom(typeCode) && !values.propertyRoomId) {
      toast.error("Room type is required for this blackout type.");
      return;
    }
    if (blackoutTypeNeedsRatePlan(typeCode) && !values.propertyContractRatePlanId) {
      toast.error("Rate plan is required for this blackout type.");
      return;
    }

    const payload = {
      tenantId: tenantKey,
      companyId: companyKey,
      propertyContractId: values.propertyContractId,
      blackoutTypeId: values.blackoutTypeId,
      propertyRoomId: showRoom ? values.propertyRoomId : null,
      propertyContractRatePlanId: showRatePlan ? values.propertyContractRatePlanId : null,
      fromDate: values.fromDate,
      toDate: values.toDate,
      blackoutReasonId: values.blackoutReasonId,
      remarks: values.remarks.trim() || null,
      isActive: values.isActive,
      dayOfWeekIds: values.dayOfWeekIds,
    };

    setSaving(true);
    try {
      if (entry) {
        await updatePropertyContractBlackout(entry.propertyContractBlackoutKey, {
          ...payload,
          modifiedBy: actorKey,
        });
        toast.success("Blackout updated");
      } else {
        await createPropertyContractBlackout({ ...payload, createdBy: actorKey });
        toast.success("Blackout created");
      }
      router.push(returnHref);
    } catch (error) {
      toast.error(
        error instanceof PropertyContractBlackoutApiError
          ? error.message
          : "Could not save blackout"
      );
    } finally {
      setSaving(false);
    }
  }

  if (loadingRefs) {
    return <p className="text-sm text-muted-foreground">Loading form…</p>;
  }

  if (tenantKey <= 0 || companyKey <= 0) {
    return (
      <p className="text-sm text-destructive">
        Missing tenant or company context — refresh the page or sign in again.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-3xl space-y-6">
      <Card>
        <CardContent className="space-y-5 pt-6">
          <div className="space-y-2">
            <Label>Blackout type</Label>
            <Controller
              control={control}
              name="blackoutTypeId"
              render={({ field }) => (
                <Select
                  value={field.value > 0 ? String(field.value) : ""}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type">
                      {(value: string | null) =>
                        blackoutTypeDisplayLabel(blackoutTypes, value, "Select type")
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {blackoutTypes.map((t) => (
                      <SelectItem key={t.blackoutTypeKey} value={String(t.blackoutTypeKey)}>
                        {t.blackoutTypeName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.blackoutTypeId && (
              <p className="text-xs text-destructive">{errors.blackoutTypeId.message}</p>
            )}
          </div>

          {showRoom && (
            <div className="space-y-2">
              <Label>Room type</Label>
              <Controller
                control={control}
                name="propertyRoomId"
                render={({ field }) => (
                  <SearchableCombobox
                    value={field.value ?? 0}
                    onChange={(v) => field.onChange(v === 0 ? null : v)}
                    options={roomOptions}
                    placeholder="Select room type"
                  />
                )}
              />
            </div>
          )}

          {showRatePlan && (
            <div className="space-y-2">
              <Label>Rate plan</Label>
              <Controller
                control={control}
                name="propertyContractRatePlanId"
                render={({ field }) => (
                  <SearchableCombobox
                    value={field.value ?? 0}
                    onChange={(v) => field.onChange(v === 0 ? null : v)}
                    options={ratePlanOptions}
                    placeholder="Select rate plan"
                  />
                )}
              />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fromDate">From date</Label>
              <Input id="fromDate" type="date" {...register("fromDate")} />
              {errors.fromDate && (
                <p className="text-xs text-destructive">{errors.fromDate.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="toDate">To date</Label>
              <Input id="toDate" type="date" {...register("toDate")} />
              {errors.toDate && (
                <p className="text-xs text-destructive">{errors.toDate.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Reason</Label>
            <Controller
              control={control}
              name="blackoutReasonId"
              render={({ field }) => (
                <Select
                  value={field.value != null && field.value > 0 ? String(field.value) : "0"}
                  onValueChange={(v) => field.onChange(v === "0" ? null : Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Optional">
                      {(value: string | null) =>
                        blackoutReasonDisplayLabel(blackoutReasons, value, "Optional")
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">No reason</SelectItem>
                    {blackoutReasons.map((r) => (
                      <SelectItem key={r.blackoutReasonKey} value={String(r.blackoutReasonKey)}>
                        {r.blackoutReasonName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea id="remarks" rows={3} {...register("remarks")} placeholder="Optional notes" />
            {errors.remarks && (
              <p className="text-xs text-destructive">{errors.remarks.message}</p>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={watch("isActive")}
              onCheckedChange={(c) => setValue("isActive", c === true)}
            />
            Active
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div>
            <h3 className="text-sm font-medium">Applicable days</h3>
            <p className="text-xs text-muted-foreground">
              Leave empty to apply every day of the week within the date range.
            </p>
            {selectedDayIds.length > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                Selected:{" "}
                {daysOfWeek
                  .filter((d) => selectedDayIds.includes(d.dayOfWeekId))
                  .map((d) => d.shortName ?? d.dayOfWeekCode)
                  .join(", ")}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {daysOfWeek.map((day) => {
              const checked = selectedDayIds.includes(day.dayOfWeekId);
              return (
                <button
                  key={day.dayOfWeekId}
                  type="button"
                  aria-pressed={checked}
                  onClick={() => toggleDay(day.dayOfWeekId, !checked)}
                  className={cn(
                    "min-w-[3rem] rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                    checked
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-muted"
                  )}
                >
                  {day.shortName ?? day.dayOfWeekCode}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {entry ? "Save changes" : "Create blackout"}
        </Button>
        <Button variant="outline" nativeButton={false} render={<Link href={returnHref} />}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
