"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Tags, Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Section } from "@/components/masters/PropertyFormSection";
import { SearchableCombobox } from "@/components/shared/SearchableCombobox";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { resolveSessionCompanyKey } from "@/lib/session-company";
import { listRatePlanTypes } from "@/lib/services/rate-plan-types.service";
import { listMealPlans } from "@/lib/services/meal-plans.service";
import { listRateBasis } from "@/lib/services/rate-basis.service";
import { createPropertyContractRatePlan } from "@/lib/services/property-contract-rate-plans.service";
import type { MealPlan, PropertyContract, RateBasis, RatePlanType } from "@/types";

let tempIdSeq = 0;
function nextTempId() {
  tempIdSeq += 1;
  return `pending-rate-plan-${tempIdSeq}`;
}

interface RatePlanRow {
  tempId: string;
  ratePlanCode: string;
  ratePlanName: string;
  ratePlanTypeId: number;
  mealPlanId: number;
  rateBasisId: number;
  displayOrder: number;
}

function emptyRow(): RatePlanRow {
  return {
    tempId: nextTempId(),
    ratePlanCode: "",
    ratePlanName: "",
    ratePlanTypeId: 0,
    mealPlanId: 0,
    rateBasisId: 0,
    displayOrder: 0,
  };
}

function rowError(row: RatePlanRow): string | null {
  const touched =
    row.ratePlanCode.trim() ||
    row.ratePlanName.trim() ||
    row.ratePlanTypeId > 0 ||
    row.mealPlanId > 0 ||
    row.rateBasisId > 0;
  if (!touched) return null;
  if (!row.ratePlanCode.trim()) return "Rate plan code is required";
  if (!row.ratePlanName.trim()) return "Rate plan name is required";
  if (!row.ratePlanTypeId) return "Rate plan type is required";
  if (!row.mealPlanId) return "Meal plan is required";
  if (!row.rateBasisId) return "Rate basis is required";
  return null;
}

/** Add multiple contract rate plans in one go — a row per plan, saved together. */
export function PropertyContractRatePlanBatchAddForm({ contract }: { contract: PropertyContract }) {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();
  const sessionUser = useSessionStore((s) => s.user);
  const activeTenant = useTenantStore((s) => s.tenant);
  const tenantKey = sessionUser?.tenantKey ?? activeTenant.tenantKey ?? 0;
  const companyKey = resolveSessionCompanyKey(sessionUser) ?? 0;
  const actorKey = sessionUser?.userKey ?? 0;

  const returnHref = `/${role}/extranet/contracts/${contract.propertyContractKey}?tab=rate-plans`;

  const [ratePlanTypes, setRatePlanTypes] = useState<RatePlanType[]>([]);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [rateBasisList, setRateBasisList] = useState<RateBasis[]>([]);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<RatePlanRow[]>([emptyRow()]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const lookupsReady = ratePlanTypes.length > 0 && mealPlans.length > 0 && rateBasisList.length > 0;

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
        if (!cancelled) toast.error("Failed to load rate plan lookups");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantKey, companyKey]);

  function updateRow(tempId: string, patch: Partial<RatePlanRow>) {
    setRows((prev) => prev.map((r) => (r.tempId === tempId ? { ...r, ...patch } : r)));
  }

  function removeRow(tempId: string) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.tempId !== tempId) : prev));
  }

  async function handleSubmit() {
    setSubmitError(null);
    if (rows.some((r) => rowError(r))) {
      setSubmitError("Fix the highlighted rows before saving.");
      return;
    }
    const valid = rows.filter(
      (r) =>
        r.ratePlanCode.trim() &&
        r.ratePlanName.trim() &&
        r.ratePlanTypeId > 0 &&
        r.mealPlanId > 0 &&
        r.rateBasisId > 0
    );
    if (valid.length === 0) {
      setSubmitError("Add at least one rate plan with code, name, and lookups.");
      return;
    }
    if (!actorKey || tenantKey <= 0 || companyKey <= 0) {
      toast.error("Missing session context — sign in again.");
      return;
    }
    setSubmitting(true);
    let failures = 0;
    for (const row of valid) {
      try {
        await createPropertyContractRatePlan({
          tenantId: tenantKey,
          companyId: companyKey,
          propertyContractId: contract.propertyContractKey,
          ratePlanCode: row.ratePlanCode.trim(),
          ratePlanName: row.ratePlanName.trim(),
          ratePlanTypeId: row.ratePlanTypeId,
          mealPlanId: row.mealPlanId,
          rateBasisId: row.rateBasisId,
          displayOrder: row.displayOrder,
          createdBy: actorKey,
        });
      } catch {
        failures += 1;
      }
    }
    setSubmitting(false);
    if (failures === 0) {
      toast.success(`${valid.length} rate plan${valid.length === 1 ? "" : "s"} added`);
      router.push(returnHref);
    } else {
      toast.error(`${failures} of ${valid.length} rows could not be saved`);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading form…</p>;
  }

  return (
    <div className="max-w-3xl space-y-6">
      <Section
        icon={Tags}
        title="Contract rate plans"
        description={`Add one or more rate plans for ${contract.contractName} on ${contract.propertyName ?? "this property"}.`}
      >
        <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
          <p className="font-medium text-foreground">{contract.contractName}</p>
          <p className="text-muted-foreground">
            {contract.contractNumber}
            {contract.propertyName ? ` · ${contract.propertyName}` : ""}
          </p>
        </div>

        {!lookupsReady ? (
          <p className="text-sm text-muted-foreground">
            Rate plan type, meal plan, and rate basis masters are required — configure them under Masters first.
          </p>
        ) : (
          <div className="space-y-4">
            {rows.map((row, index) => {
              const error = rowError(row);
              return (
                <div key={row.tempId} className="rounded-lg border border-border p-4">
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">Rate plan {index + 1}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeRow(row.tempId)}
                      disabled={rows.length === 1}
                      aria-label="Remove row"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label required>Rate plan code</Label>
                        <Input
                          placeholder="FIT-BB"
                          value={row.ratePlanCode}
                          onChange={(e) => updateRow(row.tempId, { ratePlanCode: e.target.value })}
                          aria-invalid={!!error}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label required>Rate plan name</Label>
                        <Input
                          placeholder="FIT Bed & Breakfast"
                          value={row.ratePlanName}
                          onChange={(e) => updateRow(row.tempId, { ratePlanName: e.target.value })}
                          aria-invalid={!!error}
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <div className="space-y-2">
                        <Label required>Rate plan type</Label>
                        <SearchableCombobox
                          value={row.ratePlanTypeId > 0 ? row.ratePlanTypeId : null}
                          onChange={(v) => updateRow(row.tempId, { ratePlanTypeId: v ?? 0 })}
                          options={ratePlanTypes.map((t) => ({
                            value: t.ratePlanTypeId,
                            label: t.ratePlanTypeName,
                            sublabel: t.ratePlanTypeCode,
                          }))}
                          placeholder="Search rate plan type…"
                          emptyLabel="No types found."
                          ariaInvalid={!!error}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label required>Meal plan</Label>
                        <SearchableCombobox
                          value={row.mealPlanId > 0 ? row.mealPlanId : null}
                          onChange={(v) => updateRow(row.tempId, { mealPlanId: v ?? 0 })}
                          options={mealPlans.map((m) => ({
                            value: m.mealPlanId,
                            label: m.mealPlanName,
                            sublabel: m.mealPlanCode,
                          }))}
                          placeholder="Search meal plan…"
                          emptyLabel="No meal plans found."
                          ariaInvalid={!!error}
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                        <Label required>Rate basis</Label>
                        <SearchableCombobox
                          value={row.rateBasisId > 0 ? row.rateBasisId : null}
                          onChange={(v) => updateRow(row.tempId, { rateBasisId: v ?? 0 })}
                          options={rateBasisList.map((b) => ({
                            value: b.rateBasisId,
                            label: b.rateBasisName,
                            sublabel: b.rateBasisCode,
                          }))}
                          placeholder="Search rate basis…"
                          emptyLabel="No rate basis found."
                          ariaInvalid={!!error}
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:max-w-[180px]">
                      <div className="space-y-2">
                        <Label>Display order</Label>
                        <Input
                          type="number"
                          min={0}
                          value={row.displayOrder}
                          onChange={(e) =>
                            updateRow(row.tempId, { displayOrder: Number(e.target.value) || 0 })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
                </div>
              );
            })}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRows((prev) => [...prev, emptyRow()])}
            >
              <Plus className="h-3.5 w-3.5" />
              Add another row
            </Button>
          </div>
        )}

        {submitError && <p className="text-sm text-destructive">{submitError}</p>}
      </Section>

      <div className="flex items-center gap-2">
        <Button type="button" disabled={submitting || !lookupsReady} onClick={() => void handleSubmit()}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save {rows.length > 1 ? `${rows.length} rate plans` : "rate plan"}
        </Button>
        <Button type="button" variant="outline" nativeButton={false} render={<Link href={returnHref} />}>
          <X className="h-4 w-4" />
          Cancel
        </Button>
      </div>
    </div>
  );
}
