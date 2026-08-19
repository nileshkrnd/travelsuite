"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, ListTree, Tags, MoreHorizontal, X, Search, Loader2 } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { SortableTableHead, type SortDirection } from "@/components/shared/SortableTableHead";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore, isPlatformMode } from "@/lib/store/tenant.store";
import { useUsersStore } from "@/lib/store/users.store";
import { listServiceTypes, ServiceTypesApiError } from "@/lib/services/service-types.service";
import {
  listServiceProductClassifications,
  createServiceProductClassification,
  updateServiceProductClassification,
  setServiceProductClassificationActive,
  deleteServiceProductClassification,
  ServiceProductClassificationsApiError,
} from "@/lib/services/service-product-classifications.service";
import { can } from "@/config/permissions";
import { SUPER_ADMIN_ROLE_ID } from "@/mock/data/roles";
import { ICONS, ICON_NAMES } from "@/lib/icon-registry";
import type { RoleDef, ServiceProductClassification, ServiceType } from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";
type SortKey = "classificationName" | "classificationCode" | "displayOrder";
type StatusFilter = "all" | "active" | "inactive";

const NONE_PARENT = "__none__";

function useClassificationSchema(rows: ServiceProductClassification[], currentId?: number) {
  return z.object({
    classificationCode: z
      .string()
      .trim()
      .min(1, "Code is required")
      .max(50, "Must be 50 characters or fewer"),
    classificationName: z
      .string()
      .trim()
      .min(1, "Name is required")
      .max(150, "Must be 150 characters or fewer"),
    parentClassificationId: z.number().int().positive().nullable(),
    description: z.string().trim().max(500).optional().or(z.literal("")),
    icon: z.string().trim().max(200).optional().or(z.literal("")),
    displayOrder: z.preprocess((v) => (v === "" || v == null ? 0 : Number(v)), z.number().int().min(0)),
  }).superRefine((values, ctx) => {
    const duplicate = rows.some(
      (r) =>
        r.serviceProductClassificationId !== currentId &&
        r.classificationCode.toLowerCase() === values.classificationCode.trim().toLowerCase()
    );
    if (duplicate) {
      ctx.addIssue({
        code: "custom",
        path: ["classificationCode"],
        message: "This classification code already exists for this service type",
      });
    }
  });
}

type FormValues = z.infer<ReturnType<typeof useClassificationSchema>>;

function IconPreview({ name }: { name: string | undefined }) {
  const Icon = name ? ICONS[name] : undefined;
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-input bg-muted/40 text-muted-foreground">
      {Icon ? <Icon className="h-5 w-5" /> : <span className="text-xs">—</span>}
    </div>
  );
}

/** Excludes a classification and its full descendant chain — those can't be picked as its own parent. */
function parentOptionsFor(rows: ServiceProductClassification[], excludeId: number | undefined) {
  if (excludeId == null) return rows;
  const excluded = new Set<number>([excludeId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const r of rows) {
      if (
        r.parentClassificationId != null &&
        excluded.has(r.parentClassificationId) &&
        !excluded.has(r.serviceProductClassificationId)
      ) {
        excluded.add(r.serviceProductClassificationId);
        changed = true;
      }
    }
  }
  return rows.filter((r) => !excluded.has(r.serviceProductClassificationId));
}

function ClassificationPanel({
  mode,
  row,
  rows,
  serviceType,
  userKey,
  tenantId,
  companyId,
  onClose,
  onSaved,
}: {
  mode: Exclude<PanelMode, "closed">;
  row?: ServiceProductClassification;
  rows: ServiceProductClassification[];
  serviceType: ServiceType;
  userKey: number;
  tenantId: number;
  companyId: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const schema = useClassificationSchema(rows, row?.serviceProductClassificationId);
  const isReadOnly = mode === "view";
  const parentOptions = useMemo(
    () => parentOptionsFor(rows, row?.serviceProductClassificationId),
    [rows, row?.serviceProductClassificationId]
  );

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    values: {
      classificationCode: row?.classificationCode ?? "",
      classificationName: row?.classificationName ?? "",
      parentClassificationId: row?.parentClassificationId ?? null,
      description: row?.description ?? "",
      icon: row?.icon ?? "",
      displayOrder: row?.displayOrder ?? 0,
    },
  });

  const iconWatch = watch("icon");

  async function onSubmit(values: FormValues) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      if (mode === "edit" && row) {
        await updateServiceProductClassification(row.serviceProductClassificationId, {
          serviceTypeId: serviceType.serviceTypeId,
          classificationCode: values.classificationCode.trim(),
          classificationName: values.classificationName.trim(),
          parentClassificationId: values.parentClassificationId,
          description: values.description || undefined,
          icon: values.icon || undefined,
          displayOrder: values.displayOrder,
          tenantId,
          companyId,
          isActive: row.isActive,
          modifiedBy: userKey,
        });
        toast.success("Classification updated");
      } else if (mode === "create") {
        await createServiceProductClassification({
          serviceTypeId: serviceType.serviceTypeId,
          classificationCode: values.classificationCode.trim(),
          classificationName: values.classificationName.trim(),
          parentClassificationId: values.parentClassificationId,
          description: values.description || undefined,
          icon: values.icon || undefined,
          displayOrder: values.displayOrder,
          tenantId,
          companyId,
          createdBy: userKey,
        });
        toast.success("Classification created");
      }
      await onSaved();
      onClose();
    } catch (error) {
      toast.error(
        error instanceof ServiceProductClassificationsApiError ? error.message : "Could not save classification"
      );
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">
            {mode === "create" ? "Add classification" : mode === "edit" ? "Edit classification" : "Classification details"}
          </h2>
          <p className="text-sm text-muted-foreground">Under {serviceType.serviceTypeName}</p>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
        <div className="space-y-2">
          <Label htmlFor="classificationCode" required>
            Code
          </Label>
          <Input
            id="classificationCode"
            autoFocus={!isReadOnly}
            disabled={isReadOnly}
            placeholder="e.g. BEACH_RESORT"
            aria-invalid={!!errors.classificationCode}
            {...register("classificationCode")}
          />
          {errors.classificationCode && (
            <p className="text-sm text-destructive">{errors.classificationCode.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="classificationName" required>
            Name
          </Label>
          <Input
            id="classificationName"
            disabled={isReadOnly}
            placeholder="e.g. Beach Resort"
            aria-invalid={!!errors.classificationName}
            {...register("classificationName")}
          />
          {errors.classificationName && (
            <p className="text-sm text-destructive">{errors.classificationName.message}</p>
          )}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label>Parent classification</Label>
          <Controller
            control={control}
            name="parentClassificationId"
            render={({ field }) => (
              <Select
                value={field.value == null ? NONE_PARENT : String(field.value)}
                onValueChange={(v) => field.onChange(!v || v === NONE_PARENT ? null : Number(v))}
                disabled={isReadOnly}
              >
                <SelectTrigger className="h-10 w-full max-w-full min-w-0">
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value || value === NONE_PARENT) return "None (top-level)";
                      return (
                        parentOptions.find((p) => String(p.serviceProductClassificationId) === value)
                          ?.classificationName ?? "None (top-level)"
                      );
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_PARENT}>None (top-level)</SelectItem>
                  {parentOptions.map((p) => (
                    <SelectItem key={p.serviceProductClassificationId} value={String(p.serviceProductClassificationId)}>
                      {p.classificationName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" rows={2} disabled={isReadOnly} {...register("description")} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="icon">Icon</Label>
          <div className="flex items-center gap-2">
            <IconPreview name={iconWatch} />
            <Input
              id="icon"
              disabled={isReadOnly}
              placeholder="e.g. Waves"
              list="classification-icon-options"
              {...register("icon")}
            />
            <datalist id="classification-icon-options">
              {ICON_NAMES.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>
          <p className="text-xs text-muted-foreground">Lucide icon name — start typing to see matches.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="displayOrder">Display order</Label>
          <Input id="displayOrder" type="number" min={0} disabled={isReadOnly} {...register("displayOrder")} />
        </div>

        {mode === "view" && row && (
          <div className="space-y-2">
            <Label>Status</Label>
            <div>
              <Badge variant={row.isActive ? "default" : "secondary"}>{row.isActive ? "active" : "inactive"}</Badge>
            </div>
          </div>
        )}

        {!isReadOnly && (
          <div className="flex items-center gap-2 sm:col-span-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "edit" ? "Save" : "Create"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        )}
      </form>
    </Card>
  );
}

function ClassificationList({ roleDef }: { roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const activeTenantId = useTenantStore((s) => s.tenantId);
  const activeTenant = useTenantStore((s) => s.tenant);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [typeCounts, setTypeCounts] = useState<Map<number, number>>(new Map());
  const [rows, setRows] = useState<ServiceProductClassification[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<ServiceProductClassification | undefined>();
  const [serviceTypeFilter, setServiceTypeFilter] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>("displayOrder");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const isSuperAdmin = roleDef.id === SUPER_ADMIN_ROLE_ID;
  const platformMode = isSuperAdmin && isPlatformMode(activeTenantId);
  const scopeTenantId = platformMode ? 0 : (user?.tenantKey ?? activeTenant.tenantKey ?? 0);

  const canEdit = can(roleDef, "serviceProductClassification", "edit");
  const canCreate = can(roleDef, "serviceProductClassification", "create");
  const canDelete = can(roleDef, "serviceProductClassification", "delete");
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  const selectedServiceType = serviceTypes.find((t) => t.serviceTypeId === serviceTypeFilter);

  async function loadServiceTypes() {
    if (scopeTenantId <= 0) {
      setServiceTypes([]);
      setLoadingTypes(false);
      setLoadError(platformMode ? "Select a tenant workspace to manage classifications." : "Missing tenant scope.");
      return;
    }
    setLoadingTypes(true);
    setLoadError(null);
    try {
      const [typeRows, allClassifications] = await Promise.all([
        listServiceTypes({ tenantId: scopeTenantId, activeOnly: true }),
        listServiceProductClassifications({ tenantId: scopeTenantId }),
      ]);
      setServiceTypes(typeRows);
      const counts = new Map<number, number>();
      for (const c of allClassifications) {
        counts.set(c.serviceTypeId, (counts.get(c.serviceTypeId) ?? 0) + 1);
      }
      setTypeCounts(counts);
      setServiceTypeFilter((current) => {
        if (current && typeRows.some((t) => t.serviceTypeId === current)) return current;
        const withData = typeRows.find((t) => (counts.get(t.serviceTypeId) ?? 0) > 0);
        return withData?.serviceTypeId ?? typeRows[0]?.serviceTypeId ?? null;
      });
    } catch (error) {
      setLoadError(error instanceof ServiceTypesApiError ? error.message : "Failed to load service types");
      setServiceTypes([]);
    } finally {
      setLoadingTypes(false);
    }
  }

  useEffect(() => {
    void loadServiceTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeTenantId]);

  async function refreshRows() {
    if (!serviceTypeFilter || scopeTenantId <= 0) {
      setRows([]);
      return;
    }
    setLoadingRows(true);
    try {
      const rowsResult = await listServiceProductClassifications({
        tenantId: scopeTenantId,
        serviceTypeId: serviceTypeFilter,
      });
      setRows(rowsResult);
      setTypeCounts((prev) => {
        const next = new Map(prev);
        next.set(serviceTypeFilter, rowsResult.length);
        return next;
      });
    } catch (error) {
      toast.error(
        error instanceof ServiceProductClassificationsApiError ? error.message : "Failed to load classifications"
      );
      setRows([]);
    } finally {
      setLoadingRows(false);
    }
  }

  useEffect(() => {
    void refreshRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceTypeFilter, scopeTenantId]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    let result = rows;
    if (term) {
      result = result.filter(
        (r) =>
          r.classificationName.toLowerCase().includes(term) || r.classificationCode.toLowerCase().includes(term)
      );
    }
    if (statusFilter === "active") result = result.filter((r) => r.isActive);
    if (statusFilter === "inactive") result = result.filter((r) => !r.isActive);
    if (sortKey) {
      result = [...result].sort((a, b) => {
        if (sortKey === "displayOrder") {
          return sortDirection === "asc" ? a.displayOrder - b.displayOrder : b.displayOrder - a.displayOrder;
        }
        const cmp = String(a[sortKey]).localeCompare(String(b[sortKey]));
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [rows, search, statusFilter, sortKey, sortDirection]);

  async function toggleActive(row: ServiceProductClassification) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      await setServiceProductClassificationActive(row.serviceProductClassificationId, !row.isActive, userKey);
      await refreshRows();
      toast.success(row.isActive ? "Classification deactivated" : "Classification activated");
    } catch (error) {
      toast.error(
        error instanceof ServiceProductClassificationsApiError ? error.message : "Could not update status"
      );
    }
  }

  async function removeRow(row: ServiceProductClassification) {
    try {
      await deleteServiceProductClassification(row.serviceProductClassificationId);
      await refreshRows();
      toast.success("Classification deleted");
    } catch (error) {
      toast.error(
        error instanceof ServiceProductClassificationsApiError ? error.message : "Could not delete classification"
      );
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Service Product Classification"
        description="Classifications group products within a service type — e.g. Hotel > Resort > Beach Resort."
        actions={
          canCreate && panelMode === "closed" && selectedServiceType ? (
            <Button
              onClick={() => {
                setTarget(undefined);
                setPanelMode("create");
              }}
            >
              <Plus className="h-4 w-4" />
              Add classification
            </Button>
          ) : undefined
        }
      />

      {loadError && <p className="text-sm text-destructive">{loadError}</p>}
      {loadingTypes && <p className="text-sm text-muted-foreground">Loading service types…</p>}
      {!loadingTypes && scopeTenantId > 0 && serviceTypes.length === 0 && (
        <EmptyState
          icon={Tags}
          tone="muted"
          heading="No service types yet"
          description="Create a service type first under Admin → Product → Service Type."
          size="compact"
        />
      )}

      {!loadingTypes && serviceTypes.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select
            value={serviceTypeFilter ? String(serviceTypeFilter) : ""}
            onValueChange={(v) => setServiceTypeFilter(v ? Number(v) : null)}
          >
            <SelectTrigger className="w-64">
              <SelectValue>
                {(value: string | null) => {
                  if (!value) return "Select service type";
                  return serviceTypes.find((t) => String(t.serviceTypeId) === value)?.serviceTypeName ?? value;
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {serviceTypes.map((t) => (
                <SelectItem key={t.serviceTypeId} value={String(t.serviceTypeId)}>
                  {t.serviceTypeName} ({typeCounts.get(t.serviceTypeId) ?? 0})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {panelMode !== "closed" && selectedServiceType && (
        <ClassificationPanel
          mode={panelMode}
          row={target}
          rows={rows}
          serviceType={selectedServiceType}
          userKey={userKey}
          tenantId={scopeTenantId}
          companyId={target?.companyId ?? selectedServiceType.companyId}
          onSaved={refreshRows}
          onClose={() => {
            setPanelMode("closed");
            setTarget(undefined);
          }}
        />
      )}

      {selectedServiceType && rows.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search code or name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter((value as StatusFilter) ?? "all")}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {selectedServiceType && (
        <Card>
          {loadingRows ? (
            <p className="p-6 text-sm text-muted-foreground">Loading classifications…</p>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={ListTree}
              tone="primary"
              heading="No classifications yet"
              description={`Add your first classification under ${selectedServiceType.serviceTypeName}.`}
              size="compact"
            />
          ) : visible.length === 0 ? (
            <EmptyState
              icon={Search}
              tone="muted"
              heading="No matching classifications"
              description="Try a different search or status filter."
              size="compact"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">
                    <span className="sr-only">Icon</span>
                  </TableHead>
                  <SortableTableHead
                    sortKey="classificationCode"
                    activeKey={sortKey}
                    direction={sortDirection}
                    onSort={toggleSort}
                  >
                    Code
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="classificationName"
                    activeKey={sortKey}
                    direction={sortDirection}
                    onSort={toggleSort}
                  >
                    Name
                  </SortableTableHead>
                  <TableHead>Parent</TableHead>
                  <SortableTableHead
                    sortKey="displayOrder"
                    activeKey={sortKey}
                    direction={sortDirection}
                    onSort={toggleSort}
                  >
                    Order
                  </SortableTableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((row) => (
                  <TableRow key={row.serviceProductClassificationId}>
                    <TableCell>
                      <IconPreview name={row.icon ?? undefined} />
                    </TableCell>
                    <TableCell className="font-mono text-xs font-medium">{row.classificationCode}</TableCell>
                    <TableCell className="font-medium">{row.classificationName}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.parentClassificationName ?? <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.displayOrder}</TableCell>
                    <TableCell>
                      <Badge variant={row.isActive ? "default" : "secondary"}>
                        {row.isActive ? "active" : "inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setTarget(row);
                              setPanelMode("view");
                            }}
                          >
                            View
                          </DropdownMenuItem>
                          {canEdit && (
                            <>
                              <DropdownMenuItem
                                onClick={() => {
                                  setTarget(row);
                                  setPanelMode("edit");
                                }}
                              >
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => void toggleActive(row)}>
                                {row.isActive ? "Deactivate" : "Activate"}
                              </DropdownMenuItem>
                            </>
                          )}
                          {canDelete && (
                            <DropdownMenuItem onClick={() => void removeRow(row)}>Delete</DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      )}
    </div>
  );
}

export default function ServiceProductClassificationMasterPage() {
  return (
    <AccessGate module="serviceProductClassification">
      {(roleDef) => <ClassificationList roleDef={roleDef} />}
    </AccessGate>
  );
}
