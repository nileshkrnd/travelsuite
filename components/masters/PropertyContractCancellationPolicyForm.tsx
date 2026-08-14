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
import { cancellationPolicyTypeNeedsPenaltyValue } from "@/lib/constants/cancellation-policy-types";
import { listPropertyRooms } from "@/lib/services/property-rooms.service";
import { listPropertyContractRatePlans } from "@/lib/services/property-contract-rate-plans.service";
import {
  createPropertyContractCancellationPolicy,
  updatePropertyContractCancellationPolicy,
  ensureDefaultCancellationPolicyTypes,
  listCancellationPolicyTypes,
  PropertyContractCancellationPolicyApiError,
} from "@/lib/services/property-contract-cancellation-policies.service";
import type {
  CancellationPolicyType,
  PropertyContract,
  PropertyContractCancellationPolicy,
  PropertyContractRatePlan,
  PropertyRoom,
} from "@/types";

const ruleSchema = z.object({
  fromDaysBefore: z.number().int().min(0),
  toDaysBefore: z.number().int().min(0).nullable(),
  cancellationPolicyTypeId: z.number().int().positive("Choose a penalty type"),
  penaltyValue: z.number().min(0),
  isActive: z.boolean(),
});

const schema = z.object({
  propertyContractId: z.number().int().positive(),
  policyCode: z.string().trim().min(1).max(50),
  policyName: z.string().trim().min(1).max(150),
  propertyRoomId: z.number().int().positive().nullable(),
  propertyContractRatePlanId: z.number().int().positive().nullable(),
  isActive: z.boolean(),
  rules: z.array(ruleSchema),
});

type FormValues = z.infer<typeof schema>;

function defaultValues(contract: PropertyContract): FormValues {
  return {
    propertyContractId: contract.propertyContractKey,
    policyCode: "CXL-01",
    policyName: "Standard Cancellation",
    propertyRoomId: null,
    propertyContractRatePlanId: null,
    isActive: true,
    rules: [],
  };
}

function cancellationPolicyTypeDisplayLabel(
  types: CancellationPolicyType[],
  value: string | null,
  placeholder: string
): string {
  if (!value) return placeholder;
  const match = types.find((t) => String(t.cancellationPolicyTypeKey) === value);
  return match?.cancellationPolicyTypeName ?? placeholder;
}

function valuesFromEntry(entry: PropertyContractCancellationPolicy): FormValues {
  return {
    propertyContractId: entry.propertyContractId,
    policyCode: entry.policyCode,
    policyName: entry.policyName,
    propertyRoomId: entry.propertyRoomId,
    propertyContractRatePlanId: entry.propertyContractRatePlanId,
    isActive: entry.isActive,
    rules: entry.rules.map((r) => ({
      fromDaysBefore: r.fromDaysBefore,
      toDaysBefore: r.toDaysBefore,
      cancellationPolicyTypeId: r.cancellationPolicyTypeId,
      penaltyValue: r.penaltyValue,
      isActive: r.isActive,
    })),
  };
}

export function PropertyContractCancellationPolicyForm({
  lockedContract,
  entry,
}: {
  lockedContract: PropertyContract;
  entry?: PropertyContractCancellationPolicy;
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

  const returnHref = `/${role}/extranet/contracts/${lockedContract.propertyContractKey}?tab=cancellation-policies`;

  const [rooms, setRooms] = useState<PropertyRoom[]>([]);
  const [ratePlans, setRatePlans] = useState<PropertyContractRatePlan[]>([]);
  const [policyTypes, setPolicyTypes] = useState<CancellationPolicyType[]>([]);
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

  const rulesArray = useFieldArray({ control, name: "rules" });
  const watchedRules = watch("rules");

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
      ensureDefaultCancellationPolicyTypes({
        tenantId: tenantKey,
        companyId: companyKey,
        createdBy: actorKey,
      }).catch(async () =>
        listCancellationPolicyTypes({
          tenantId: tenantKey,
          companyId: companyKey,
          activeOnly: true,
        })
      ),
    ])
      .then(([roomRows, planRows, typeRows]) => {
        if (!cancelled) {
          setRooms(roomRows);
          setRatePlans(planRows);
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
  }, [tenantKey, companyKey, actorKey, lockedContract.propertyId, lockedContract.propertyContractKey]);

  function policyTypeCode(typeId: number): string {
    return (
      policyTypes
        .find((t) => t.cancellationPolicyTypeKey === typeId)
        ?.cancellationPolicyTypeCode.toUpperCase() ?? ""
    );
  }

  async function onSubmit(values: FormValues) {
    if (tenantKey <= 0 || companyKey <= 0 || !actorKey) {
      toast.error("Missing session context — sign in again.");
      return;
    }

    for (const rule of values.rules) {
      const code = policyTypeCode(rule.cancellationPolicyTypeId);
      if (cancellationPolicyTypeNeedsPenaltyValue(code) && rule.penaltyValue <= 0) {
        toast.error("Nights and Percentage rules require a penalty value greater than zero.");
        return;
      }
      if (
        rule.toDaysBefore != null &&
        rule.toDaysBefore >= 0 &&
        rule.fromDaysBefore < rule.toDaysBefore
      ) {
        toast.error("From days before must be greater than or equal to to days before.");
        return;
      }
    }

    const payload = {
      tenantId: tenantKey,
      companyId: companyKey,
      propertyContractId: values.propertyContractId,
      policyCode: values.policyCode,
      policyName: values.policyName,
      propertyRoomId:
        values.propertyRoomId && values.propertyRoomId > 0 ? values.propertyRoomId : null,
      propertyContractRatePlanId:
        values.propertyContractRatePlanId && values.propertyContractRatePlanId > 0
          ? values.propertyContractRatePlanId
          : null,
      isActive: values.isActive,
      rules: values.rules.map((r) => ({
        fromDaysBefore: r.fromDaysBefore,
        toDaysBefore: r.toDaysBefore,
        cancellationPolicyTypeId: r.cancellationPolicyTypeId,
        penaltyValue: cancellationPolicyTypeNeedsPenaltyValue(
          policyTypeCode(r.cancellationPolicyTypeId)
        )
          ? r.penaltyValue
          : 0,
        isActive: r.isActive,
      })),
    };

    setSaving(true);
    try {
      if (entry) {
        await updatePropertyContractCancellationPolicy(entry.propertyContractCancellationPolicyKey, {
          ...payload,
          modifiedBy: actorKey,
        });
        toast.success("Cancellation policy updated");
      } else {
        await createPropertyContractCancellationPolicy({ ...payload, createdBy: actorKey });
        toast.success("Cancellation policy created");
      }
      router.push(returnHref);
    } catch (error) {
      toast.error(
        error instanceof PropertyContractCancellationPolicyApiError
          ? error.message
          : "Could not save cancellation policy"
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="policyCode">Policy code</Label>
              <Input id="policyCode" {...register("policyCode")} />
              {errors.policyCode && (
                <p className="text-xs text-destructive">{errors.policyCode.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="policyName">Policy name</Label>
              <Input id="policyName" {...register("policyName")} />
              {errors.policyName && (
                <p className="text-xs text-destructive">{errors.policyName.message}</p>
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
            <h3 className="text-sm font-medium">Cancellation windows</h3>
            <p className="text-xs text-muted-foreground">
              Days before arrival — e.g. 7–0 days = within one week. Leave &quot;To days&quot; empty for open-ended.
            </p>
          </div>

          {rulesArray.fields.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rules — add at least one window below.</p>
          ) : (
            rulesArray.fields.map((field, index) => {
              const typeId = watchedRules[index]?.cancellationPolicyTypeId ?? 0;
              const needsPenalty = cancellationPolicyTypeNeedsPenaltyValue(policyTypeCode(typeId));

              return (
                <div
                  key={field.id}
                  className="grid gap-3 rounded-lg border bg-muted/20 p-3 sm:grid-cols-2 lg:grid-cols-6"
                >
                  <div className="space-y-1">
                    <Label className="text-xs">From days</Label>
                    <Input
                      type="number"
                      min={0}
                      {...register(`rules.${index}.fromDaysBefore`, { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">To days (optional)</Label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="Open"
                      {...register(`rules.${index}.toDaysBefore`, {
                        valueAsNumber: true,
                        setValueAs: (v) => (v === "" || Number.isNaN(v) ? null : Number(v)),
                      })}
                    />
                  </div>
                  <div className="space-y-1 lg:col-span-2">
                    <Label className="text-xs">Penalty type</Label>
                    <Controller
                      control={control}
                      name={`rules.${index}.cancellationPolicyTypeId`}
                      render={({ field: f }) => (
                        <Select
                          value={f.value > 0 ? String(f.value) : ""}
                          onValueChange={(v) => {
                            const id = Number(v);
                            f.onChange(id);
                            if (!cancellationPolicyTypeNeedsPenaltyValue(policyTypeCode(id))) {
                              setValue(`rules.${index}.penaltyValue`, 0);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type">
                              {(value: string | null) =>
                                cancellationPolicyTypeDisplayLabel(policyTypes, value, "Select type")
                              }
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {policyTypes.map((t) => (
                              <SelectItem
                                key={t.cancellationPolicyTypeKey}
                                value={String(t.cancellationPolicyTypeKey)}
                              >
                                {t.cancellationPolicyTypeName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  {needsPenalty ? (
                    <div className="space-y-1">
                      <Label className="text-xs">Penalty value</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="Nights or %"
                        {...register(`rules.${index}.penaltyValue`, { valueAsNumber: true })}
                      />
                    </div>
                  ) : (
                    <div className="hidden lg:block" />
                  )}
                  <div className="flex items-end sm:col-span-2 lg:col-span-6">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => rulesArray.remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove rule
                    </Button>
                  </div>
                </div>
              );
            })
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              rulesArray.append({
                fromDaysBefore: 7,
                toDaysBefore: 0,
                cancellationPolicyTypeId: policyTypes[0]?.cancellationPolicyTypeKey ?? 0,
                penaltyValue: 0,
                isActive: true,
              })
            }
            disabled={policyTypes.length === 0}
          >
            <Plus className="h-4 w-4" />
            Add rule
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {entry ? "Save changes" : "Create cancellation policy"}
        </Button>
        <Button variant="outline" nativeButton={false} render={<Link href={returnHref} />}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
