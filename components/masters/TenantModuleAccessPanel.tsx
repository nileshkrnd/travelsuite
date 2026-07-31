"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  CircleDashed,
  KeyRound,
  Loader2,
  Plus,
  Power,
  PowerOff,
} from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { listSubscriptionModules } from "@/lib/services/subscription-modules.service";
import {
  createSubscriptionModuleAccessBatch,
  listSubscriptionModuleAccess,
  setSubscriptionModuleAccessActive,
  SubscriptionModuleAccessApiError,
} from "@/lib/services/subscription-module-access.service";
import type { SubscriptionModule, SubscriptionModuleAccess } from "@/types";

type AccessRow = {
  module: SubscriptionModule;
  access: SubscriptionModuleAccess | null;
};

export function TenantModuleAccessPanel({
  tenantKey,
  tenantName,
  roleSlug,
  actorKey,
  canView,
  canCreate,
  canEdit,
}: {
  tenantKey: number;
  tenantName: string;
  roleSlug: string;
  actorKey: number;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
}) {
  const [modules, setModules] = useState<SubscriptionModule[]>([]);
  const [accessRows, setAccessRows] = useState<SubscriptionModuleAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [grantOpen, setGrantOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [grantSaving, setGrantSaving] = useState(false);
  const [statusTarget, setStatusTarget] = useState<SubscriptionModuleAccess | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [moduleRows, grants] = await Promise.all([
        listSubscriptionModules({ activeOnly: true }),
        listSubscriptionModuleAccess({ tenantId: tenantKey }),
      ]);
      setModules(moduleRows);
      setAccessRows(grants);
    } catch (err) {
      setError(
        err instanceof SubscriptionModuleAccessApiError ? err.message : "Failed to load module access"
      );
      setModules([]);
      setAccessRows([]);
    } finally {
      setLoading(false);
    }
  }, [tenantKey]);

  useEffect(() => {
    if (!canView || tenantKey <= 0) return;
    void refresh();
  }, [canView, tenantKey, refresh]);

  const accessByModuleId = useMemo(() => {
    const map = new Map<number, SubscriptionModuleAccess>();
    for (const row of accessRows) map.set(row.subscriptionModuleId, row);
    return map;
  }, [accessRows]);

  const grantedRows: AccessRow[] = useMemo(() => {
    const catalogGranted = modules
      .map((module) => ({
        module,
        access: accessByModuleId.get(module.subscriptionModuleId) ?? null,
      }))
      .filter((row): row is AccessRow & { access: SubscriptionModuleAccess } => row.access != null);

    // Include grants whose module is no longer in the active catalog.
    const extras = accessRows
      .filter((a) => !modules.some((m) => m.subscriptionModuleId === a.subscriptionModuleId))
      .map((access) => ({
        module: {
          subscriptionModuleId: access.subscriptionModuleId,
          subscriptionProductId: 0,
          subscriptionModuleName:
            access.subscriptionModuleName ?? `Module #${access.subscriptionModuleId}`,
          description: "",
          isActive: true,
          createdBy: access.createdBy,
          createdDtTm: access.createdDtTm,
          modifiedBy: access.modifiedBy,
          modifiedDtTm: access.modifiedDtTm,
          subscriptionProductName: access.subscriptionProductName,
        } satisfies SubscriptionModule,
        access,
      }));

    return [...catalogGranted, ...extras].sort((a, b) => {
      const pa = a.module.subscriptionProductName ?? "";
      const pb = b.module.subscriptionProductName ?? "";
      const byProduct = pa.localeCompare(pb);
      if (byProduct !== 0) return byProduct;
      return a.module.subscriptionModuleName.localeCompare(b.module.subscriptionModuleName);
    });
  }, [modules, accessRows, accessByModuleId]);
  const ungrantedModules = modules.filter((m) => !accessByModuleId.has(m.subscriptionModuleId));

  const modulesByProduct = useMemo(() => {
    const groups = new Map<string, SubscriptionModule[]>();
    for (const m of ungrantedModules) {
      const key = m.subscriptionProductName?.trim() || "Other";
      const list = groups.get(key) ?? [];
      list.push(m);
      groups.set(key, list);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [ungrantedModules]);

  function toggleSelected(moduleId: number, checked: boolean) {
    setSelectedIds((prev) =>
      checked ? [...new Set([...prev, moduleId])] : prev.filter((id) => id !== moduleId)
    );
  }

  async function grantSelected() {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    if (selectedIds.length === 0) {
      toast.error("Select at least one module");
      return;
    }
    setGrantSaving(true);
    try {
      const created = await createSubscriptionModuleAccessBatch({
        subscriptionModuleIds: selectedIds,
        tenantId: tenantKey,
        createdBy: actorKey,
      });
      toast.success(
        created.length === 1
          ? "Module access granted"
          : `${created.length} module access grants created`
      );
      setGrantOpen(false);
      setSelectedIds([]);
      await refresh();
    } catch (err) {
      toast.error(
        err instanceof SubscriptionModuleAccessApiError ? err.message : "Could not grant access"
      );
    } finally {
      setGrantSaving(false);
    }
  }

  async function confirmToggleStatus() {
    if (!statusTarget) return;
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    setStatusSaving(true);
    try {
      await setSubscriptionModuleAccessActive(
        statusTarget.subscriptionModuleAccessId,
        !statusTarget.isActive,
        actorKey
      );
      toast.success(statusTarget.isActive ? "Module access deactivated" : "Module access activated");
      setStatusTarget(null);
      await refresh();
    } catch (err) {
      toast.error(
        err instanceof SubscriptionModuleAccessApiError ? err.message : "Could not update status"
      );
    } finally {
      setStatusSaving(false);
    }
  }

  if (!canView) return null;

  return (
    <>
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <KeyRound className="h-4 w-4 text-primary" />
                Module access
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Subscription modules granted to {tenantName}. Activate or deactivate access, or grant
                additional modules.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canCreate && (
                <Button
                  size="sm"
                  disabled={ungrantedModules.length === 0}
                  onClick={() => {
                    setSelectedIds([]);
                    setGrantOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Grant modules
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                nativeButton={false}
                render={
                  <Link href={`/${roleSlug}/masters/subscription-module-access`} />
                }
              >
                Open master
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading module access…
            </div>
          ) : error ? (
            <EmptyState
              icon={KeyRound}
              tone="muted"
              heading="Could not load module access"
              description={error}
              size="compact"
              action={
                <Button size="sm" variant="outline" onClick={() => void refresh()}>
                  Retry
                </Button>
              }
            />
          ) : grantedRows.length === 0 ? (
            <EmptyState
              icon={KeyRound}
              tone="muted"
              heading="No modules granted yet"
              description="Grant subscription modules so this tenant can use those product areas."
              size="compact"
              action={
                canCreate && ungrantedModules.length > 0 ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedIds([]);
                      setGrantOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Grant modules
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {grantedRows.map(({ module, access }) => (
                <li
                  key={access!.subscriptionModuleAccessId}
                  className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{module.subscriptionModuleName}</p>
                    <p className="truncate text-muted-foreground">
                      {module.subscriptionProductName ?? "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={access!.isActive ? "default" : "secondary"} className="gap-1">
                      {access!.isActive ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <CircleDashed className="h-3 w-3" />
                      )}
                      {access!.isActive ? "active" : "inactive"}
                    </Badge>
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setStatusTarget(access)}
                      >
                        {access!.isActive ? (
                          <>
                            <PowerOff className="h-3.5 w-3.5" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <Power className="h-3.5 w-3.5" />
                            Activate
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={grantOpen}
        onOpenChange={(open) => {
          if (!grantSaving) {
            setGrantOpen(open);
            if (!open) setSelectedIds([]);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Grant modules to {tenantName}</DialogTitle>
            <DialogDescription>
              Select one or more subscription modules to grant. Already granted modules are hidden.
            </DialogDescription>
          </DialogHeader>

          {ungrantedModules.length === 0 ? (
            <p className="text-sm text-muted-foreground">All modules are already granted.</p>
          ) : (
            <div className="max-h-80 space-y-4 overflow-y-auto rounded-lg border border-border p-3">
              {modulesByProduct.map(([productName, productModules]) => (
                <div key={productName} className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {productName}
                  </p>
                  <div className="grid gap-2">
                    {productModules.map((m) => {
                      const checked = selectedIds.includes(m.subscriptionModuleId);
                      return (
                        <div
                          key={m.subscriptionModuleId}
                          role="button"
                          tabIndex={0}
                          onClick={() => toggleSelected(m.subscriptionModuleId, !checked)}
                          onKeyDown={(e) => {
                            if (e.key === " " || e.key === "Enter") {
                              e.preventDefault();
                              toggleSelected(m.subscriptionModuleId, !checked);
                            }
                          }}
                          className="flex cursor-pointer items-start gap-2.5 rounded-md px-2 py-2 text-sm hover:bg-muted/50"
                        >
                          <Checkbox
                            checked={checked}
                            onClick={(e) => e.stopPropagation()}
                            onCheckedChange={(value) =>
                              toggleSelected(m.subscriptionModuleId, value === true)
                            }
                            className="mt-0.5"
                          />
                          <span className="font-medium">{m.subscriptionModuleName}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedIds.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {selectedIds.length} module{selectedIds.length === 1 ? "" : "s"} selected
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={grantSaving}
              onClick={() => setGrantOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={grantSaving || selectedIds.length === 0}
              onClick={() => void grantSelected()}
            >
              {grantSaving
                ? "Granting…"
                : selectedIds.length > 1
                  ? `Grant ${selectedIds.length} modules`
                  : "Grant access"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!statusTarget}
        onOpenChange={(open) => {
          if (!open && !statusSaving) setStatusTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusTarget?.isActive ? "Deactivate" : "Activate"}{" "}
              {statusTarget?.subscriptionModuleName ?? "module"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {statusTarget?.isActive
                ? `This will revoke active access to this module for ${tenantName}.`
                : `This will restore active access to this module for ${tenantName}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={statusSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={statusSaving} onClick={() => void confirmToggleStatus()}>
              {statusSaving
                ? "Updating…"
                : statusTarget?.isActive
                  ? "Deactivate"
                  : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
