"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, LayoutGrid, Tags, Eye, Pencil, Power, PowerOff, Trash2, X, Search, Loader2, Star, ImageOff } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore, isPlatformMode } from "@/lib/store/tenant.store";
import { useUsersStore } from "@/lib/store/users.store";
import { listServiceTypes, ServiceTypesApiError } from "@/lib/services/service-types.service";
import {
  listServiceProductClassifications,
  ServiceProductClassificationsApiError,
} from "@/lib/services/service-product-classifications.service";
import {
  listServiceProductCategories,
  createServiceProductCategory,
  updateServiceProductCategory,
  setServiceProductCategoryActive,
  deleteServiceProductCategory,
  ServiceProductCategoriesApiError,
} from "@/lib/services/service-product-categories.service";
import { can } from "@/config/permissions";
import { SUPER_ADMIN_ROLE_ID } from "@/mock/data/roles";
import { ICONS, ICON_NAMES } from "@/lib/icon-registry";
import type { RoleDef, ServiceProductCategory, ServiceProductClassification, ServiceType } from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";
type SortKey = "categoryName" | "categoryCode" | "displayOrder";
type StatusFilter = "all" | "active" | "inactive";

const NONE_OPTION = "__none__";

function useCategorySchema(rows: ServiceProductCategory[], currentId?: number) {
  return z.object({
    categoryCode: z.string().trim().min(1, "Code is required").max(50, "Must be 50 characters or fewer"),
    categoryName: z.string().trim().min(1, "Name is required").max(150, "Must be 150 characters or fewer"),
    serviceProductClassificationId: z.number().int().positive().nullable(),
    parentServiceProductCategoryId: z.number().int().positive().nullable(),
    description: z.string().trim().max(500).optional().or(z.literal("")),
    icon: z.string().trim().max(200).optional().or(z.literal("")),
    imageUrl: z.string().trim().max(500).optional().or(z.literal("")),
    displayOrder: z.preprocess((v) => (v === "" || v == null ? 0 : Number(v)), z.number().int().min(0)),
    isFeatured: z.boolean(),
  }).superRefine((values, ctx) => {
    const duplicateCode = rows.some(
      (r) =>
        r.serviceProductCategoryId !== currentId &&
        r.categoryCode.toLowerCase() === values.categoryCode.trim().toLowerCase()
    );
    if (duplicateCode) {
      ctx.addIssue({
        code: "custom",
        path: ["categoryCode"],
        message: "This category code already exists for this service type",
      });
    }
    const duplicateName = rows.some(
      (r) =>
        r.serviceProductCategoryId !== currentId &&
        r.serviceProductClassificationId === values.serviceProductClassificationId &&
        r.categoryName.trim().toLowerCase() === values.categoryName.trim().toLowerCase()
    );
    if (duplicateName) {
      ctx.addIssue({
        code: "custom",
        path: ["categoryName"],
        message: "This name already exists under the same classification",
      });
    }
  });
}

type FormValues = z.infer<ReturnType<typeof useCategorySchema>>;

function IconPreview({ name }: { name: string | undefined }) {
  const Icon = name ? ICONS[name] : undefined;
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-input bg-muted/40 text-muted-foreground">
      {Icon ? <Icon className="h-5 w-5" /> : <span className="text-xs">—</span>}
    </div>
  );
}

function ImagePreview({ url }: { url: string | undefined }) {
  const [failed, setFailed] = useState(false);
  const trimmed = url?.trim();
  if (!trimmed || failed) {
    return (
      <div className="flex h-10 w-16 shrink-0 items-center justify-center rounded-lg border border-input bg-muted/40 text-muted-foreground">
        <ImageOff className="h-4 w-4" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- arbitrary external URL, not a static asset
    <img
      src={trimmed}
      alt=""
      className="h-10 w-16 shrink-0 rounded-lg border border-input object-cover"
      onError={() => setFailed(true)}
    />
  );
}

/** Excludes a category and its full descendant chain — those can't be picked as its own parent. */
function parentOptionsFor(rows: ServiceProductCategory[], excludeId: number | undefined) {
  if (excludeId == null) return rows;
  const excluded = new Set<number>([excludeId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const r of rows) {
      if (
        r.parentServiceProductCategoryId != null &&
        excluded.has(r.parentServiceProductCategoryId) &&
        !excluded.has(r.serviceProductCategoryId)
      ) {
        excluded.add(r.serviceProductCategoryId);
        changed = true;
      }
    }
  }
  return rows.filter((r) => !excluded.has(r.serviceProductCategoryId));
}

function CategoryPanel({
  mode,
  row,
  rows,
  classifications,
  serviceType,
  userKey,
  tenantId,
  companyId,
  onClose,
  onSaved,
}: {
  mode: Exclude<PanelMode, "closed">;
  row?: ServiceProductCategory;
  rows: ServiceProductCategory[];
  classifications: ServiceProductClassification[];
  serviceType: ServiceType;
  userKey: number;
  tenantId: number;
  companyId: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const schema = useCategorySchema(rows, row?.serviceProductCategoryId);
  const isReadOnly = mode === "view";
  const parentOptions = useMemo(
    () => parentOptionsFor(rows, row?.serviceProductCategoryId),
    [rows, row?.serviceProductCategoryId]
  );

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    values: {
      categoryCode: row?.categoryCode ?? "",
      categoryName: row?.categoryName ?? "",
      serviceProductClassificationId: row?.serviceProductClassificationId ?? null,
      parentServiceProductCategoryId: row?.parentServiceProductCategoryId ?? null,
      description: row?.description ?? "",
      icon: row?.icon ?? "",
      imageUrl: row?.imageUrl ?? "",
      displayOrder: row?.displayOrder ?? 0,
      isFeatured: row?.isFeatured ?? false,
    },
  });

  const iconWatch = watch("icon");
  const imageUrlWatch = watch("imageUrl");

  function blankValues(): FormValues {
    return {
      categoryCode: "",
      categoryName: "",
      serviceProductClassificationId: null,
      parentServiceProductCategoryId: null,
      description: "",
      icon: "",
      imageUrl: "",
      displayOrder: 0,
      isFeatured: false,
    };
  }

  async function submit(values: FormValues, keepOpenForMore: boolean) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    const payload = {
      serviceTypeId: serviceType.serviceTypeId,
      categoryCode: values.categoryCode.trim(),
      categoryName: values.categoryName.trim(),
      serviceProductClassificationId: values.serviceProductClassificationId,
      parentServiceProductCategoryId: values.parentServiceProductCategoryId,
      description: values.description || undefined,
      icon: values.icon || undefined,
      imageUrl: values.imageUrl || undefined,
      displayOrder: values.displayOrder,
      isFeatured: values.isFeatured,
      tenantId,
      companyId,
    };
    try {
      if (mode === "edit" && row) {
        await updateServiceProductCategory(row.serviceProductCategoryId, {
          ...payload,
          isActive: row.isActive,
          modifiedBy: userKey,
        });
        toast.success("Category updated");
        await onSaved();
        onClose();
      } else if (mode === "create") {
        await createServiceProductCategory({ ...payload, createdBy: userKey });
        toast.success("Category created");
        await onSaved();
        if (keepOpenForMore) {
          reset(blankValues());
        } else {
          onClose();
        }
      }
    } catch (error) {
      toast.error(error instanceof ServiceProductCategoriesApiError ? error.message : "Could not save category");
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">
            {mode === "create" ? "Add category" : mode === "edit" ? "Edit category" : "Category details"}
          </h2>
          <p className="text-sm text-muted-foreground">Under {serviceType.serviceTypeName}</p>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit((values) => submit(values, false))} className="grid grid-cols-2 gap-3 sm:grid-cols-4" noValidate>
        <div className="space-y-1">
          <Label htmlFor="categoryCode" required>
            Code
          </Label>
          <Input
            id="categoryCode"
            autoFocus={!isReadOnly}
            disabled={isReadOnly}
            placeholder="e.g. OVERWATER_VILLA"
            aria-invalid={!!errors.categoryCode}
            {...register("categoryCode")}
          />
          {errors.categoryCode && <p className="text-sm text-destructive">{errors.categoryCode.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="categoryName" required>
            Name
          </Label>
          <Input
            id="categoryName"
            disabled={isReadOnly}
            placeholder="e.g. Overwater Villa"
            aria-invalid={!!errors.categoryName}
            {...register("categoryName")}
          />
          {errors.categoryName && <p className="text-sm text-destructive">{errors.categoryName.message}</p>}
        </div>

        <div className="space-y-1">
          <Label>Classification</Label>
          <Controller
            control={control}
            name="serviceProductClassificationId"
            render={({ field }) => (
              <Select
                value={field.value == null ? NONE_OPTION : String(field.value)}
                onValueChange={(v) => field.onChange(!v || v === NONE_OPTION ? null : Number(v))}
                disabled={isReadOnly}
              >
                <SelectTrigger className="h-10 w-full max-w-full min-w-0">
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value || value === NONE_OPTION) return "None";
                      return (
                        classifications.find((c) => String(c.serviceProductClassificationId) === value)
                          ?.classificationName ?? "None"
                      );
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_OPTION}>None</SelectItem>
                  {classifications.map((c) => (
                    <SelectItem key={c.serviceProductClassificationId} value={String(c.serviceProductClassificationId)}>
                      {c.classificationName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1">
          <Label>Parent category</Label>
          <Controller
            control={control}
            name="parentServiceProductCategoryId"
            render={({ field }) => (
              <Select
                value={field.value == null ? NONE_OPTION : String(field.value)}
                onValueChange={(v) => field.onChange(!v || v === NONE_OPTION ? null : Number(v))}
                disabled={isReadOnly}
              >
                <SelectTrigger className="h-10 w-full max-w-full min-w-0">
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value || value === NONE_OPTION) return "None (top-level)";
                      return (
                        parentOptions.find((p) => String(p.serviceProductCategoryId) === value)?.categoryName ??
                        "None (top-level)"
                      );
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_OPTION}>None (top-level)</SelectItem>
                  {parentOptions.map((p) => (
                    <SelectItem key={p.serviceProductCategoryId} value={String(p.serviceProductCategoryId)}>
                      {p.categoryName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="displayOrder">Display order</Label>
          <Input id="displayOrder" type="number" min={0} disabled={isReadOnly} {...register("displayOrder")} />
        </div>

        <div className="flex items-end pb-2">
          <Controller
            control={control}
            name="isFeatured"
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} disabled={isReadOnly} />
                Featured category
              </label>
            )}
          />
        </div>

        {mode === "view" && row && (
          <div className="space-y-1">
            <Label>Status</Label>
            <div>
              <Badge variant={row.isActive ? "default" : "secondary"}>{row.isActive ? "active" : "inactive"}</Badge>
            </div>
          </div>
        )}

        <div className="col-span-2 space-y-1 sm:col-span-4">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" rows={2} disabled={isReadOnly} {...register("description")} />
        </div>

        <div className="col-span-2 space-y-1 sm:col-span-4">
          <Label htmlFor="icon">Icon</Label>
          <div className="flex items-center gap-2">
            <IconPreview name={iconWatch} />
            <Input
              id="icon"
              disabled={isReadOnly}
              placeholder="e.g. Waves"
              list="category-icon-options"
              {...register("icon")}
            />
            <datalist id="category-icon-options">
              {ICON_NAMES.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>
          <p className="text-xs text-muted-foreground">Lucide icon name — start typing to see matches.</p>
        </div>

        <div className="col-span-2 space-y-1 sm:col-span-4">
          <Label htmlFor="imageUrl">Image URL</Label>
          <div className="flex items-center gap-2">
            <ImagePreview url={imageUrlWatch} />
            <Input id="imageUrl" disabled={isReadOnly} placeholder="https://…" {...register("imageUrl")} />
          </div>
        </div>

        {!isReadOnly && (
          <div className="col-span-2 flex items-center gap-2 sm:col-span-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "edit" ? "Save" : "Create"}
            </Button>
            {mode === "create" && (
              <Button type="button" variant="secondary" disabled={isSubmitting} onClick={handleSubmit((values) => submit(values, true))}>
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Create &amp; add more
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        )}
      </form>
    </Card>
  );
}

function CategoryList({ roleDef }: { roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const activeTenantId = useTenantStore((s) => s.tenantId);
  const activeTenant = useTenantStore((s) => s.tenant);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [typeCounts, setTypeCounts] = useState<Map<number, number>>(new Map());
  const [classifications, setClassifications] = useState<ServiceProductClassification[]>([]);
  const [rows, setRows] = useState<ServiceProductCategory[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<ServiceProductCategory | undefined>();
  const [serviceTypeFilter, setServiceTypeFilter] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>("displayOrder");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const isSuperAdmin = roleDef.id === SUPER_ADMIN_ROLE_ID;
  const platformMode = isSuperAdmin && isPlatformMode(activeTenantId);
  const scopeTenantId = platformMode ? 0 : (user?.tenantKey ?? activeTenant.tenantKey ?? 0);

  const canEdit = can(roleDef, "serviceProductCategory", "edit");
  const canCreate = can(roleDef, "serviceProductCategory", "create");
  const canDelete = can(roleDef, "serviceProductCategory", "delete");
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  const selectedServiceType = serviceTypes.find((t) => t.serviceTypeId === serviceTypeFilter);

  async function loadServiceTypes() {
    if (scopeTenantId <= 0) {
      setServiceTypes([]);
      setLoadingTypes(false);
      setLoadError(platformMode ? "Select a tenant workspace to manage categories." : "Missing tenant scope.");
      return;
    }
    setLoadingTypes(true);
    setLoadError(null);
    try {
      const [typeRows, allCategories] = await Promise.all([
        listServiceTypes({ tenantId: scopeTenantId, activeOnly: true }),
        listServiceProductCategories({ tenantId: scopeTenantId }),
      ]);
      setServiceTypes(typeRows);
      const counts = new Map<number, number>();
      for (const c of allCategories) {
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
      setClassifications([]);
      return;
    }
    setLoadingRows(true);
    try {
      const [categoryRows, classificationRows] = await Promise.all([
        listServiceProductCategories({ tenantId: scopeTenantId, serviceTypeId: serviceTypeFilter }),
        listServiceProductClassifications({ tenantId: scopeTenantId, serviceTypeId: serviceTypeFilter, activeOnly: true }),
      ]);
      setRows(categoryRows);
      setClassifications(classificationRows);
      setTypeCounts((prev) => {
        const next = new Map(prev);
        next.set(serviceTypeFilter, categoryRows.length);
        return next;
      });
    } catch (error) {
      toast.error(
        error instanceof ServiceProductCategoriesApiError || error instanceof ServiceProductClassificationsApiError
          ? error.message
          : "Failed to load categories"
      );
      setRows([]);
      setClassifications([]);
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
        (r) => r.categoryName.toLowerCase().includes(term) || r.categoryCode.toLowerCase().includes(term)
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

  async function toggleActive(row: ServiceProductCategory) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      await setServiceProductCategoryActive(row.serviceProductCategoryId, !row.isActive, userKey);
      await refreshRows();
      toast.success(row.isActive ? "Category deactivated" : "Category activated");
    } catch (error) {
      toast.error(error instanceof ServiceProductCategoriesApiError ? error.message : "Could not update status");
    }
  }

  async function removeRow(row: ServiceProductCategory) {
    try {
      await deleteServiceProductCategory(row.serviceProductCategoryId);
      await refreshRows();
      toast.success("Category deleted");
    } catch (error) {
      toast.error(error instanceof ServiceProductCategoriesApiError ? error.message : "Could not delete category");
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Service Product Category"
        description="Categories group products within a service type and optional classification — e.g. Hotel > Beach Resort > Overwater Villas."
        actions={
          canCreate && panelMode === "closed" && selectedServiceType ? (
            <Button
              onClick={() => {
                setTarget(undefined);
                setPanelMode("create");
              }}
            >
              <Plus className="h-4 w-4" />
              Add category
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
        <CategoryPanel
          mode={panelMode}
          row={target}
          rows={rows}
          classifications={classifications}
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
            <p className="p-6 text-sm text-muted-foreground">Loading categories…</p>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={LayoutGrid}
              tone="primary"
              heading="No categories yet"
              description={`Add your first category under ${selectedServiceType.serviceTypeName}.`}
              size="compact"
            />
          ) : visible.length === 0 ? (
            <EmptyState
              icon={Search}
              tone="muted"
              heading="No matching categories"
              description="Try a different search or status filter."
              size="compact"
            />
          ) : (
            <Table className="table-fixed border-collapse text-xs [&_th]:h-auto [&_th]:whitespace-normal [&_td]:whitespace-normal">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[10%] px-2 py-1.5">Image</TableHead>
                  <SortableTableHead
                    sortKey="categoryCode"
                    activeKey={sortKey}
                    direction={sortDirection}
                    onSort={toggleSort}
                    className="w-[14%] px-2 py-1.5"
                  >
                    Code
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="categoryName"
                    activeKey={sortKey}
                    direction={sortDirection}
                    onSort={toggleSort}
                    className="w-[16%] px-2 py-1.5"
                  >
                    Name
                  </SortableTableHead>
                  <TableHead className="w-[16%] px-2 py-1.5">Classification</TableHead>
                  <TableHead className="w-[14%] px-2 py-1.5">Parent</TableHead>
                  <SortableTableHead
                    sortKey="displayOrder"
                    activeKey={sortKey}
                    direction={sortDirection}
                    onSort={toggleSort}
                    className="w-[6%] px-2 py-1.5"
                  >
                    Order
                  </SortableTableHead>
                  <TableHead className="w-[10%] px-2 py-1.5">Status</TableHead>
                  <TableHead className="w-[14%] px-2 py-1.5 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((row) => (
                  <TableRow key={row.serviceProductCategoryId}>
                    <TableCell className="px-2 py-1.5">
                      <ImagePreview url={row.imageUrl ?? undefined} />
                    </TableCell>
                    <TableCell className="px-2 py-1.5 font-mono font-medium leading-tight">{row.categoryCode}</TableCell>
                    <TableCell className="px-2 py-1.5 font-medium leading-tight">
                      <span className="flex items-center gap-1.5">
                        {row.isFeatured && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
                        {row.categoryName}
                      </span>
                    </TableCell>
                    <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">{row.classificationName ?? "—"}</TableCell>
                    <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">{row.parentCategoryName ?? "—"}</TableCell>
                    <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">{row.displayOrder}</TableCell>
                    <TableCell className="px-2 py-1.5">
                      <Badge variant={row.isActive ? "default" : "secondary"} className="px-1.5 py-0 text-[11px]">
                        {row.isActive ? "active" : "inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-2 py-1.5 text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label="View"
                                onClick={() => {
                                  setTarget(row);
                                  setPanelMode("view");
                                }}
                              />
                            }
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </TooltipTrigger>
                          <TooltipContent>View</TooltipContent>
                        </Tooltip>
                        {canEdit && (
                          <>
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label="Edit"
                                    onClick={() => {
                                      setTarget(row);
                                      setPanelMode("edit");
                                    }}
                                  />
                                }
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </TooltipTrigger>
                              <TooltipContent>Edit</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label={row.isActive ? "Deactivate" : "Activate"}
                                    onClick={() => void toggleActive(row)}
                                  />
                                }
                              >
                                {row.isActive ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                              </TooltipTrigger>
                              <TooltipContent>{row.isActive ? "Deactivate" : "Activate"}</TooltipContent>
                            </Tooltip>
                          </>
                        )}
                        {canDelete && (
                          <Tooltip>
                            <TooltipTrigger
                              render={<Button variant="ghost" size="icon-sm" aria-label="Delete" onClick={() => void removeRow(row)} />}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </TooltipTrigger>
                            <TooltipContent>Delete</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
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

export default function ServiceProductCategoryMasterPage() {
  return (
    <AccessGate module="serviceProductCategory">{(roleDef) => <CategoryList roleDef={roleDef} />}</AccessGate>
  );
}
