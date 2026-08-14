"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Boxes, Loader2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Section } from "@/components/masters/PropertyFormSection";
import { SearchableCombobox } from "@/components/shared/SearchableCombobox";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { resolveSessionCompanyKey } from "@/lib/session-company";
import { listPropertyContractSeasonPeriods } from "@/lib/services/property-contract-season-periods.service";
import { listPropertyRooms } from "@/lib/services/property-rooms.service";
import { listInventoryTypes } from "@/lib/services/property-contract-inventories.service";
import {
  createPropertyContractInventory,
  updatePropertyContractInventory,
  PropertyContractInventoryApiError,
} from "@/lib/services/property-contract-inventories.service";
import type {
  InventoryType,
  PropertyContract,
  PropertyContractInventory,
  PropertyContractSeasonPeriod,
  PropertyRoom,
} from "@/types";

const schema = z.object({
  propertyContractId: z.number().int().positive("Contract is required"),
  propertyContractSeasonPeriodId: z.number().int().positive("Season period is required"),
  propertyRoomId: z.number().int().positive("Room type is required"),
  inventoryTypeId: z.number().int().positive("Inventory type is required"),
  allotmentQty: z.number().int().min(0, "Allotment cannot be negative"),
  releaseDays: z.number().int().min(0, "Release days cannot be negative"),
  isStopSell: z.boolean(),
  isClosed: z.boolean(),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

function seasonPeriodLabel(p: PropertyContractSeasonPeriod) {
  const season = p.seasonName ?? p.seasonCode ?? "Season";
  return `${season} (${p.fromDate} → ${p.toDate})`;
}

function defaultValues(contract: PropertyContract): FormValues {
  return {
    propertyContractId: contract.propertyContractKey,
    propertyContractSeasonPeriodId: 0,
    propertyRoomId: 0,
    inventoryTypeId: 0,
    allotmentQty: 0,
    releaseDays: 0,
    isStopSell: false,
    isClosed: false,
    isActive: true,
  };
}

function valuesFromEntry(entry: PropertyContractInventory): FormValues {
  return {
    propertyContractId: entry.propertyContractId,
    propertyContractSeasonPeriodId: entry.propertyContractSeasonPeriodId,
    propertyRoomId: entry.propertyRoomId,
    inventoryTypeId: entry.inventoryTypeId,
    allotmentQty: entry.allotmentQty,
    releaseDays: entry.releaseDays,
    isStopSell: entry.isStopSell,
    isClosed: entry.isClosed,
    isActive: entry.isActive,
  };
}

/** Create or edit contract inventory (season + room type + allotment rules). */
export function PropertyContractInventoryForm({
  lockedContract,
  entry,
}: {
  lockedContract: PropertyContract;
  entry?: PropertyContractInventory;
}) {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();
  const sessionUser = useSessionStore((s) => s.user);
  const activeTenant = useTenantStore((s) => s.tenant);
  const tenantKey = sessionUser?.tenantKey ?? activeTenant.tenantKey ?? 0;
  const companyKey = resolveSessionCompanyKey(sessionUser) ?? 0;
  const actorKey = sessionUser?.userKey ?? 0;

  const returnHref = `/${role}/extranet/contracts/${lockedContract.propertyContractKey}?tab=inventory`;

  const [loading, setLoading] = useState(true);
  const [seasonPeriods, setSeasonPeriods] = useState<PropertyContractSeasonPeriod[]>([]);
  const [rooms, setRooms] = useState<PropertyRoom[]>([]);
  const [inventoryTypes, setInventoryTypes] = useState<InventoryType[]>([]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: entry ? valuesFromEntry(entry) : defaultValues(lockedContract),
  });

  const inventoryTypeId = watch("inventoryTypeId");
  const selectedInventoryType = useMemo(
    () => inventoryTypes.find((t) => t.inventoryTypeKey === inventoryTypeId),
    [inventoryTypes, inventoryTypeId]
  );
  const isAllotment = selectedInventoryType?.inventoryTypeCode === "ALLOTMENT";

  useEffect(() => {
    if (tenantKey <= 0 || companyKey <= 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      listPropertyContractSeasonPeriods({ propertyContractId: lockedContract.propertyContractKey }),
      listPropertyRooms({
        tenantId: tenantKey,
        propertyId: lockedContract.propertyId,
        activeOnly: true,
      }),
      listInventoryTypes({ activeOnly: true }),
    ])
      .then(([periods, roomRows, types]) => {
        if (cancelled) return;
        setSeasonPeriods(periods);
        setRooms(roomRows);
        setInventoryTypes(types);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load inventory form lookups");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantKey, companyKey, lockedContract.propertyContractKey, lockedContract.propertyId]);

  async function onSubmit(values: FormValues) {
    if (tenantKey <= 0 || companyKey <= 0 || !actorKey) {
      toast.error("Missing tenant, company, or user context.");
      return;
    }
    if (isAllotment && values.allotmentQty <= 0) {
      toast.error("Allotment quantity is required for allotment inventory.");
      return;
    }

    try {
      const payload = {
        tenantId: tenantKey,
        companyId: companyKey,
        propertyContractId: values.propertyContractId,
        propertyContractSeasonPeriodId: values.propertyContractSeasonPeriodId,
        propertyRoomId: values.propertyRoomId,
        inventoryTypeId: values.inventoryTypeId,
        allotmentQty: values.allotmentQty,
        releaseDays: values.releaseDays,
        isStopSell: values.isStopSell,
        isClosed: values.isClosed,
        isActive: values.isActive,
      };

      if (entry) {
        await updatePropertyContractInventory(entry.propertyContractInventoryKey, {
          ...payload,
          modifiedBy: actorKey,
        });
        toast.success("Inventory updated");
      } else {
        await createPropertyContractInventory({ ...payload, createdBy: actorKey });
        toast.success("Inventory created");
      }
      router.push(returnHref);
    } catch (error) {
      toast.error(
        error instanceof PropertyContractInventoryApiError ? error.message : "Could not save inventory"
      );
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading form…
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Section title="Inventory scope" description="Season period and room type for this contract.">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>Season period</Label>
            <Controller
              control={control}
              name="propertyContractSeasonPeriodId"
              render={({ field }) => (
                <SearchableCombobox
                  value={field.value > 0 ? String(field.value) : ""}
                  onValueChange={(v) => field.onChange(Number(v))}
                  options={seasonPeriods.map((p) => ({
                    value: String(p.propertyContractSeasonPeriodKey),
                    label: seasonPeriodLabel(p),
                  }))}
                  placeholder="Select season period"
                  disabled={!!entry}
                />
              )}
            />
            {errors.propertyContractSeasonPeriodId && (
              <p className="text-xs text-destructive">{errors.propertyContractSeasonPeriodId.message}</p>
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Room type</Label>
            <Controller
              control={control}
              name="propertyRoomId"
              render={({ field }) => (
                <SearchableCombobox
                  value={field.value > 0 ? String(field.value) : ""}
                  onValueChange={(v) => field.onChange(Number(v))}
                  options={rooms.map((r) => ({
                    value: String(r.propertyRoomKey),
                    label: `${r.roomName} (${r.roomCode})`,
                  }))}
                  placeholder="Select room type"
                  disabled={!!entry}
                />
              )}
            />
            {errors.propertyRoomId && (
              <p className="text-xs text-destructive">{errors.propertyRoomId.message}</p>
            )}
          </div>
        </div>
      </Section>

      <Section title="Inventory rules" description="Allotment quantity, release policy, and sale flags.">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>Inventory type</Label>
            <Controller
              control={control}
              name="inventoryTypeId"
              render={({ field }) => (
                <SearchableCombobox
                  value={field.value > 0 ? String(field.value) : ""}
                  onValueChange={(v) => field.onChange(Number(v))}
                  options={inventoryTypes.map((t) => ({
                    value: String(t.inventoryTypeKey),
                    label: t.inventoryTypeName,
                  }))}
                  placeholder="Select inventory type"
                />
              )}
            />
            {errors.inventoryTypeId && (
              <p className="text-xs text-destructive">{errors.inventoryTypeId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="allotmentQty">Allotment qty{isAllotment ? " *" : ""}</Label>
            <Input id="allotmentQty" type="number" min={0} {...register("allotmentQty", { valueAsNumber: true })} />
            {errors.allotmentQty && (
              <p className="text-xs text-destructive">{errors.allotmentQty.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="releaseDays">Release days</Label>
            <Input id="releaseDays" type="number" min={0} {...register("releaseDays", { valueAsNumber: true })} />
            <p className="text-xs text-muted-foreground">Days before arrival to release unused allotment rooms.</p>
            {errors.releaseDays && (
              <p className="text-xs text-destructive">{errors.releaseDays.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-3 md:col-span-2">
            <Controller
              control={control}
              name="isStopSell"
              render={({ field }) => (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />
                  Stop sell
                </label>
              )}
            />
            <Controller
              control={control}
              name="isClosed"
              render={({ field }) => (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />
                  Closed for sale
                </label>
              )}
            />
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />
                  Active
                </label>
              )}
            />
          </div>
        </div>
      </Section>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save inventory
        </Button>
        <Button type="button" variant="outline" nativeButton={false} render={<Link href={returnHref} />}>
          <X className="h-4 w-4" />
          Cancel
        </Button>
      </div>
    </form>
  );
}
