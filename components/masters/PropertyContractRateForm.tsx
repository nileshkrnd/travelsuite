"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { BadgeDollarSign, Loader2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Section } from "@/components/masters/PropertyFormSection";
import { SearchableCombobox } from "@/components/shared/SearchableCombobox";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { resolveSessionCompanyKey } from "@/lib/session-company";
import { listPropertyContractSeasonPeriods } from "@/lib/services/property-contract-season-periods.service";
import { listPropertyContractRatePlans } from "@/lib/services/property-contract-rate-plans.service";
import { listPropertyRooms } from "@/lib/services/property-rooms.service";
import { listOccupancyTypes } from "@/lib/services/occupancy-types.service";
import {
  updatePropertyContractRate,
  PropertyContractRatesApiError,
} from "@/lib/services/property-contract-rates.service";
import type {
  PropertyContract,
  PropertyContractRate,
  PropertyContractRatePlan,
  PropertyContractSeasonPeriod,
  PropertyRoom,
} from "@/types";
import type { OccupancyType } from "@/types";

const schema = z.object({
  propertyContractId: z.number().int().positive("Contract is required"),
  propertyContractSeasonPeriodId: z.number().int().positive("Season period is required"),
  propertyContractRatePlanId: z.number().int().positive("Rate plan is required"),
  propertyRoomId: z.number().int().positive("Room type is required"),
  occupancyTypeId: z.number().int().positive("Occupancy type is required"),
  rateAmount: z.number().min(0, "Rate amount is required"),
  isActive: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

function valuesFromEntry(entry: PropertyContractRate): FormValues {
  return {
    propertyContractId: entry.propertyContractId,
    propertyContractSeasonPeriodId: entry.propertyContractSeasonPeriodId,
    propertyContractRatePlanId: entry.propertyContractRatePlanId,
    propertyRoomId: entry.propertyRoomId,
    occupancyTypeId: entry.occupancyTypeId,
    rateAmount: entry.rateAmount,
    isActive: entry.isActive,
  };
}

function seasonPeriodLabel(p: PropertyContractSeasonPeriod) {
  const season = p.seasonName ?? p.seasonCode ?? "Season";
  return `${season} (${p.fromDate} → ${p.toDate})`;
}

/** Edit form for a single contract rate (create uses batch form). */
export function PropertyContractRateForm({
  entry,
  lockedContract,
}: {
  entry: PropertyContractRate;
  lockedContract: PropertyContract;
}) {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();
  const sessionUser = useSessionStore((s) => s.user);
  const activeTenant = useTenantStore((s) => s.tenant);
  const tenantKey = sessionUser?.tenantKey ?? activeTenant.tenantKey ?? 0;
  const companyKey = resolveSessionCompanyKey(sessionUser) ?? 0;
  const actorKey = sessionUser?.userKey ?? 0;

  const returnHref = `/${role}/extranet/contracts/${lockedContract.propertyContractKey}?tab=rates`;

  const [loading, setLoading] = useState(true);
  const [seasonPeriods, setSeasonPeriods] = useState<PropertyContractSeasonPeriod[]>([]);
  const [ratePlans, setRatePlans] = useState<PropertyContractRatePlan[]>([]);
  const [rooms, setRooms] = useState<PropertyRoom[]>([]);
  const [occupancyTypes, setOccupancyTypes] = useState<OccupancyType[]>([]);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: valuesFromEntry(entry),
  });

  useEffect(() => {
    if (tenantKey <= 0 || companyKey <= 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      listPropertyContractSeasonPeriods({ propertyContractId: lockedContract.propertyContractKey }),
      listPropertyContractRatePlans({ propertyContractId: lockedContract.propertyContractKey }),
      listPropertyRooms({
        tenantId: tenantKey,
        propertyId: lockedContract.propertyId,
        activeOnly: true,
      }),
      listOccupancyTypes({ tenantId: tenantKey, companyId: companyKey, activeOnly: true }),
    ])
      .then(([periods, plans, roomRows, occTypes]) => {
        if (cancelled) return;
        setSeasonPeriods(periods);
        setRatePlans(plans);
        setRooms(roomRows);
        setOccupancyTypes(occTypes);
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
  }, [tenantKey, companyKey, lockedContract.propertyContractKey, lockedContract.propertyId]);

  async function onSubmit(values: FormValues) {
    if (!actorKey || tenantKey <= 0 || companyKey <= 0) {
      toast.error("Missing session context — sign in again.");
      return;
    }
    const payload = {
      tenantId: tenantKey,
      companyId: companyKey,
      propertyContractId: values.propertyContractId,
      propertyContractSeasonPeriodId: values.propertyContractSeasonPeriodId,
      propertyContractRatePlanId: values.propertyContractRatePlanId,
      propertyRoomId: values.propertyRoomId,
      occupancyTypeId: values.occupancyTypeId,
      rateAmount: values.rateAmount,
      isActive: values.isActive,
    };
    try {
      await updatePropertyContractRate(entry.propertyContractRateKey, {
        ...payload,
        modifiedBy: actorKey,
      });
      toast.success("Contract rate updated");
      router.push(returnHref);
    } catch (error) {
      toast.error(
        error instanceof PropertyContractRatesApiError ? error.message : "Could not save contract rate"
      );
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading form…</p>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-6">
      <Section
        icon={BadgeDollarSign}
        title="Contract rate"
        description={`Rate for ${lockedContract.contractName}`}
      >
        <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
          <p className="font-medium text-foreground">{lockedContract.contractName}</p>
          <p className="text-muted-foreground">{lockedContract.contractNumber}</p>
        </div>

        <div className="space-y-2">
          <Label required>Season period</Label>
          <Controller
            name="propertyContractSeasonPeriodId"
            control={control}
            render={({ field }) => (
              <SearchableCombobox
                value={field.value > 0 ? field.value : null}
                onChange={(v) => field.onChange(v ?? 0)}
                options={seasonPeriods.map((p) => ({
                  value: p.propertyContractSeasonPeriodKey,
                  label: seasonPeriodLabel(p),
                  sublabel: p.seasonCode,
                }))}
                placeholder="Search season period…"
                emptyLabel="No season periods found."
                ariaInvalid={!!errors.propertyContractSeasonPeriodId}
              />
            )}
          />
          {errors.propertyContractSeasonPeriodId && (
            <p className="text-sm text-destructive">{errors.propertyContractSeasonPeriodId.message}</p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label required>Rate plan</Label>
            <Controller
              name="propertyContractRatePlanId"
              control={control}
              render={({ field }) => (
                <SearchableCombobox
                  value={field.value > 0 ? field.value : null}
                  onChange={(v) => field.onChange(v ?? 0)}
                  options={ratePlans.map((p) => ({
                    value: p.propertyContractRatePlanKey,
                    label: p.ratePlanName,
                    sublabel: p.ratePlanCode,
                  }))}
                  placeholder="Search rate plan…"
                  emptyLabel="No rate plans found."
                  ariaInvalid={!!errors.propertyContractRatePlanId}
                />
              )}
            />
            {errors.propertyContractRatePlanId && (
              <p className="text-sm text-destructive">{errors.propertyContractRatePlanId.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label required>Room type</Label>
            <Controller
              name="propertyRoomId"
              control={control}
              render={({ field }) => (
                <SearchableCombobox
                  value={field.value > 0 ? field.value : null}
                  onChange={(v) => field.onChange(v ?? 0)}
                  options={rooms.map((r) => ({
                    value: r.propertyRoomKey,
                    label: r.roomName,
                    sublabel: r.roomCode,
                  }))}
                  placeholder="Search room type…"
                  emptyLabel="No room types found."
                  ariaInvalid={!!errors.propertyRoomId}
                />
              )}
            />
            {errors.propertyRoomId && (
              <p className="text-sm text-destructive">{errors.propertyRoomId.message}</p>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label required>Occupancy type</Label>
            <Controller
              name="occupancyTypeId"
              control={control}
              render={({ field }) => (
                <SearchableCombobox
                  value={field.value > 0 ? field.value : null}
                  onChange={(v) => field.onChange(v ?? 0)}
                  options={occupancyTypes.map((o) => ({
                    value: o.occupancyTypeId,
                    label: o.occupancyTypeName,
                    sublabel: o.occupancyTypeCode,
                  }))}
                  placeholder="Search occupancy…"
                  emptyLabel="No occupancy types found."
                  ariaInvalid={!!errors.occupancyTypeId}
                />
              )}
            />
            {errors.occupancyTypeId && (
              <p className="text-sm text-destructive">{errors.occupancyTypeId.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="rateAmount" required>
              Rate amount
            </Label>
            <Input
              id="rateAmount"
              type="number"
              min={0}
              step="0.0001"
              aria-invalid={!!errors.rateAmount}
              {...register("rateAmount", { valueAsNumber: true })}
            />
            {errors.rateAmount && (
              <p className="text-sm text-destructive">{errors.rateAmount.message}</p>
            )}
          </div>
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
      </Section>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save changes
        </Button>
        <Button type="button" variant="outline" nativeButton={false} render={<Link href={returnHref} />}>
          <X className="h-4 w-4" />
          Cancel
        </Button>
      </div>
    </form>
  );
}
