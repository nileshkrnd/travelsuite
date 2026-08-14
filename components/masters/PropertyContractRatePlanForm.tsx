"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Tags, Loader2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Section } from "@/components/masters/PropertyFormSection";
import { SearchableCombobox } from "@/components/shared/SearchableCombobox";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { resolveSessionCompanyKey } from "@/lib/session-company";
import { listRatePlanTypes } from "@/lib/services/rate-plan-types.service";
import { listMealPlans } from "@/lib/services/meal-plans.service";
import { listRateBasis } from "@/lib/services/rate-basis.service";
import {
  createPropertyContractRatePlan,
  updatePropertyContractRatePlan,
  PropertyContractRatePlansApiError,
} from "@/lib/services/property-contract-rate-plans.service";
import type { MealPlan, PropertyContract, PropertyContractRatePlan, RateBasis, RatePlanType } from "@/types";

const schema = z.object({
  propertyContractId: z.number().int().positive("Contract is required"),
  ratePlanCode: z.string().trim().min(1, "Rate plan code is required").max(50),
  ratePlanName: z.string().trim().min(1, "Rate plan name is required").max(150),
  ratePlanTypeId: z.number().int().positive("Rate plan type is required"),
  mealPlanId: z.number().int().positive("Meal plan is required"),
  rateBasisId: z.number().int().positive("Rate basis is required"),
  displayOrder: z.number().int().min(0),
  isActive: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

function emptyValues(contractId = 0): FormValues {
  return {
    propertyContractId: contractId,
    ratePlanCode: "",
    ratePlanName: "",
    ratePlanTypeId: 0,
    mealPlanId: 0,
    rateBasisId: 0,
    displayOrder: 0,
    isActive: true,
  };
}

function valuesFromEntry(entry: PropertyContractRatePlan): FormValues {
  return {
    propertyContractId: entry.propertyContractId,
    ratePlanCode: entry.ratePlanCode,
    ratePlanName: entry.ratePlanName,
    ratePlanTypeId: entry.ratePlanTypeId,
    mealPlanId: entry.mealPlanId,
    rateBasisId: entry.rateBasisId,
    displayOrder: entry.displayOrder,
    isActive: entry.isActive,
  };
}

/** Shared Create / Modify form for contract rate plans (edit mode; create uses batch form). */
export function PropertyContractRatePlanForm({
  entry,
  lockedContract,
}: {
  entry?: PropertyContractRatePlan;
  lockedContract?: PropertyContract;
}) {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();
  const sessionUser = useSessionStore((s) => s.user);
  const activeTenant = useTenantStore((s) => s.tenant);
  const tenantKey = sessionUser?.tenantKey ?? activeTenant.tenantKey ?? 0;
  const companyKey = resolveSessionCompanyKey(sessionUser) ?? 0;
  const actorKey = sessionUser?.userKey ?? 0;
  const isEdit = !!entry;

  const returnHref = lockedContract
    ? `/${role}/extranet/contracts/${lockedContract.propertyContractKey}?tab=rate-plans`
    : `/${role}/extranet/contracts`;

  const [loading, setLoading] = useState(true);
  const [ratePlanTypes, setRatePlanTypes] = useState<RatePlanType[]>([]);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [rateBasisList, setRateBasisList] = useState<RateBasis[]>([]);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: entry
      ? valuesFromEntry(entry)
      : emptyValues(lockedContract?.propertyContractKey ?? 0),
  });

  useEffect(() => {
    if (tenantKey <= 0 || companyKey <= 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      listRatePlanTypes({ tenantId: tenantKey, companyId: companyKey, activeOnly: true }),
      listMealPlans({ tenantId: tenantKey, companyId: companyKey, activeOnly: true }),
      listRateBasis({ tenantId: tenantKey, companyId: companyKey, activeOnly: true }),
    ])
      .then(([types, meals, basis]) => {
        if (cancelled) return;
        setRatePlanTypes(types);
        setMealPlans(meals);
        setRateBasisList(basis);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load lookups");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantKey, companyKey]);

  async function onSubmit(values: FormValues) {
    if (!actorKey || tenantKey <= 0 || companyKey <= 0) {
      toast.error("Missing session context — sign in again.");
      return;
    }
    const payload = {
      tenantId: tenantKey,
      companyId: companyKey,
      propertyContractId: values.propertyContractId,
      ratePlanCode: values.ratePlanCode.trim(),
      ratePlanName: values.ratePlanName.trim(),
      ratePlanTypeId: values.ratePlanTypeId,
      mealPlanId: values.mealPlanId,
      rateBasisId: values.rateBasisId,
      displayOrder: values.displayOrder,
      isActive: values.isActive,
    };
    try {
      if (isEdit && entry) {
        await updatePropertyContractRatePlan(entry.propertyContractRatePlanKey, {
          ...payload,
          modifiedBy: actorKey,
        });
        toast.success("Rate plan updated");
      } else {
        await createPropertyContractRatePlan({ ...payload, createdBy: actorKey });
        toast.success("Rate plan created");
      }
      router.push(returnHref);
    } catch (error) {
      toast.error(
        error instanceof PropertyContractRatePlansApiError ? error.message : "Could not save rate plan"
      );
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading form…</p>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-6">
      <Section
        icon={Tags}
        title="Rate plan"
        description={
          lockedContract
            ? `Rate plan for ${lockedContract.contractName}`
            : "Contract rate plan details."
        }
      >
        {lockedContract && (
          <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
            <p className="font-medium text-foreground">{lockedContract.contractName}</p>
            <p className="text-muted-foreground">{lockedContract.contractNumber}</p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ratePlanCode" required>
              Rate plan code
            </Label>
            <Input
              id="ratePlanCode"
              placeholder="FIT-BB"
              aria-invalid={!!errors.ratePlanCode}
              {...register("ratePlanCode")}
            />
            {errors.ratePlanCode && (
              <p className="text-sm text-destructive">{errors.ratePlanCode.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="ratePlanName" required>
              Rate plan name
            </Label>
            <Input
              id="ratePlanName"
              placeholder="FIT Bed & Breakfast"
              aria-invalid={!!errors.ratePlanName}
              {...register("ratePlanName")}
            />
            {errors.ratePlanName && (
              <p className="text-sm text-destructive">{errors.ratePlanName.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label required>Rate plan type</Label>
          <Controller
            name="ratePlanTypeId"
            control={control}
            render={({ field }) => (
              <SearchableCombobox
                value={field.value > 0 ? field.value : null}
                onChange={(v) => field.onChange(v ?? 0)}
                options={ratePlanTypes.map((t) => ({
                  value: t.ratePlanTypeId,
                  label: t.ratePlanTypeName,
                  sublabel: t.ratePlanTypeCode,
                }))}
                placeholder="Search rate plan type…"
                emptyLabel="No types found."
                ariaInvalid={!!errors.ratePlanTypeId}
              />
            )}
          />
          {errors.ratePlanTypeId && (
            <p className="text-sm text-destructive">{errors.ratePlanTypeId.message}</p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label required>Meal plan</Label>
            <Controller
              name="mealPlanId"
              control={control}
              render={({ field }) => (
                <SearchableCombobox
                  value={field.value > 0 ? field.value : null}
                  onChange={(v) => field.onChange(v ?? 0)}
                  options={mealPlans.map((m) => ({
                    value: m.mealPlanId,
                    label: m.mealPlanName,
                    sublabel: m.mealPlanCode,
                  }))}
                  placeholder="Search meal plan…"
                  emptyLabel="No meal plans found."
                  ariaInvalid={!!errors.mealPlanId}
                />
              )}
            />
            {errors.mealPlanId && (
              <p className="text-sm text-destructive">{errors.mealPlanId.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label required>Rate basis</Label>
            <Controller
              name="rateBasisId"
              control={control}
              render={({ field }) => (
                <SearchableCombobox
                  value={field.value > 0 ? field.value : null}
                  onChange={(v) => field.onChange(v ?? 0)}
                  options={rateBasisList.map((b) => ({
                    value: b.rateBasisId,
                    label: b.rateBasisName,
                    sublabel: b.rateBasisCode,
                  }))}
                  placeholder="Search rate basis…"
                  emptyLabel="No rate basis found."
                  ariaInvalid={!!errors.rateBasisId}
                />
              )}
            />
            {errors.rateBasisId && (
              <p className="text-sm text-destructive">{errors.rateBasisId.message}</p>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="displayOrder">Display order</Label>
            <Input
              id="displayOrder"
              type="number"
              min={0}
              {...register("displayOrder", { valueAsNumber: true })}
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ? "active" : "inactive"}
                  onValueChange={(v) => field.onChange(v === "active")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
      </Section>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isEdit ? "Save changes" : "Create rate plan"}
        </Button>
        <Button type="button" variant="outline" nativeButton={false} render={<Link href={returnHref} />}>
          <X className="h-4 w-4" />
          Cancel
        </Button>
      </div>
    </form>
  );
}
