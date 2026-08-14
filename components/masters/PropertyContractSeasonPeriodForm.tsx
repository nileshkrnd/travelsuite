"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { CalendarDays, Loader2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Section } from "@/components/masters/PropertyFormSection";
import { SearchableCombobox } from "@/components/shared/SearchableCombobox";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { resolveSessionCompanyKey } from "@/lib/session-company";
import { listPropertyContracts } from "@/lib/services/property-contracts.service";
import { listPropertySeasons } from "@/lib/services/property-seasons.service";
import {
  createPropertyContractSeasonPeriod,
  updatePropertyContractSeasonPeriod,
  PropertyContractSeasonPeriodsApiError,
} from "@/lib/services/property-contract-season-periods.service";
import type { PropertyContract, PropertyContractSeasonPeriod, PropertySeason } from "@/types";

const schema = z
  .object({
    propertyContractId: z.number().int().positive("Contract is required"),
    propertySeasonId: z.number().int().positive("Season is required"),
    fromDate: z.string().trim().min(1, "From date is required"),
    toDate: z.string().trim().min(1, "To date is required"),
    isActive: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (values.toDate && values.fromDate && values.toDate < values.fromDate) {
      ctx.addIssue({ code: "custom", path: ["toDate"], message: "To date must be on or after from date" });
    }
  });
type FormValues = z.infer<typeof schema>;

function emptyValues(contractId = 0): FormValues {
  return {
    propertyContractId: contractId,
    propertySeasonId: 0,
    fromDate: "",
    toDate: "",
    isActive: true,
  };
}

function valuesFromEntry(entry: PropertyContractSeasonPeriod): FormValues {
  return {
    propertyContractId: entry.propertyContractId,
    propertySeasonId: entry.propertySeasonId,
    fromDate: entry.fromDate,
    toDate: entry.toDate,
    isActive: entry.isActive,
  };
}

/** Shared Create / Modify form for contract ↔ season date periods. */
export function PropertyContractSeasonPeriodForm({
  entry,
  lockedContract,
}: {
  entry?: PropertyContractSeasonPeriod;
  /** When set (e.g. from contract detail), contract is fixed and seasons filter to its property. */
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
  const contractLocked = !!lockedContract;

  const returnHref = lockedContract
    ? `/${role}/extranet/contracts/${lockedContract.propertyContractKey}?tab=season-periods`
    : `/${role}/extranet/contracts`;

  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<PropertyContract[]>(lockedContract ? [lockedContract] : []);
  const [seasons, setSeasons] = useState<PropertySeason[]>([]);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: entry
      ? valuesFromEntry(entry)
      : emptyValues(lockedContract?.propertyContractKey ?? 0),
  });

  const propertyContractId = useWatch({ control, name: "propertyContractId" });
  const propertySeasonId = useWatch({ control, name: "propertySeasonId" });

  const selectedContract = useMemo(() => {
    if (lockedContract) return lockedContract;
    return contracts.find((c) => c.propertyContractKey === propertyContractId);
  }, [contracts, propertyContractId, lockedContract]);

  const eligibleSeasons = useMemo(() => {
    if (!selectedContract) return [];
    return seasons.filter((s) => s.propertyId === selectedContract.propertyId);
  }, [seasons, selectedContract]);

  useEffect(() => {
    if (tenantKey <= 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const contractPromise = lockedContract
      ? Promise.resolve([lockedContract] as PropertyContract[])
      : listPropertyContracts({ tenantId: tenantKey, activeOnly: true });

    Promise.all([contractPromise, listPropertySeasons({ tenantId: tenantKey, activeOnly: true })])
      .then(([contractRows, seasonRows]) => {
        if (cancelled) return;
        setContracts(contractRows);
        setSeasons(seasonRows);
        if (lockedContract) {
          setValue("propertyContractId", lockedContract.propertyContractKey, { shouldValidate: true });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : "Failed to load lookups");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantKey, lockedContract, setValue]);

  useEffect(() => {
    if (!propertySeasonId || propertySeasonId <= 0) return;
    if (eligibleSeasons.some((s) => s.propertySeasonKey === propertySeasonId)) return;
    setValue("propertySeasonId", 0, { shouldValidate: false });
  }, [eligibleSeasons, propertySeasonId, setValue]);

  async function onSubmit(values: FormValues) {
    if (!actorKey || tenantKey <= 0 || companyKey <= 0) {
      toast.error("Missing session context — sign in again.");
      return;
    }
    const contractId = lockedContract?.propertyContractKey ?? values.propertyContractId;
    const payload = {
      tenantId: tenantKey,
      companyId: companyKey,
      propertyContractId: contractId,
      propertySeasonId: values.propertySeasonId,
      fromDate: values.fromDate,
      toDate: values.toDate,
      isActive: values.isActive,
    };
    try {
      if (isEdit && entry) {
        await updatePropertyContractSeasonPeriod(entry.propertyContractSeasonPeriodKey, {
          ...payload,
          modifiedBy: actorKey,
        });
        toast.success("Season period updated");
      } else {
        await createPropertyContractSeasonPeriod({ ...payload, createdBy: actorKey });
        toast.success("Season period created");
      }
      router.push(returnHref);
    } catch (error) {
      toast.error(
        error instanceof PropertyContractSeasonPeriodsApiError
          ? error.message
          : "Could not save season period"
      );
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading form…</p>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-6">
      <Section
        icon={CalendarDays}
        title="Contract season period"
        description={
          lockedContract
            ? `Date range for ${lockedContract.contractName} on ${lockedContract.propertyName ?? "this property"}.`
            : "Map a property season to a date range on a supplier contract."
        }
      >
        {!contractLocked && (
          <div className="space-y-2">
            <Label required>Contract</Label>
            <Controller
              name="propertyContractId"
              control={control}
              render={({ field }) => (
                <SearchableCombobox
                  value={field.value > 0 ? field.value : null}
                  onChange={(v) => {
                    field.onChange(v);
                    setValue("propertySeasonId", 0, { shouldValidate: false });
                  }}
                  options={contracts.map((c) => ({
                    value: c.propertyContractKey,
                    label: c.contractName,
                    sublabel: `${c.contractNumber} · ${c.propertyName ?? `Property ${c.propertyId}`}`,
                  }))}
                  placeholder="Search contract…"
                  emptyLabel="No contracts found."
                  disabled={isEdit}
                  ariaInvalid={!!errors.propertyContractId}
                />
              )}
            />
            {errors.propertyContractId && (
              <p className="text-sm text-destructive">{errors.propertyContractId.message}</p>
            )}
          </div>
        )}

        {contractLocked && lockedContract && (
          <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
            <p className="font-medium text-foreground">{lockedContract.contractName}</p>
            <p className="text-muted-foreground">
              {lockedContract.contractNumber}
              {lockedContract.propertyName ? ` · ${lockedContract.propertyName}` : ""}
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label required>Season</Label>
          <Controller
            name="propertySeasonId"
            control={control}
            render={({ field }) => (
              <SearchableCombobox
                value={field.value > 0 ? field.value : null}
                onChange={(v) => field.onChange(v)}
                options={eligibleSeasons.map((s) => ({
                  value: s.propertySeasonKey,
                  label: s.seasonName,
                  sublabel: s.seasonCode,
                }))}
                placeholder={propertyContractId > 0 || contractLocked ? "Search season…" : "Select a contract first"}
                emptyLabel={
                  propertyContractId > 0 || contractLocked
                    ? "No seasons for this property — create Property Seasons first."
                    : "Select a contract first."
                }
                disabled={!contractLocked && propertyContractId <= 0}
                ariaInvalid={!!errors.propertySeasonId}
              />
            )}
          />
          {errors.propertySeasonId && (
            <p className="text-sm text-destructive">{errors.propertySeasonId.message}</p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fromDate" required>
              From date
            </Label>
            <Input id="fromDate" type="date" aria-invalid={!!errors.fromDate} {...register("fromDate")} />
            {errors.fromDate && <p className="text-sm text-destructive">{errors.fromDate.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="toDate" required>
              To date
            </Label>
            <Input id="toDate" type="date" aria-invalid={!!errors.toDate} {...register("toDate")} />
            {errors.toDate && <p className="text-sm text-destructive">{errors.toDate.message}</p>}
          </div>
        </div>

        <div className="space-y-2 sm:max-w-xs">
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
          {isEdit ? "Save changes" : "Create period"}
        </Button>
        <Button type="button" variant="outline" nativeButton={false} render={<Link href={returnHref} />}>
          <X className="h-4 w-4" />
          Cancel
        </Button>
      </div>
    </form>
  );
}
