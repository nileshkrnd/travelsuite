"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { KeyRound, Save, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSessionStore } from "@/lib/store/session.store";
import { useUsersStore } from "@/lib/store/users.store";
import { listTenants } from "@/lib/services/tenants.service";
import { listSubscriptionModules } from "@/lib/services/subscription-modules.service";
import {
  createSubscriptionModuleAccessBatch,
  listSubscriptionModuleAccess,
  updateSubscriptionModuleAccess,
  SubscriptionModuleAccessApiError,
} from "@/lib/services/subscription-module-access.service";
import type { SubscriptionModule, SubscriptionModuleAccess, Tenant } from "@/types";

const createSchema = z.object({
  tenantId: z.number().int().positive("Tenant is required"),
  subscriptionModuleIds: z.array(z.number().int().positive()).min(1, "Select at least one module"),
});

const editSchema = z.object({
  tenantId: z.number().int().positive("Tenant is required"),
  subscriptionModuleIds: z.array(z.number().int().positive()).length(1, "Module is required"),
});

type FormValues = z.infer<typeof createSchema>;

export function SubscriptionModuleAccessForm({
  access,
}: {
  access?: SubscriptionModuleAccess;
}) {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const isEdit = !!access;
  const listHref = `/${role}/masters/subscription-module-access`;
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;
  const [modules, setModules] = useState<SubscriptionModule[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [existingModuleIds, setExistingModuleIds] = useState<number[]>([]);

  useEffect(() => {
    void Promise.all([listSubscriptionModules(), listTenants()])
      .then(([moduleRows, tenantRows]) => {
        setModules(moduleRows);
        setTenants(tenantRows);
      })
      .catch(() => {
        setModules([]);
        setTenants([]);
      });
  }, []);

  const activeModules = modules.filter(
    (m) => m.isActive || m.subscriptionModuleId === access?.subscriptionModuleId
  );
  const activeTenants = tenants.filter(
    (t) => t.status === "active" || t.tenantKey === access?.tenantId
  );

  const modulesByProduct = useMemo(() => {
    const groups = new Map<string, SubscriptionModule[]>();
    for (const m of activeModules) {
      const key = m.subscriptionProductName?.trim() || "Other";
      const list = groups.get(key) ?? [];
      list.push(m);
      groups.set(key, list);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [activeModules]);

  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(isEdit ? editSchema : createSchema),
    defaultValues: {
      tenantId: access?.tenantId ?? 0,
      subscriptionModuleIds: access?.subscriptionModuleId ? [access.subscriptionModuleId] : [],
    },
  });

  useEffect(() => {
    if (!access) return;
    reset({
      tenantId: access.tenantId,
      subscriptionModuleIds: [access.subscriptionModuleId],
    });
  }, [access, reset]);

  const tenantId = useWatch({ control, name: "tenantId" });
  const selectedIds = useWatch({ control, name: "subscriptionModuleIds" }) ?? [];

  useEffect(() => {
    if (isEdit || !tenantId || tenantId <= 0) {
      setExistingModuleIds([]);
      return;
    }
    let cancelled = false;
    listSubscriptionModuleAccess({ tenantId })
      .then((rows) => {
        if (cancelled) return;
        const granted = rows.map((r) => r.subscriptionModuleId);
        setExistingModuleIds(granted);
        // Drop any selections that are already granted for this tenant.
        const current = getValues("subscriptionModuleIds") ?? [];
        const next = current.filter((id) => !granted.includes(id));
        if (next.length !== current.length) {
          setValue("subscriptionModuleIds", next, { shouldValidate: true });
        }
      })
      .catch(() => {
        if (!cancelled) setExistingModuleIds([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isEdit, tenantId, getValues, setValue]);

  function toggleModule(moduleId: number, checked: boolean) {
    if (isEdit) {
      setValue("subscriptionModuleIds", checked ? [moduleId] : [], {
        shouldValidate: true,
        shouldDirty: true,
      });
      return;
    }
    const current = getValues("subscriptionModuleIds") ?? [];
    const next = checked
      ? [...new Set([...current, moduleId])]
      : current.filter((id) => id !== moduleId);
    setValue("subscriptionModuleIds", next, { shouldValidate: true, shouldDirty: true });
  }

  async function onSubmit(values: FormValues) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      if (isEdit && access) {
        const moduleId = values.subscriptionModuleIds[0];
        if (!moduleId) {
          toast.error("Module is required");
          return;
        }
        await updateSubscriptionModuleAccess(access.subscriptionModuleAccessId, {
          subscriptionModuleId: moduleId,
          tenantId: values.tenantId,
          isActive: access.isActive,
          modifiedBy: userKey,
        });
        toast.success("Module access updated");
        router.push(`${listHref}/${access.subscriptionModuleAccessId}`);
      } else {
        const created = await createSubscriptionModuleAccessBatch({
          subscriptionModuleIds: values.subscriptionModuleIds,
          tenantId: values.tenantId,
          createdBy: userKey,
        });
        toast.success(
          created.length === 1
            ? "Module access granted"
            : `${created.length} module access grants created`
        );
        router.push(listHref);
      }
    } catch (error) {
      toast.error(
        error instanceof SubscriptionModuleAccessApiError ? error.message : "Could not save"
      );
    }
  }

  const selectableCount = activeModules.filter(
    (m) => isEdit || !existingModuleIds.includes(m.subscriptionModuleId)
  ).length;

  return (
    <Card>
      <CardContent className="space-y-6 pt-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold">
              {isEdit ? "Modify module access" : "Grant module access"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isEdit
                ? "Update the tenant and subscription module for this grant."
                : "Select a tenant and one or more subscription modules to grant."}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label required>Tenant</Label>
            <Controller
              name="tenantId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value > 0 ? String(field.value) : ""}
                  onValueChange={(v) => {
                    field.onChange(v ? Number(v) : 0);
                    if (!isEdit) {
                      setValue("subscriptionModuleIds", [], { shouldValidate: true });
                    }
                  }}
                >
                  <SelectTrigger className="h-10 w-full max-w-full min-w-0">
                    <SelectValue>
                      {(value: string | null) => {
                        if (!value) return "Select tenant…";
                        const t = activeTenants.find((row) => String(row.tenantKey) === value);
                        if (!t) {
                          return access?.tenantName
                            ? `${access.tenantName}${access.tenantCode ? ` (${access.tenantCode})` : ""}`
                            : "Select tenant…";
                        }
                        return `${t.branding.name}${t.slug ? ` (${t.slug})` : ""}`;
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {activeTenants.map((t) => (
                      <SelectItem key={t.tenantKey} value={String(t.tenantKey)}>
                        {t.branding.name}
                        {t.slug ? ` (${t.slug})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.tenantId && (
              <p className="text-sm text-destructive">{errors.tenantId.message}</p>
            )}
          </div>

          <div className="space-y-3 sm:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label required>Subscription modules</Label>
              {!isEdit && activeModules.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={selectableCount === 0}
                    onClick={() => {
                      const ids = activeModules
                        .filter((m) => !existingModuleIds.includes(m.subscriptionModuleId))
                        .map((m) => m.subscriptionModuleId);
                      setValue("subscriptionModuleIds", ids, { shouldValidate: true });
                    }}
                  >
                    Select all
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={selectedIds.length === 0}
                    onClick={() =>
                      setValue("subscriptionModuleIds", [], { shouldValidate: true })
                    }
                  >
                    Clear
                  </Button>
                </div>
              )}
            </div>

            {activeModules.length === 0 ? (
              <p className="text-sm text-muted-foreground">No subscription modules available.</p>
            ) : (
              <div className="max-h-80 space-y-4 overflow-y-auto rounded-lg border border-border p-3">
                {modulesByProduct.map(([productName, productModules]) => (
                  <div key={productName} className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {productName}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {productModules.map((m) => {
                        const alreadyGranted =
                          !isEdit && existingModuleIds.includes(m.subscriptionModuleId);
                        const checked = selectedIds.includes(m.subscriptionModuleId);
                        return (
                          <div
                            key={m.subscriptionModuleId}
                            role="button"
                            tabIndex={alreadyGranted ? -1 : 0}
                            onClick={() => {
                              if (alreadyGranted) return;
                              toggleModule(m.subscriptionModuleId, !checked);
                            }}
                            onKeyDown={(e) => {
                              if (alreadyGranted) return;
                              if (e.key === " " || e.key === "Enter") {
                                e.preventDefault();
                                toggleModule(m.subscriptionModuleId, !checked);
                              }
                            }}
                            className={`flex items-start gap-2.5 rounded-md border border-transparent px-2 py-2 text-sm hover:bg-muted/50 ${
                              alreadyGranted
                                ? "cursor-not-allowed opacity-60"
                                : "cursor-pointer"
                            }`}
                          >
                            <Checkbox
                              checked={checked || alreadyGranted}
                              disabled={alreadyGranted}
                              // Row handles toggle — avoid double-fire from label/button.
                              onClick={(e) => e.stopPropagation()}
                              onCheckedChange={(value) => {
                                if (alreadyGranted) return;
                                toggleModule(m.subscriptionModuleId, value === true);
                              }}
                              className="mt-0.5"
                            />
                            <span className="min-w-0 text-left">
                              <span className="font-medium">{m.subscriptionModuleName}</span>
                              {alreadyGranted ? (
                                <span className="mt-0.5 block text-xs text-muted-foreground">
                                  Already granted
                                </span>
                              ) : null}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isEdit && selectedIds.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {selectedIds.length} module{selectedIds.length === 1 ? "" : "s"} selected
              </p>
            )}
            {!isEdit && tenantId > 0 && selectableCount === 0 && (
              <p className="text-sm text-muted-foreground">
                All modules are already granted to this tenant. Choose another tenant to grant more.
              </p>
            )}
            {errors.subscriptionModuleIds && (
              <p className="text-sm text-destructive">{errors.subscriptionModuleIds.message}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                activeModules.length === 0 ||
                activeTenants.length === 0 ||
                (!isEdit && selectedIds.length === 0)
              }
            >
              <Save className="h-4 w-4" />
              {isEdit
                ? "Save changes"
                : selectedIds.length > 1
                  ? `Grant ${selectedIds.length} modules`
                  : "Grant access"}
            </Button>
            <Button type="button" variant="outline" nativeButton={false} render={<Link href={listHref} />}>
              <X className="h-4 w-4" />
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
