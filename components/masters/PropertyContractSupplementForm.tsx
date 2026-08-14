"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import {
  BedDouble,
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  Save,
  Trash2,
  Users,
  Utensils,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Section } from "@/components/masters/PropertyFormSection";
import { SearchableCombobox } from "@/components/shared/SearchableCombobox";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { resolveSessionCompanyKey } from "@/lib/session-company";
import {
  DEFAULT_SUPPLEMENT_TYPES,
  supplementCodeFromType,
  type SupplementTypeCatalogEntry,
} from "@/lib/constants/supplement-types";
import { listPropertyRooms } from "@/lib/services/property-rooms.service";
import { listRateBasis } from "@/lib/services/rate-basis.service";
import { listDayOfWeeks } from "@/lib/services/day-of-weeks.service";
import { listPropertyContractRatePlans } from "@/lib/services/property-contract-rate-plans.service";
import { listPropertyContractRates } from "@/lib/services/property-contract-rates.service";
import {
  createPropertyContractSupplement,
  updatePropertyContractSupplement,
  ensureDefaultSupplementTypes,
  listSupplementTypes,
  PropertyContractSupplementApiError,
} from "@/lib/services/property-contract-supplements.service";
import type {
  DayOfWeek,
  PropertyContract,
  PropertyContractRate,
  PropertyContractRatePlan,
  PropertyContractSupplement,
  PropertyRoom,
  RateBasis,
  SupplementType,
} from "@/types";
import { cn } from "@/lib/utils";

const periodSchema = z.object({
  fromDate: z.string().min(1, "Start date required"),
  toDate: z.string().min(1, "End date required"),
  isMandatory: z.boolean(),
  isActive: z.boolean(),
});

const ageSchema = z.object({
  fromAge: z.number().min(0),
  toAge: z.number().min(0),
  rateBasisId: z.number().int().positive(),
  amount: z.number().min(0),
  isFree: z.boolean(),
  isActive: z.boolean(),
});

const ratePlanSchema = z.object({
  propertyContractRatePlanId: z.number().int().positive(),
  amount: z.number().min(0),
  isActive: z.boolean(),
});

const schema = z.object({
  propertyContractId: z.number().int().positive(),
  supplementTypeId: z.number().int().positive("Choose a supplement type"),
  supplementCode: z.string().trim().min(1, "Code is required").max(50),
  supplementName: z.string().trim().min(1, "Name is required").max(150),
  propertyRoomId: z.number().int().positive().nullable(),
  rateBasisId: z.number().int().positive("Choose how the price is calculated"),
  amount: z.number().min(0, "Amount cannot be negative"),
  isMandatory: z.boolean(),
  isActive: z.boolean(),
  displayOrder: z.number().int().min(0),
  dayOfWeekIds: z.array(z.number().int().positive()),
  periods: z.array(periodSchema),
  ageBands: z.array(ageSchema),
  ratePlans: z.array(ratePlanSchema),
});

type FormValues = z.infer<typeof schema>;

function mealRatePlanRows(
  plans: PropertyContractRatePlan[],
  existing: { propertyContractRatePlanId: number; amount: number; isActive: boolean }[]
) {
  const byId = new Map(existing.map((row) => [row.propertyContractRatePlanId, row]));
  return plans.map((plan) => ({
    propertyContractRatePlanId: plan.propertyContractRatePlanKey,
    amount: byId.get(plan.propertyContractRatePlanKey)?.amount ?? 0,
    isActive: true,
  }));
}

function nextSupplementCode(code: string): string {
  const trimmed = code.trim().toUpperCase();
  const match = trimmed.match(/^(.*?)-(\d+)$/);
  if (match) {
    const next = Number(match[2]) + 1;
    return `${match[1]}-${String(next).padStart(2, "0")}`;
  }
  return `${trimmed}-02`;
}

function defaultValues(contract: PropertyContract): FormValues {
  return {
    propertyContractId: contract.propertyContractKey,
    supplementTypeId: 0,
    supplementCode: "",
    supplementName: "",
    propertyRoomId: null,
    rateBasisId: 0,
    amount: 0,
    isMandatory: false,
    isActive: true,
    displayOrder: 0,
    dayOfWeekIds: [],
    periods: [],
    ageBands: [],
    ratePlans: [],
  };
}

function valuesFromEntry(entry: PropertyContractSupplement): FormValues {
  return {
    propertyContractId: entry.propertyContractId,
    supplementTypeId: entry.supplementTypeId,
    supplementCode: entry.supplementCode,
    supplementName: entry.supplementName,
    propertyRoomId: entry.propertyRoomId,
    rateBasisId: entry.rateBasisId,
    amount: entry.amount,
    isMandatory: entry.isMandatory,
    isActive: entry.isActive,
    displayOrder: entry.displayOrder,
    dayOfWeekIds: entry.dayOfWeekIds,
    periods: entry.periods.map((p) => ({
      fromDate: p.fromDate,
      toDate: p.toDate,
      isMandatory: p.isMandatory,
      isActive: p.isActive,
    })),
    ageBands: entry.ageBands.map((a) => ({
      fromAge: a.fromAge,
      toAge: a.toAge,
      rateBasisId: a.rateBasisId,
      amount: a.amount,
      isFree: a.isFree,
      isActive: a.isActive,
    })),
    ratePlans: entry.ratePlans.map((rp) => ({
      propertyContractRatePlanId: rp.propertyContractRatePlanId,
      amount: rp.amount,
      isActive: rp.isActive,
    })),
  };
}

function catalogEntryForType(
  types: SupplementType[],
  typeId: number
): SupplementTypeCatalogEntry | undefined {
  const match = types.find((t) => t.supplementTypeKey === typeId);
  if (!match) return undefined;
  return DEFAULT_SUPPLEMENT_TYPES.find(
    (c) => c.code === match.supplementTypeCode.toUpperCase()
  );
}

function formatRateBasisLabel(b: RateBasis): string {
  const name = b.rateBasisName.trim();
  if (/^[A-Z0-9_\s-]+$/.test(name)) {
    return name
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return name;
}

function rateBasisDisplayLabel(
  rateBasisRows: RateBasis[],
  value: string | null,
  placeholder: string
): string {
  if (!value) return placeholder;
  const basis = rateBasisRows.find((b) => String(b.rateBasisId) === value);
  return basis ? formatRateBasisLabel(basis) : placeholder;
}

function SupplementTypeCard({
  catalog,
  typeRow,
  selected,
  onSelect,
}: {
  catalog: SupplementTypeCatalogEntry;
  typeRow?: SupplementType;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={!typeRow}
      onClick={onSelect}
      className={cn(
        "rounded-xl border p-4 text-left transition-colors",
        selected
          ? "border-primary bg-primary/5 ring-2 ring-primary"
          : "border-border hover:border-primary/40 hover:bg-muted/40",
        !typeRow && "cursor-not-allowed opacity-50"
      )}
    >
      <p className="text-sm font-semibold">{catalog.name}</p>
      <p className="mt-0.5 font-mono text-xs text-muted-foreground">{catalog.code}</p>
      <p className="mt-2 text-xs text-muted-foreground">{catalog.example}</p>
    </button>
  );
}

function MealGroupBulkApply({
  example,
  onApply,
}: {
  example: string;
  onApply: (amount: number) => void;
}) {
  const [amount, setAmount] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        type="number"
        min={0}
        step="0.01"
        className="h-8 w-28"
        placeholder={example}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onApply(Number(amount) || 0)}
      >
        Apply to all
      </Button>
    </div>
  );
}

/** Create or edit contract supplement — simple core fields + optional advanced rules. */
export function PropertyContractSupplementForm({
  lockedContract,
  entry,
}: {
  lockedContract: PropertyContract;
  entry?: PropertyContractSupplement;
}) {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();
  const sessionUser = useSessionStore((s) => s.user);
  const activeTenant = useTenantStore((s) => s.tenant);
  const tenantKey = sessionUser?.tenantKey ?? activeTenant.tenantKey ?? 0;
  const companyKey = resolveSessionCompanyKey(sessionUser) ?? 0;
  const actorKey = sessionUser?.userKey ?? 0;

  const returnHref = `/${role}/extranet/contracts/${lockedContract.propertyContractKey}?tab=supplements`;
  const isEdit = !!entry;

  const [loading, setLoading] = useState(true);
  const [seedingTypes, setSeedingTypes] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(
    () =>
      !!entry &&
      (entry.periods.length > 0 ||
        entry.ageBands.length > 0 ||
        entry.ratePlans.length > 0 ||
        entry.dayOfWeekIds.length > 0)
  );
  const [rooms, setRooms] = useState<PropertyRoom[]>([]);
  const [supplementTypes, setSupplementTypes] = useState<SupplementType[]>([]);
  const [rateBasisRows, setRateBasisRows] = useState<RateBasis[]>([]);
  const [daysOfWeek, setDaysOfWeek] = useState<DayOfWeek[]>([]);
  const [contractRatePlans, setContractRatePlans] = useState<PropertyContractRatePlan[]>([]);
  const [contractRates, setContractRates] = useState<PropertyContractRate[]>([]);
  const [savingAndAddingAnother, setSavingAndAddingAnother] = useState(false);
  const [savedInSession, setSavedInSession] = useState<{ name: string; code: string }[]>([]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: entry ? valuesFromEntry(entry) : defaultValues(lockedContract),
  });

  const periodsArray = useFieldArray({ control, name: "periods" });
  const ageArray = useFieldArray({ control, name: "ageBands" });
  const ratePlanArray = useFieldArray({ control, name: "ratePlans" });
  const selectedDayIds = watch("dayOfWeekIds");
  const selectedTypeId = watch("supplementTypeId");
  const selectedCatalog = catalogEntryForType(supplementTypes, selectedTypeId);
  const isMealType = selectedCatalog?.code === "MEAL";
  const watchedRatePlans = watch("ratePlans");

  const typesByCode = useMemo(() => {
    const map = new Map<string, SupplementType>();
    for (const t of supplementTypes) map.set(t.supplementTypeCode.toUpperCase(), t);
    return map;
  }, [supplementTypes]);

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
    () =>
      contractRatePlans.map((p) => ({
        value: p.propertyContractRatePlanKey,
        label: `${p.ratePlanName} · ${p.mealPlanName ?? p.mealPlanCode ?? "Meal"}`,
        sublabel: p.ratePlanCode,
      })),
    [contractRatePlans]
  );

  const ratePlanIdsWithContractRate = useMemo(
    () => new Set(contractRates.map((rate) => rate.propertyContractRatePlanId)),
    [contractRates]
  );

  /** Meal extras apply only to rate plans that do not already have contracted room rates. */
  const mealEligibleRatePlans = useMemo(
    () =>
      contractRatePlans.filter(
        (plan) => !ratePlanIdsWithContractRate.has(plan.propertyContractRatePlanKey)
      ),
    [contractRatePlans, ratePlanIdsWithContractRate]
  );

  const mealGroups = useMemo(() => {
    const map = new Map<
      number,
      { mealPlanId: number; code: string; name: string; plans: PropertyContractRatePlan[] }
    >();
    for (const plan of mealEligibleRatePlans) {
      const existing = map.get(plan.mealPlanId) ?? {
        mealPlanId: plan.mealPlanId,
        code: plan.mealPlanCode ?? "",
        name: plan.mealPlanName ?? plan.mealPlanCode ?? "Meal plan",
        plans: [],
      };
      existing.plans.push(plan);
      map.set(plan.mealPlanId, existing);
    }
    return [...map.values()]
      .filter((group) => group.plans.length > 0)
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [mealEligibleRatePlans]);

  function resetFormForAnother(lastCode?: string) {
    reset({
      ...defaultValues(lockedContract),
      supplementCode: lastCode ? nextSupplementCode(lastCode) : "",
    });
    setShowAdvanced(false);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function loadLookups(seedIfMissing: boolean) {
    if (tenantKey <= 0 || companyKey <= 0 || !actorKey) return;

    let types = await listSupplementTypes({ tenantId: tenantKey, companyId: companyKey, activeOnly: true });
    if (seedIfMissing && types.length < DEFAULT_SUPPLEMENT_TYPES.length) {
      setSeedingTypes(true);
      try {
        types = await ensureDefaultSupplementTypes({
          tenantId: tenantKey,
          companyId: companyKey,
          createdBy: actorKey,
        });
      } finally {
        setSeedingTypes(false);
      }
    }

    const [roomRows, basis, days, plans, rates] = await Promise.all([
      listPropertyRooms({ tenantId: tenantKey, propertyId: lockedContract.propertyId, activeOnly: true }),
      listRateBasis({ tenantId: tenantKey, companyId: companyKey, activeOnly: true }),
      listDayOfWeeks({ activeOnly: true }),
      listPropertyContractRatePlans({ propertyContractId: lockedContract.propertyContractKey, activeOnly: true }),
      listPropertyContractRates({ propertyContractId: lockedContract.propertyContractKey, activeOnly: true }),
    ]);

    setRooms(roomRows);
    setSupplementTypes(types);
    setRateBasisRows(basis);
    setDaysOfWeek(days);
    setContractRatePlans(plans);
    setContractRates(rates);
  }

  useEffect(() => {
    if (tenantKey <= 0 || companyKey <= 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    loadLookups(!isEdit)
      .catch(() => {
        if (!cancelled) toast.error("Failed to load supplement form");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantKey, companyKey, lockedContract.propertyContractKey, lockedContract.propertyId, isEdit]);

  useEffect(() => {
    if (loading || !isMealType || mealEligibleRatePlans.length === 0) return;
    const current = watch("ratePlans");
    const eligibleIds = new Set(mealEligibleRatePlans.map((plan) => plan.propertyContractRatePlanKey));
    const currentEligible = current.filter((row) => eligibleIds.has(row.propertyContractRatePlanId));
    const currentIds = new Set(currentEligible.map((row) => row.propertyContractRatePlanId));
    const needsMerge = mealEligibleRatePlans.some(
      (plan) => !currentIds.has(plan.propertyContractRatePlanKey)
    );
    if (needsMerge || currentEligible.length !== current.length) {
      ratePlanArray.replace(mealRatePlanRows(mealEligibleRatePlans, currentEligible));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isMealType, mealEligibleRatePlans]);

  function selectSupplementType(catalog: SupplementTypeCatalogEntry) {
    const typeRow = typesByCode.get(catalog.code);
    if (!typeRow) return;

    setValue("supplementTypeId", typeRow.supplementTypeKey, { shouldValidate: true });
    setValue("supplementName", catalog.example, { shouldDirty: true });
    setValue("supplementCode", supplementCodeFromType(catalog.code), { shouldDirty: true });
    setValue("displayOrder", typeRow.displayOrder ?? 0);

    if (catalog.code === "CHILD" && ageArray.fields.length === 0) {
      ageArray.append({
        fromAge: 6,
        toAge: 11,
        rateBasisId: rateBasisRows[0]?.rateBasisId ?? 0,
        amount: 0,
        isFree: false,
        isActive: true,
      });
      setShowAdvanced(true);
    }

    if (catalog.code === "MEAL") {
      setValue("amount", 0);
      setValue("isMandatory", false);
      ratePlanArray.replace(mealRatePlanRows(mealEligibleRatePlans, watch("ratePlans")));
    }
  }

  function applyMealAmount(mealPlanId: number, amount: number) {
    const ids = new Set(
      mealEligibleRatePlans
        .filter((plan) => plan.mealPlanId === mealPlanId)
        .map((plan) => plan.propertyContractRatePlanKey)
    );
    watchedRatePlans.forEach((row, index) => {
      if (ids.has(row.propertyContractRatePlanId)) {
        setValue(`ratePlans.${index}.amount`, amount, { shouldDirty: true });
      }
    });
  }

  function toggleDay(dayId: number, checked: boolean) {
    const current = new Set(selectedDayIds);
    if (checked) current.add(dayId);
    else current.delete(dayId);
    setValue("dayOfWeekIds", [...current], { shouldDirty: true });
  }

  async function onSubmit(values: FormValues, stayOnPage: boolean) {
    if (tenantKey <= 0 || companyKey <= 0 || !actorKey) {
      toast.error("Missing tenant, company, or user context.");
      return;
    }

    const payload = {
      tenantId: tenantKey,
      companyId: companyKey,
      propertyContractId: values.propertyContractId,
      supplementTypeId: values.supplementTypeId,
      supplementCode: values.supplementCode.trim().toUpperCase(),
      supplementName: values.supplementName.trim(),
      propertyRoomId: values.propertyRoomId && values.propertyRoomId > 0 ? values.propertyRoomId : null,
      rateBasisId: values.rateBasisId,
      amount: values.amount,
      isMandatory: values.isMandatory,
      isActive: values.isActive,
      displayOrder: values.displayOrder,
      dayOfWeekIds: values.dayOfWeekIds,
      periods: values.periods,
      ageBands: values.ageBands,
      ratePlans: isMealType
        ? values.ratePlans.filter(
            (row) =>
              row.amount > 0 &&
              mealEligibleRatePlans.some(
                (plan) => plan.propertyContractRatePlanKey === row.propertyContractRatePlanId
              )
          )
        : values.ratePlans,
    };

    if (stayOnPage) setSavingAndAddingAnother(true);

    try {
      if (entry) {
        await updatePropertyContractSupplement(entry.propertyContractSupplementKey, {
          ...payload,
          modifiedBy: actorKey,
        });
        toast.success("Supplement saved");
        router.push(returnHref);
      } else {
        await createPropertyContractSupplement({ ...payload, createdBy: actorKey });
        if (stayOnPage) {
          setSavedInSession((prev) => [
            ...prev,
            { name: payload.supplementName, code: payload.supplementCode },
          ]);
          toast.success(`"${payload.supplementName}" saved — add the next supplement`);
          resetFormForAnother(payload.supplementCode);
        } else {
          toast.success("Supplement added");
          router.push(returnHref);
        }
      }
    } catch (error) {
      toast.error(
        error instanceof PropertyContractSupplementApiError ? error.message : "Could not save supplement"
      );
    } finally {
      if (stayOnPage) setSavingAndAddingAnother(false);
    }
  }

  if (loading || seedingTypes) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {seedingTypes ? "Setting up supplement types…" : "Loading…"}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit((v) => onSubmit(v, false))} className="mx-auto max-w-3xl space-y-6">
      {savedInSession.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-4">
            <p className="text-sm font-medium">
              {savedInSession.length} supplement{savedInSession.length === 1 ? "" : "s"} saved this session
            </p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {savedInSession.map((row) => (
                <li key={row.code}>
                  {row.name} <span className="font-mono text-xs">({row.code})</span>
                </li>
              ))}
            </ul>
            <Button
              type="button"
              variant="link"
              className="mt-2 h-auto p-0"
              nativeButton={false}
              render={<Link href={returnHref} />}
            >
              Done — view all supplements on contract
            </Button>
          </CardContent>
        </Card>
      )}
      {/* Step 1 — pick type */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div>
            <h2 className="text-base font-semibold">1. What kind of supplement?</h2>
            <p className="text-sm text-muted-foreground">
              Pick a type — we&apos;ll suggest a name and code you can edit below.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {DEFAULT_SUPPLEMENT_TYPES.map((catalog) => (
              <SupplementTypeCard
                key={catalog.code}
                catalog={catalog}
                typeRow={typesByCode.get(catalog.code)}
                selected={selectedTypeId === typesByCode.get(catalog.code)?.supplementTypeKey}
                onSelect={() => selectSupplementType(catalog)}
              />
            ))}
          </div>
          {errors.supplementTypeId && (
            <p className="text-sm text-destructive">{errors.supplementTypeId.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Step 2 — essentials */}
      <Section
        icon={BedDouble}
        title="2. Supplement details"
        description="Name, price, and where it applies on this contract."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="supplementName">Display name *</Label>
            <Input
              id="supplementName"
              {...register("supplementName")}
              placeholder={selectedCatalog?.example ?? "e.g. Adult extra bed"}
            />
            {selectedCatalog && (
              <p className="text-xs text-muted-foreground">Example: {selectedCatalog.example}</p>
            )}
            {errors.supplementName && (
              <p className="text-xs text-destructive">{errors.supplementName.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="supplementCode">Code *</Label>
            <Input
              id="supplementCode"
              {...register("supplementCode")}
              placeholder="EXTRABED-01"
              className="font-mono uppercase"
            />
            <p className="text-xs text-muted-foreground">Unique code on this contract</p>
            {errors.supplementCode && (
              <p className="text-xs text-destructive">{errors.supplementCode.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="amount">{isMealType ? "Fallback extra" : "Amount *"}</Label>
            <Input
              id="amount"
              type="number"
              min={0}
              step="0.01"
              {...register("amount", { valueAsNumber: true })}
              placeholder="0.00"
            />
            {isMealType ? (
              <p className="text-xs text-muted-foreground">
                Used only if a rate plan below has no extra. Leave 0 — Breakfast/HB amounts are set per rate plan.
              </p>
            ) : null}
            {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Price calculated *</Label>
            {rateBasisRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No rate basis found. Add Per Person, Per Room, etc. under Property → Rate Basis.
              </p>
            ) : (
              <Controller
                control={control}
                name="rateBasisId"
                render={({ field }) => (
                  <Select
                    value={field.value > 0 ? String(field.value) : null}
                    onValueChange={(v) => field.onChange(v ? Number(v) : 0)}
                  >
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue>
                        {(value: string | null) =>
                          rateBasisDisplayLabel(rateBasisRows, value, "Select")
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {rateBasisRows.map((b) => (
                        <SelectItem key={b.rateBasisId} value={String(b.rateBasisId)}>
                          {formatRateBasisLabel(b)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            )}
            {errors.rateBasisId && (
              <p className="text-xs text-destructive">{errors.rateBasisId.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
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
            <p className="text-xs text-muted-foreground">Leave as all rooms unless this applies to one type only</p>
          </div>

          <div className="flex flex-col justify-end gap-3 sm:col-span-2 sm:flex-row sm:items-center">
            {!isMealType && (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={watch("isMandatory")}
                  onCheckedChange={(c) => setValue("isMandatory", c === true)}
                />
                Guest must purchase (mandatory)
              </label>
            )}
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={watch("isActive")}
                onCheckedChange={(c) => setValue("isActive", c === true)}
              />
              Active
            </label>
          </div>
        </div>
      </Section>

      {isMealType && (
        <Section
          icon={Utensils}
          title="3. Extra per meal / rate plan"
          description="Only rate plans without a contracted room rate are listed. Enter the extra added on top of the room-only rate."
        >
          {contractRatePlans.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add rate plans on this contract first (Room Only, Breakfast, HB). Meal extras are linked to those
              rate plans.
            </p>
          ) : mealEligibleRatePlans.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Every rate plan on this contract already has contracted room rates. Meal extras are not needed — use
              contract rates for Breakfast, HB, etc.
            </p>
          ) : (
            <div className="space-y-5">
              {mealGroups.map((group) => {
                const example =
                  /BB|BREAKFAST/i.test(`${group.code} ${group.name}`)
                    ? "50"
                    : /HB|HALF/i.test(`${group.code} ${group.name}`)
                      ? "100"
                      : /RO|ROOM.?ONLY/i.test(`${group.code} ${group.name}`)
                        ? "0"
                        : "0";
                return (
                  <div key={group.mealPlanId} className="rounded-lg border">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">{group.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {group.code || "Meal"} · extra added on top of room-only rate
                        </p>
                      </div>
                      <MealGroupBulkApply
                        example={example}
                        onApply={(amount) => applyMealAmount(group.mealPlanId, amount)}
                      />
                    </div>
                    <div className="divide-y">
                      {group.plans.map((plan) => {
                        const index = watchedRatePlans.findIndex(
                          (row) => row.propertyContractRatePlanId === plan.propertyContractRatePlanKey
                        );
                        if (index < 0) return null;
                        return (
                          <div
                            key={plan.propertyContractRatePlanKey}
                            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                          >
                            <div>
                              <p className="text-sm">{plan.ratePlanName}</p>
                              <p className="font-mono text-xs text-muted-foreground">{plan.ratePlanCode}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-muted-foreground">Extra</Label>
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                className="w-28"
                                {...register(`ratePlans.${index}.amount`, { valueAsNumber: true })}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              <p className="text-xs text-muted-foreground">
                Example: room-only contracted at 100. Breakfast extra 50 → guest pays 150. Plans that already have
                full contract rates (e.g. HB at 200) are hidden here.
              </p>
            </div>
          )}
        </Section>
      )}

      {/* Optional advanced */}
      <Card>
        <CardContent className="pt-6">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 text-left"
            onClick={() => setShowAdvanced((v) => !v)}
          >
            <div>
              <h2 className="text-base font-semibold">Optional rules</h2>
              <p className="text-sm text-muted-foreground">
                Date ranges, child ages, rate-plan prices, or weekdays — only if needed
              </p>
            </div>
            {showAdvanced ? (
              <ChevronUp className="h-5 w-5 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />
            )}
          </button>

          {showAdvanced && (
            <div className="mt-6 space-y-8 border-t pt-6">
              {/* Periods */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-medium">Valid dates</h3>
                  <p className="text-xs text-muted-foreground">
                    Limit when this supplement is offered (e.g. festive season)
                  </p>
                </div>
                {periodsArray.fields.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No date limits — applies for the whole contract.</p>
                ) : (
                  periodsArray.fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="grid gap-3 rounded-lg border bg-muted/20 p-3 sm:grid-cols-[1fr_1fr_auto_auto]"
                    >
                      <div className="space-y-1">
                        <Label className="text-xs">From</Label>
                        <Input type="date" {...register(`periods.${index}.fromDate`)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">To</Label>
                        <Input type="date" {...register(`periods.${index}.toDate`)} />
                      </div>
                      <label className="flex items-end gap-2 pb-2 text-xs">
                        <Checkbox
                          checked={watch(`periods.${index}.isMandatory`)}
                          onCheckedChange={(c) => setValue(`periods.${index}.isMandatory`, c === true)}
                        />
                        Mandatory in this period
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="self-end"
                        onClick={() => periodsArray.remove(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    periodsArray.append({ fromDate: "", toDate: "", isMandatory: false, isActive: true })
                  }
                >
                  <Plus className="h-4 w-4" />
                  Add date range
                </Button>
              </div>

              {/* Age bands */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-medium">Age-based pricing</h3>
                  <p className="text-xs text-muted-foreground">
                    For child supplements — set age range and price per band
                  </p>
                </div>
                {ageArray.fields.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Same price for all ages (uses amount above).</p>
                ) : (
                  ageArray.fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="grid gap-3 rounded-lg border bg-muted/20 p-3 sm:grid-cols-2 lg:grid-cols-6"
                    >
                      <div className="space-y-1">
                        <Label className="text-xs">From age</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.5"
                          {...register(`ageBands.${index}.fromAge`, { valueAsNumber: true })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">To age</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.5"
                          {...register(`ageBands.${index}.toAge`, { valueAsNumber: true })}
                        />
                      </div>
                      <div className="space-y-1 lg:col-span-2">
                        <Label className="text-xs">Basis</Label>
                        <Controller
                          control={control}
                          name={`ageBands.${index}.rateBasisId`}
                          render={({ field: f }) => (
                            <Select
                              value={f.value > 0 ? String(f.value) : ""}
                              onValueChange={(v) => f.onChange(Number(v))}
                            >
                              <SelectTrigger className="h-9 w-full">
                                <SelectValue>
                                  {(value: string | null) =>
                                    rateBasisDisplayLabel(rateBasisRows, value, "Basis")
                                  }
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {rateBasisRows.map((b) => (
                                  <SelectItem key={b.rateBasisId} value={String(b.rateBasisId)}>
                                    {formatRateBasisLabel(b)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Amount</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          {...register(`ageBands.${index}.amount`, { valueAsNumber: true })}
                        />
                      </div>
                      <div className="flex items-end gap-2 pb-2">
                        <label className="flex items-center gap-2 text-xs">
                          <Checkbox
                            checked={watch(`ageBands.${index}.isFree`)}
                            onCheckedChange={(c) => setValue(`ageBands.${index}.isFree`, c === true)}
                          />
                          Free
                        </label>
                        <Button type="button" variant="ghost" size="sm" onClick={() => ageArray.remove(index)}>
                          <Trash2 className="h-4 w-4" />
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
                    ageArray.append({
                      fromAge: 0,
                      toAge: 12,
                      rateBasisId: rateBasisRows[0]?.rateBasisId ?? 0,
                      amount: 0,
                      isFree: false,
                      isActive: true,
                    })
                  }
                >
                  <Users className="h-4 w-4" />
                  Add age band
                </Button>
              </div>

              {/* Rate plan overrides */}
              {!isMealType && contractRatePlans.length > 0 && (
                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-medium">Rate plan overrides</h3>
                    <p className="text-xs text-muted-foreground">
                      Different amount for a specific rate plan (optional)
                    </p>
                  </div>
                  {ratePlanArray.fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="grid gap-3 rounded-lg border bg-muted/20 p-3 sm:grid-cols-[1fr_auto_auto]"
                    >
                      <Controller
                        control={control}
                        name={`ratePlans.${index}.propertyContractRatePlanId`}
                        render={({ field: f }) => (
                          <SearchableCombobox
                            value={f.value > 0 ? f.value : null}
                            onChange={(v) => f.onChange(v)}
                            options={ratePlanOptions}
                            placeholder="Rate plan"
                          />
                        )}
                      />
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        className="w-32"
                        {...register(`ratePlans.${index}.amount`, { valueAsNumber: true })}
                      />
                      <Button type="button" variant="ghost" size="sm" onClick={() => ratePlanArray.remove(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      ratePlanArray.append({
                        propertyContractRatePlanId: contractRatePlans[0]?.propertyContractRatePlanKey ?? 0,
                        amount: 0,
                        isActive: true,
                      })
                    }
                  >
                    <Plus className="h-4 w-4" />
                    Add rate plan override
                  </Button>
                </div>
              )}

              {/* Weekdays */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-medium">Apply on specific weekdays</h3>
                  <p className="text-xs text-muted-foreground">
                    Click days to include. Leave all unselected to apply every day.
                  </p>
                  {selectedDayIds.length > 0 && (
                    <p className="mt-1 text-xs font-medium text-primary">
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
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 border-t pt-4">
        <Button type="submit" size="lg" disabled={isSubmitting || savingAndAddingAnother}>
          {isSubmitting && !savingAndAddingAnother ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isEdit ? "Save changes" : savedInSession.length > 0 ? "Save & finish" : "Add supplement"}
        </Button>
        {!isEdit && (
          <Button
            type="button"
            size="lg"
            variant="outline"
            disabled={isSubmitting || savingAndAddingAnother}
            onClick={handleSubmit((v) => onSubmit(v, true))}
          >
            {savingAndAddingAnother ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Save & add another
          </Button>
        )}
        <Button type="button" variant="outline" nativeButton={false} render={<Link href={returnHref} />}>
          <X className="h-4 w-4" />
          Cancel
        </Button>
      </div>
    </form>
  );
}
