"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableCombobox } from "@/components/shared/SearchableCombobox";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { resolveSessionCompanyKey } from "@/lib/session-company";
import {
  promotionBenefitNeedsValue,
  promotionBenefitNeedsStayPay,
  promotionBenefitNeedsFreeNights,
  promotionBenefitNeedsUpgradeRoom,
  promotionBenefitNeedsMealUpgrade,
} from "@/lib/constants/promotion-benefit-types";
import { listPropertyRooms } from "@/lib/services/property-rooms.service";
import { listPropertyContractRatePlans } from "@/lib/services/property-contract-rate-plans.service";
import { listMealPlans } from "@/lib/services/meal-plans.service";
import { listDayOfWeeks } from "@/lib/services/day-of-weeks.service";
import {
  createPropertyContractPromotion,
  updatePropertyContractPromotion,
  ensureDefaultPromotionTypes,
  ensureDefaultPromotionBenefitTypes,
  listPromotionTypes,
  listPromotionBenefitTypes,
  PropertyContractPromotionApiError,
} from "@/lib/services/property-contract-promotions.service";
import type { PropertyContract, PropertyContractRatePlan, PropertyRoom } from "@/types";
import type { DayOfWeek } from "@/types/day-of-week";
import type { MealPlan } from "@/types/meal-plan";
import type { PromotionBenefitType } from "@/types/promotion-benefit-type";
import type { PromotionType } from "@/types/promotion-type";
import type { PropertyContractPromotion } from "@/types/property-contract-promotion";
import { cn } from "@/lib/utils";

const nullableInt = z.preprocess(
  (v) => (v === "" || v === undefined || Number.isNaN(v) ? null : Number(v)),
  z.number().int().nullable()
);

const nullableDecimal = z.preprocess(
  (v) => (v === "" || v === undefined || Number.isNaN(v) ? null : Number(v)),
  z.number().nullable()
);

const conditionSchema = z.object({
  minNights: nullableInt,
  maxNights: nullableInt,
  minAdults: nullableInt,
  maxAdults: nullableInt,
  minChild: nullableInt,
  maxChild: nullableInt,
  minRooms: nullableInt,
  maxRooms: nullableInt,
});

const periodSchema = z.object({
  bookingFromDate: z.string().min(1, "Booking start required"),
  bookingToDate: z.string().min(1, "Booking end required"),
  stayFromDate: z.string().min(1, "Stay start required"),
  stayToDate: z.string().min(1, "Stay end required"),
  isActive: z.boolean(),
});

const benefitSchema = z.object({
  promotionBenefitTypeId: z.number().int().positive("Choose a benefit type"),
  value: nullableDecimal,
  stayNights: nullableInt,
  payNights: nullableInt,
  freeNights: nullableInt,
  upgradeToPropertyRoomId: z.number().int().positive().nullable(),
  upgradeToMealPlanId: z.number().int().positive().nullable(),
  isActive: z.boolean(),
});

const schema = z.object({
  propertyContractId: z.number().int().positive(),
  promotionTypeId: z.number().int().positive("Choose a promotion type"),
  promotionCode: z.string().trim().min(1, "Promotion code is required").max(50),
  promotionName: z.string().trim().min(1, "Promotion name is required").max(150),
  propertyRoomId: z.number().int().positive().nullable(),
  propertyContractRatePlanId: z.number().int().positive().nullable(),
  isStackable: z.boolean(),
  priority: z.number().int(),
  isActive: z.boolean(),
  periods: z.array(periodSchema),
  condition: conditionSchema,
  benefits: z.array(benefitSchema),
  dayOfWeekIds: z.array(z.number().int().positive()),
});

type FormValues = z.infer<typeof schema>;

function emptyCondition(): FormValues["condition"] {
  return {
    minNights: null,
    maxNights: null,
    minAdults: null,
    maxAdults: null,
    minChild: null,
    maxChild: null,
    minRooms: null,
    maxRooms: null,
  };
}

function defaultValues(contract: PropertyContract): FormValues {
  return {
    propertyContractId: contract.propertyContractKey,
    promotionTypeId: 0,
    promotionCode: "PROMO-01",
    promotionName: "",
    propertyRoomId: null,
    propertyContractRatePlanId: null,
    isStackable: false,
    priority: 0,
    isActive: true,
    periods: [],
    condition: emptyCondition(),
    benefits: [],
    dayOfWeekIds: [],
  };
}

function valuesFromEntry(entry: PropertyContractPromotion): FormValues {
  const c = entry.conditions[0];
  return {
    propertyContractId: entry.propertyContractId,
    promotionTypeId: entry.promotionTypeId,
    promotionCode: entry.promotionCode,
    promotionName: entry.promotionName,
    propertyRoomId: entry.propertyRoomId,
    propertyContractRatePlanId: entry.propertyContractRatePlanId,
    isStackable: entry.isStackable,
    priority: entry.priority,
    isActive: entry.isActive,
    periods: entry.periods.map((p) => ({
      bookingFromDate: p.bookingFromDate,
      bookingToDate: p.bookingToDate,
      stayFromDate: p.stayFromDate,
      stayToDate: p.stayToDate,
      isActive: p.isActive,
    })),
    condition: c
      ? {
          minNights: c.minNights,
          maxNights: c.maxNights,
          minAdults: c.minAdults,
          maxAdults: c.maxAdults,
          minChild: c.minChild,
          maxChild: c.maxChild,
          minRooms: c.minRooms,
          maxRooms: c.maxRooms,
        }
      : emptyCondition(),
    benefits: entry.benefits.map((b) => ({
      promotionBenefitTypeId: b.promotionBenefitTypeId,
      value: b.value,
      stayNights: b.stayNights,
      payNights: b.payNights,
      freeNights: b.freeNights,
      upgradeToPropertyRoomId: b.upgradeToPropertyRoomId,
      upgradeToMealPlanId: b.upgradeToMealPlanId,
      isActive: b.isActive,
    })),
    dayOfWeekIds: entry.dayOfWeekIds,
  };
}

function resolvePromotionName(
  name: string,
  promotionTypeId: number,
  promotionCode: string,
  types: PromotionType[]
): string {
  const trimmed = name.trim();
  if (trimmed) return trimmed;
  const typeName = types.find((t) => t.promotionTypeKey === promotionTypeId)?.promotionTypeName;
  if (typeName?.trim()) return typeName.trim();
  return promotionCode.trim();
}

function isPeriodComplete(period: FormValues["periods"][number]): boolean {
  return Boolean(
    period.bookingFromDate && period.bookingToDate && period.stayFromDate && period.stayToDate
  );
}

function isPeriodEmpty(period: FormValues["periods"][number]): boolean {
  return (
    !period.bookingFromDate &&
    !period.bookingToDate &&
    !period.stayFromDate &&
    !period.stayToDate
  );
}

function promotionTypeDisplayLabel(
  types: PromotionType[],
  value: string | null,
  placeholder: string
): string {
  if (!value) return placeholder;
  const match = types.find((t) => String(t.promotionTypeKey) === value);
  return match?.promotionTypeName ?? placeholder;
}

function promotionBenefitTypeDisplayLabel(
  types: PromotionBenefitType[],
  value: string | null,
  placeholder: string
): string {
  if (!value) return placeholder;
  const match = types.find((t) => String(t.promotionBenefitTypeKey) === value);
  return match?.promotionBenefitTypeName ?? placeholder;
}

function conditionHasValues(condition: FormValues["condition"]): boolean {
  return Object.values(condition).some((v) => v != null);
}

export function PropertyContractPromotionForm({
  lockedContract,
  entry,
}: {
  lockedContract: PropertyContract;
  entry?: PropertyContractPromotion;
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

  const returnHref = `/${role}/extranet/contracts/${lockedContract.propertyContractKey}?tab=promotions`;

  const [rooms, setRooms] = useState<PropertyRoom[]>([]);
  const [ratePlans, setRatePlans] = useState<PropertyContractRatePlan[]>([]);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [promotionTypes, setPromotionTypes] = useState<PromotionType[]>([]);
  const [benefitTypes, setBenefitTypes] = useState<PromotionBenefitType[]>([]);
  const [daysOfWeek, setDaysOfWeek] = useState<DayOfWeek[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(true);
  const [saving, setSaving] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    defaultValues: entry ? valuesFromEntry(entry) : defaultValues(lockedContract),
  });

  const periodsArray = useFieldArray({ control, name: "periods" });
  const benefitsArray = useFieldArray({ control, name: "benefits" });
  const watchedBenefits = watch("benefits");
  const selectedDayIds = watch("dayOfWeekIds");

  const roomOptions = useMemo(
    () => [
      { value: 0, label: "All room types" },
      ...rooms.map((r) => ({
        value: r.propertyRoomKey,
        label: `${r.roomName} (${r.roomCode})`,
      })),
    ],
    [rooms]
  );

  const ratePlanOptions = useMemo(
    () => [
      { value: 0, label: "All rate plans" },
      ...ratePlans.map((rp) => ({
        value: rp.propertyContractRatePlanKey,
        label: `${rp.ratePlanName} (${rp.ratePlanCode})`,
      })),
    ],
    [ratePlans]
  );

  const mealPlanOptions = useMemo(
    () => [
      { value: 0, label: "All meal plans" },
      ...mealPlans.map((m) => ({
        value: m.mealPlanId,
        label: `${m.mealPlanName} (${m.mealPlanCode})`,
      })),
    ],
    [mealPlans]
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
      listMealPlans({ tenantId: tenantKey, companyId: companyKey, activeOnly: true }),
      listDayOfWeeks({ activeOnly: true }),
      ensureDefaultPromotionTypes({
        tenantId: tenantKey,
        companyId: companyKey,
        createdBy: actorKey,
      }).catch(async () =>
        listPromotionTypes({
          tenantId: tenantKey,
          companyId: companyKey,
          activeOnly: true,
        })
      ),
      ensureDefaultPromotionBenefitTypes({
        tenantId: tenantKey,
        companyId: companyKey,
        createdBy: actorKey,
      }).catch(async () =>
        listPromotionBenefitTypes({
          tenantId: tenantKey,
          companyId: companyKey,
          activeOnly: true,
        })
      ),
    ])
      .then(([roomRows, planRows, mealRows, dayRows, typeRows, benefitRows]) => {
        if (!cancelled) {
          setRooms(roomRows);
          setRatePlans(planRows);
          setMealPlans(mealRows);
          setDaysOfWeek(dayRows);
          setPromotionTypes(typeRows);
          setBenefitTypes(benefitRows);
          if (!entry && typeRows.length > 0) {
            setValue("promotionTypeId", typeRows[0].promotionTypeKey, { shouldValidate: true });
            if (!getValues("promotionName").trim()) {
              setValue("promotionName", typeRows[0].promotionTypeName, { shouldValidate: true });
            }
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
    getValues,
  ]);

  function benefitTypeCode(typeId: number): string {
    return (
      benefitTypes
        .find((t) => t.promotionBenefitTypeKey === typeId)
        ?.promotionBenefitTypeCode.toUpperCase() ?? ""
    );
  }

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

    const hasPartialPeriod = values.periods.some(
      (period) => !isPeriodComplete(period) && !isPeriodEmpty(period)
    );
    if (hasPartialPeriod) {
      toast.error("Complete all date fields for each validity period, or remove incomplete rows.");
      return;
    }

    const promotionName = resolvePromotionName(
      values.promotionName,
      values.promotionTypeId,
      values.promotionCode,
      promotionTypes
    );

    for (const benefit of values.benefits) {
      const code = benefitTypeCode(benefit.promotionBenefitTypeId);
      if (promotionBenefitNeedsValue(code) && (benefit.value == null || benefit.value <= 0)) {
        toast.error("Discount benefits require a value greater than zero.");
        return;
      }
      if (promotionBenefitNeedsStayPay(code)) {
        if (benefit.stayNights == null || benefit.stayNights <= 0 || benefit.payNights == null) {
          toast.error("Stay & pay benefits require stay nights and pay nights.");
          return;
        }
      }
      if (promotionBenefitNeedsFreeNights(code) && (benefit.freeNights == null || benefit.freeNights <= 0)) {
        toast.error("Free night benefits require free nights.");
        return;
      }
      if (promotionBenefitNeedsUpgradeRoom(code) && !benefit.upgradeToPropertyRoomId) {
        toast.error("Room upgrade benefits require an upgrade room.");
        return;
      }
      if (promotionBenefitNeedsMealUpgrade(code) && !benefit.upgradeToMealPlanId) {
        toast.error("Meal upgrade benefits require an upgrade meal plan.");
        return;
      }
    }

    const payload = {
      tenantId: tenantKey,
      companyId: companyKey,
      propertyContractId: values.propertyContractId,
      promotionTypeId: values.promotionTypeId,
      promotionCode: values.promotionCode,
      promotionName,
      propertyRoomId:
        values.propertyRoomId && values.propertyRoomId > 0 ? values.propertyRoomId : null,
      propertyContractRatePlanId:
        values.propertyContractRatePlanId && values.propertyContractRatePlanId > 0
          ? values.propertyContractRatePlanId
          : null,
      isStackable: values.isStackable,
      priority: values.priority,
      isActive: values.isActive,
      periods: values.periods.filter(isPeriodComplete),
      condition: conditionHasValues(values.condition) ? values.condition : undefined,
      benefits: values.benefits.map((b) => {
        const code = benefitTypeCode(b.promotionBenefitTypeId);
        return {
          promotionBenefitTypeId: b.promotionBenefitTypeId,
          value: promotionBenefitNeedsValue(code) ? b.value : null,
          stayNights: promotionBenefitNeedsStayPay(code) ? b.stayNights : null,
          payNights: promotionBenefitNeedsStayPay(code) ? b.payNights : null,
          freeNights: promotionBenefitNeedsFreeNights(code) ? b.freeNights : null,
          upgradeToPropertyRoomId: promotionBenefitNeedsUpgradeRoom(code)
            ? b.upgradeToPropertyRoomId
            : null,
          upgradeToMealPlanId: promotionBenefitNeedsMealUpgrade(code) ? b.upgradeToMealPlanId : null,
          isActive: b.isActive,
        };
      }),
      dayOfWeekIds: values.dayOfWeekIds,
    };

    setSaving(true);
    try {
      if (entry) {
        await updatePropertyContractPromotion(entry.propertyContractPromotionKey, {
          ...payload,
          modifiedBy: actorKey,
        });
        toast.success("Promotion updated");
      } else {
        await createPropertyContractPromotion({ ...payload, createdBy: actorKey });
        toast.success("Promotion created");
      }
      router.push(returnHref);
    } catch (error) {
      toast.error(
        error instanceof PropertyContractPromotionApiError
          ? error.message
          : "Could not save promotion"
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
            <Label>Promotion type</Label>
            <Controller
              control={control}
              name="promotionTypeId"
              render={({ field }) => (
                <Select
                  value={field.value > 0 ? String(field.value) : ""}
                  onValueChange={(v) => {
                    const typeId = Number(v);
                    field.onChange(typeId);
                    if (!getValues("promotionName").trim()) {
                      const type = promotionTypes.find((t) => t.promotionTypeKey === typeId);
                      if (type) {
                        setValue("promotionName", type.promotionTypeName, { shouldValidate: true });
                      }
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type">
                      {(value: string | null) =>
                        promotionTypeDisplayLabel(promotionTypes, value, "Select type")
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {promotionTypes.map((t) => (
                      <SelectItem key={t.promotionTypeKey} value={String(t.promotionTypeKey)}>
                        {t.promotionTypeName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.promotionTypeId && (
              <p className="text-xs text-destructive">{errors.promotionTypeId.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="promotionCode">Promotion code</Label>
              <Input id="promotionCode" {...register("promotionCode")} />
              {errors.promotionCode && (
                <p className="text-xs text-destructive">{errors.promotionCode.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="promotionName">Promotion name</Label>
              <Input id="promotionName" {...register("promotionName")} placeholder="Early bird discount" />
              {errors.promotionName && (
                <p className="text-xs text-destructive">{errors.promotionName.message}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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
                    placeholder="All room types"
                  />
                )}
              />
            </div>
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
                    placeholder="All rate plans"
                  />
                )}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Input
                id="priority"
                type="number"
                {...register("priority", { valueAsNumber: true })}
              />
            </div>
            <div className="flex flex-col justify-end gap-3 pb-1">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={watch("isStackable")}
                  onCheckedChange={(c) => setValue("isStackable", c === true)}
                />
                Stackable with other promotions
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={watch("isActive")}
                  onCheckedChange={(c) => setValue("isActive", c === true)}
                />
                Active
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div>
            <h3 className="text-sm font-medium">Validity periods</h3>
            <p className="text-xs text-muted-foreground">
              Booking window and stay dates when this promotion applies.
            </p>
          </div>

          {periodsArray.fields.length === 0 ? (
            <p className="text-sm text-muted-foreground">No periods — add at least one below.</p>
          ) : (
            periodsArray.fields.map((field, index) => (
              <div
                key={field.id}
                className="grid gap-3 rounded-lg border bg-muted/20 p-3 sm:grid-cols-2 lg:grid-cols-4"
              >
                <div className="space-y-1">
                  <Label className="text-xs">Booking from</Label>
                  <Input type="date" {...register(`periods.${index}.bookingFromDate`)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Booking to</Label>
                  <Input type="date" {...register(`periods.${index}.bookingToDate`)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Stay from</Label>
                  <Input type="date" {...register(`periods.${index}.stayFromDate`)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Stay to</Label>
                  <Input type="date" {...register(`periods.${index}.stayToDate`)} />
                </div>
                <div className="flex items-end sm:col-span-2 lg:col-span-4">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => periodsArray.remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove period
                  </Button>
                </div>
              </div>
            ))
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              periodsArray.append({
                bookingFromDate: "",
                bookingToDate: "",
                stayFromDate: "",
                stayToDate: "",
                isActive: true,
              })
            }
          >
            <Plus className="h-4 w-4" />
            Add period
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div>
            <h3 className="text-sm font-medium">Conditions</h3>
            <p className="text-xs text-muted-foreground">
              Optional eligibility limits — leave blank when not applicable.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                ["minNights", "Min nights"],
                ["maxNights", "Max nights"],
                ["minAdults", "Min adults"],
                ["maxAdults", "Max adults"],
                ["minChild", "Min children"],
                ["maxChild", "Max children"],
                ["minRooms", "Min rooms"],
                ["maxRooms", "Max rooms"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs">{label}</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="—"
                  {...register(`condition.${key}`, { valueAsNumber: true, setValueAs: (v) => (v === "" || Number.isNaN(v) ? null : Number(v)) })}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div>
            <h3 className="text-sm font-medium">Benefits</h3>
            <p className="text-xs text-muted-foreground">
              What the guest receives when the promotion matches.
            </p>
          </div>

          {benefitsArray.fields.length === 0 ? (
            <p className="text-sm text-muted-foreground">No benefits — add at least one below.</p>
          ) : (
            benefitsArray.fields.map((field, index) => {
              const typeId = watchedBenefits[index]?.promotionBenefitTypeId ?? 0;
              const code = benefitTypeCode(typeId);
              const needsValue = promotionBenefitNeedsValue(code);
              const needsStayPay = promotionBenefitNeedsStayPay(code);
              const needsFreeNights = promotionBenefitNeedsFreeNights(code);
              const needsUpgradeRoom = promotionBenefitNeedsUpgradeRoom(code);
              const needsMealUpgrade = promotionBenefitNeedsMealUpgrade(code);

              return (
                <div
                  key={field.id}
                  className="space-y-3 rounded-lg border bg-muted/20 p-3"
                >
                  <div className="space-y-1">
                    <Label className="text-xs">Benefit type</Label>
                    <Controller
                      control={control}
                      name={`benefits.${index}.promotionBenefitTypeId`}
                      render={({ field: f }) => (
                        <Select
                          value={f.value > 0 ? String(f.value) : ""}
                          onValueChange={(v) => {
                            const id = Number(v);
                            f.onChange(id);
                            const nextCode = benefitTypeCode(id);
                            if (!promotionBenefitNeedsValue(nextCode)) {
                              setValue(`benefits.${index}.value`, null);
                            }
                            if (!promotionBenefitNeedsStayPay(nextCode)) {
                              setValue(`benefits.${index}.stayNights`, null);
                              setValue(`benefits.${index}.payNights`, null);
                            }
                            if (!promotionBenefitNeedsFreeNights(nextCode)) {
                              setValue(`benefits.${index}.freeNights`, null);
                            }
                            if (!promotionBenefitNeedsUpgradeRoom(nextCode)) {
                              setValue(`benefits.${index}.upgradeToPropertyRoomId`, null);
                            }
                            if (!promotionBenefitNeedsMealUpgrade(nextCode)) {
                              setValue(`benefits.${index}.upgradeToMealPlanId`, null);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select benefit">
                              {(value: string | null) =>
                                promotionBenefitTypeDisplayLabel(benefitTypes, value, "Select benefit")
                              }
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {benefitTypes.map((t) => (
                              <SelectItem
                                key={t.promotionBenefitTypeKey}
                                value={String(t.promotionBenefitTypeKey)}
                              >
                                {t.promotionBenefitTypeName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {needsValue && (
                      <div className="space-y-1">
                        <Label className="text-xs">Value</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="% or amount"
                          {...register(`benefits.${index}.value`, {
                            valueAsNumber: true,
                            setValueAs: (v) => (v === "" || Number.isNaN(v) ? null : Number(v)),
                          })}
                        />
                      </div>
                    )}
                    {needsStayPay && (
                      <>
                        <div className="space-y-1">
                          <Label className="text-xs">Stay nights</Label>
                          <Input
                            type="number"
                            min={1}
                            {...register(`benefits.${index}.stayNights`, {
                              valueAsNumber: true,
                              setValueAs: (v) => (v === "" || Number.isNaN(v) ? null : Number(v)),
                            })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Pay nights</Label>
                          <Input
                            type="number"
                            min={0}
                            {...register(`benefits.${index}.payNights`, {
                              valueAsNumber: true,
                              setValueAs: (v) => (v === "" || Number.isNaN(v) ? null : Number(v)),
                            })}
                          />
                        </div>
                      </>
                    )}
                    {needsFreeNights && (
                      <div className="space-y-1">
                        <Label className="text-xs">Free nights</Label>
                        <Input
                          type="number"
                          min={1}
                          {...register(`benefits.${index}.freeNights`, {
                            valueAsNumber: true,
                            setValueAs: (v) => (v === "" || Number.isNaN(v) ? null : Number(v)),
                          })}
                        />
                      </div>
                    )}
                    {needsUpgradeRoom && (
                      <div className="space-y-1 sm:col-span-2">
                        <Label className="text-xs">Upgrade room</Label>
                        <Controller
                          control={control}
                          name={`benefits.${index}.upgradeToPropertyRoomId`}
                          render={({ field: f }) => (
                            <SearchableCombobox
                              value={f.value ?? 0}
                              onChange={(v) => f.onChange(v === 0 ? null : v)}
                              options={roomOptions.filter((o) => o.value !== 0)}
                              placeholder="Select room"
                            />
                          )}
                        />
                      </div>
                    )}
                    {needsMealUpgrade && (
                      <div className="space-y-1 sm:col-span-2">
                        <Label className="text-xs">Upgrade meal plan</Label>
                        <Controller
                          control={control}
                          name={`benefits.${index}.upgradeToMealPlanId`}
                          render={({ field: f }) => (
                            <SearchableCombobox
                              value={f.value ?? 0}
                              onChange={(v) => f.onChange(v === 0 ? null : v)}
                              options={mealPlanOptions}
                              placeholder="All meal plans"
                            />
                          )}
                        />
                      </div>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => benefitsArray.remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove benefit
                  </Button>
                </div>
              );
            })
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              benefitsArray.append({
                promotionBenefitTypeId: benefitTypes[0]?.promotionBenefitTypeKey ?? 0,
                value: null,
                stayNights: null,
                payNights: null,
                freeNights: null,
                upgradeToPropertyRoomId: null,
                upgradeToMealPlanId: null,
                isActive: true,
              })
            }
            disabled={benefitTypes.length === 0}
          >
            <Plus className="h-4 w-4" />
            Add benefit
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div>
            <h3 className="text-sm font-medium">Applicable weekdays</h3>
            <p className="text-xs text-muted-foreground">
              Leave all unselected to apply every day of the week.
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
          {entry ? "Save changes" : "Create promotion"}
        </Button>
        <Button variant="outline" nativeButton={false} render={<Link href={returnHref} />}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
