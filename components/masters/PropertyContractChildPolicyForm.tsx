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
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableCombobox } from "@/components/shared/SearchableCombobox";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { resolveSessionCompanyKey } from "@/lib/session-company";
import { childPolicyTypeNeedsRateValue } from "@/lib/constants/child-policy-types";
import { listPropertyRooms } from "@/lib/services/property-rooms.service";
import {
  createPropertyContractChildPolicy,
  updatePropertyContractChildPolicy,
  ensureDefaultChildPolicyTypes,
  listChildPolicyTypes,
  PropertyContractChildPolicyApiError,
} from "@/lib/services/property-contract-child-policies.service";
import type {
  ChildPolicyType,
  PropertyContract,
  PropertyContractChildPolicy,
  PropertyRoom,
} from "@/types";

const ageBandSchema = z.object({
  fromAge: z.number().min(0),
  toAge: z.number().min(0),
  childPolicyTypeId: z.number().int().positive("Choose a policy type"),
  rateValue: z.number().min(0).nullable(),
  isActive: z.boolean(),
});

const schema = z.object({
  propertyContractId: z.number().int().positive(),
  propertyRoomId: z.number().int().positive().nullable(),
  maxChild: z.number().int().min(0, "Max children cannot be negative"),
  childCountsInOccupancy: z.boolean(),
  isActive: z.boolean(),
  ageBands: z.array(ageBandSchema),
});

type FormValues = z.infer<typeof schema>;

function defaultValues(contract: PropertyContract): FormValues {
  return {
    propertyContractId: contract.propertyContractKey,
    propertyRoomId: null,
    maxChild: 0,
    childCountsInOccupancy: false,
    isActive: true,
    ageBands: [],
  };
}

function childPolicyTypeDisplayLabel(
  types: ChildPolicyType[],
  value: string | null,
  placeholder: string
): string {
  if (!value) return placeholder;
  const match = types.find((t) => String(t.childPolicyTypeKey) === value);
  return match?.childPolicyTypeName ?? placeholder;
}

function valuesFromEntry(entry: PropertyContractChildPolicy): FormValues {
  return {
    propertyContractId: entry.propertyContractId,
    propertyRoomId: entry.propertyRoomId,
    maxChild: entry.maxChild,
    childCountsInOccupancy: entry.childCountsInOccupancy,
    isActive: entry.isActive,
    ageBands: entry.ageBands.map((a) => ({
      fromAge: a.fromAge,
      toAge: a.toAge,
      childPolicyTypeId: a.childPolicyTypeId,
      rateValue: a.rateValue,
      isActive: a.isActive,
    })),
  };
}

export function PropertyContractChildPolicyForm({
  lockedContract,
  entry,
}: {
  lockedContract: PropertyContract;
  entry?: PropertyContractChildPolicy;
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

  const returnHref = `/${role}/extranet/contracts/${lockedContract.propertyContractKey}?tab=child-policies`;

  const [rooms, setRooms] = useState<PropertyRoom[]>([]);
  const [policyTypes, setPolicyTypes] = useState<ChildPolicyType[]>([]);
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

  const ageArray = useFieldArray({ control, name: "ageBands" });
  const watchedAgeBands = watch("ageBands");

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
      ensureDefaultChildPolicyTypes({
        tenantId: tenantKey,
        companyId: companyKey,
        createdBy: actorKey,
      }).catch(async () => {
        return listChildPolicyTypes({
          tenantId: tenantKey,
          companyId: companyKey,
          activeOnly: true,
        });
      }),
    ])
      .then(([roomRows, typeRows]) => {
        if (!cancelled) {
          setRooms(roomRows);
          setPolicyTypes(typeRows);
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
  }, [tenantKey, companyKey, actorKey, lockedContract.propertyId]);

  function policyTypeCode(typeId: number): string {
    return (
      policyTypes.find((t) => t.childPolicyTypeKey === typeId)?.childPolicyTypeCode.toUpperCase() ??
      ""
    );
  }

  async function onSubmit(values: FormValues) {
    if (tenantKey <= 0 || companyKey <= 0 || !actorKey) {
      toast.error("Missing session context — sign in again.");
      return;
    }

    for (const band of values.ageBands) {
      const code = policyTypeCode(band.childPolicyTypeId);
      if (childPolicyTypeNeedsRateValue(code) && (band.rateValue == null || band.rateValue < 0)) {
        toast.error("Supplement age bands require a rate value.");
        return;
      }
      if (band.fromAge > band.toAge) {
        toast.error("Age band: from age cannot exceed to age.");
        return;
      }
    }

    const payload = {
      tenantId: tenantKey,
      companyId: companyKey,
      propertyContractId: values.propertyContractId,
      propertyRoomId: values.propertyRoomId && values.propertyRoomId > 0 ? values.propertyRoomId : null,
      maxChild: values.maxChild,
      childCountsInOccupancy: values.childCountsInOccupancy,
      isActive: values.isActive,
      ageBands: values.ageBands.map((b) => ({
        fromAge: b.fromAge,
        toAge: b.toAge,
        childPolicyTypeId: b.childPolicyTypeId,
        rateValue: childPolicyTypeNeedsRateValue(policyTypeCode(b.childPolicyTypeId))
          ? b.rateValue
          : null,
        isActive: b.isActive,
      })),
    };

    setSaving(true);
    try {
      if (entry) {
        await updatePropertyContractChildPolicy(entry.propertyContractChildPolicyKey, {
          ...payload,
          modifiedBy: actorKey,
        });
        toast.success("Child policy updated");
      } else {
        await createPropertyContractChildPolicy({ ...payload, createdBy: actorKey });
        toast.success("Child policy created");
      }
      router.push(returnHref);
    } catch (error) {
      toast.error(
        error instanceof PropertyContractChildPolicyApiError ? error.message : "Could not save child policy"
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
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-full space-y-6">
      <div className="space-y-1 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Contract</p>
        <p className="text-base font-semibold text-foreground">{lockedContract.contractName}</p>
        <p className="text-muted-foreground">
          {lockedContract.contractNumber}
          {lockedContract.propertyName ? ` · ${lockedContract.propertyName}` : ""}
        </p>
      </div>

      <div className="rounded-lg border border-border bg-muted/20 p-3">
        <div className="flex flex-nowrap items-end gap-2">
          <div className="min-w-0 flex-1 space-y-1">
            <span className="text-[10px] font-medium uppercase text-muted-foreground">Room type</span>
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
          <div className="w-32 shrink-0 space-y-1">
            <span className="text-[10px] font-medium uppercase text-muted-foreground">Max children</span>
            <Input
              type="number"
              min={0}
              className="h-9 w-full min-w-0"
              {...register("maxChild", { valueAsNumber: true })}
            />
            {errors.maxChild && <p className="text-xs text-destructive">{errors.maxChild.message}</p>}
          </div>
          <div className="shrink-0 space-y-1">
            <span className="text-[10px] font-medium uppercase text-muted-foreground">Counts in occ.</span>
            <div className="flex h-9 items-center">
              <Checkbox
                checked={watch("childCountsInOccupancy")}
                onCheckedChange={(c) => setValue("childCountsInOccupancy", c === true)}
              />
            </div>
          </div>
          <div className="shrink-0 space-y-1">
            <span className="text-[10px] font-medium uppercase text-muted-foreground">Active</span>
            <div className="flex h-9 items-center">
              <Checkbox
                checked={watch("isActive")}
                onCheckedChange={(c) => setValue("isActive", c === true)}
              />
            </div>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Leave room type as &quot;All room types&quot; to apply this policy to every room on the contract.
        </p>
      </div>

      <div className="space-y-2">
        <div>
          <h3 className="text-sm font-medium">Age bands</h3>
          <p className="text-xs text-muted-foreground">
            Define how each age range is priced: free, supplement (fixed amount or percentage), adult rate, or not
            allowed.
          </p>
        </div>

        {ageArray.fields.length === 0 ? (
          <p className="text-sm text-muted-foreground">No age bands — add at least one rule below.</p>
        ) : (
          <>
            <div className="flex flex-nowrap items-center gap-2 px-1 text-[10px] font-medium uppercase text-muted-foreground">
              <span className="w-20 shrink-0">From age</span>
              <span className="w-20 shrink-0">To age</span>
              <span className="min-w-0 flex-1">Policy type *</span>
              <span className="w-28 shrink-0">Rate value</span>
              <span className="w-8 shrink-0" />
            </div>
            {ageArray.fields.map((field, index) => {
              const typeId = watchedAgeBands[index]?.childPolicyTypeId ?? 0;
              const needsRate = childPolicyTypeNeedsRateValue(policyTypeCode(typeId));

              return (
                <div key={field.id} className="rounded-lg border border-border bg-muted/20 p-2">
                  <div className="flex flex-nowrap items-center gap-2">
                    <div className="w-20 shrink-0">
                      <Input
                        type="number"
                        min={0}
                        step="0.5"
                        className="h-9 w-full min-w-0 px-2"
                        {...register(`ageBands.${index}.fromAge`, { valueAsNumber: true })}
                      />
                    </div>
                    <div className="w-20 shrink-0">
                      <Input
                        type="number"
                        min={0}
                        step="0.5"
                        className="h-9 w-full min-w-0 px-2"
                        {...register(`ageBands.${index}.toAge`, { valueAsNumber: true })}
                      />
                    </div>
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <Controller
                        control={control}
                        name={`ageBands.${index}.childPolicyTypeId`}
                        render={({ field: f }) => (
                          <Select
                            value={f.value > 0 ? String(f.value) : ""}
                            onValueChange={(v) => {
                              const id = Number(v);
                              f.onChange(id);
                              if (!childPolicyTypeNeedsRateValue(policyTypeCode(id))) {
                                setValue(`ageBands.${index}.rateValue`, null);
                              }
                            }}
                          >
                            <SelectTrigger className="h-9 w-full min-w-0 overflow-hidden">
                              <SelectValue placeholder="Select type" className="truncate">
                                {(value: string | null) =>
                                  childPolicyTypeDisplayLabel(policyTypes, value, "Select type")
                                }
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {policyTypes.map((t) => (
                                <SelectItem key={t.childPolicyTypeKey} value={String(t.childPolicyTypeKey)}>
                                  {t.childPolicyTypeName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    <div className="w-28 shrink-0">
                      {needsRate ? (
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          className="h-9 w-full min-w-0 px-2"
                          placeholder="Amount or %"
                          {...register(`ageBands.${index}.rateValue`, {
                            valueAsNumber: true,
                            setValueAs: (v) => (v === "" || Number.isNaN(v) ? null : Number(v)),
                          })}
                        />
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="w-8 shrink-0"
                      onClick={() => ageArray.remove(index)}
                      aria-label="Remove age band"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            ageArray.append({
              fromAge: 0,
              toAge: 12,
              childPolicyTypeId: policyTypes[0]?.childPolicyTypeKey ?? 0,
              rateValue: null,
              isActive: true,
            })
          }
          disabled={policyTypes.length === 0}
        >
          <Plus className="h-4 w-4" />
          Add age band
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t pt-4">
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {entry ? "Save changes" : "Create child policy"}
        </Button>
        <Button variant="outline" nativeButton={false} render={<Link href={returnHref} />}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
