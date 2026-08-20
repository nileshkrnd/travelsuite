"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Package, MoreHorizontal, X, Search, Loader2, Star, History } from "lucide-react";
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
  ServiceProductClassificationsApiError,
} from "@/lib/services/service-product-classifications.service";
import {
  listServiceProductCategories,
  ServiceProductCategoriesApiError,
} from "@/lib/services/service-product-categories.service";
import { listCommonStatusTypes } from "@/lib/services/common-status-types.service";
import { listCommonStatuses } from "@/lib/services/common-statuses.service";
import { listSuppliers } from "@/lib/services/suppliers.service";
import { listCountries } from "@/lib/services/countries.service";
import { listCities } from "@/lib/services/cities.service";
import { listRegions } from "@/lib/services/regions.service";
import {
  listServiceProducts,
  createServiceProduct,
  updateServiceProduct,
  setServiceProductActive,
  deleteServiceProduct,
  ServiceProductsApiError,
} from "@/lib/services/service-products.service";
import {
  listServiceProductStatusHistory,
  ServiceProductStatusHistoryApiError,
} from "@/lib/services/service-product-status-history.service";
import { can } from "@/config/permissions";
import { SUPER_ADMIN_ROLE_ID } from "@/mock/data/roles";
import type {
  City,
  CommonStatus,
  Country,
  Region,
  RoleDef,
  ServiceProduct,
  ServiceProductCategory,
  ServiceProductClassification,
  ServiceProductStatusHistory,
  ServiceType,
  Supplier,
} from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";
type SortKey = "serviceProductName" | "serviceProductCode" | "displayOrder";
type StatusFilter = "all" | "active" | "inactive";

const NONE_OPTION = "__none__";

function useProductSchema(rows: ServiceProduct[], currentId?: number) {
  return z.object({
    serviceProductCode: z.string().trim().min(1, "Code is required").max(50),
    serviceProductName: z.string().trim().min(1, "Name is required").max(250),
    serviceProductClassificationId: z.number().int().positive("Classification is required"),
    serviceProductCategoryId: z.number().int().positive().nullable(),
    supplierId: z.number().int().positive().nullable(),
    countryId: z.number().int().positive().nullable(),
    regionId: z.number().int().positive().nullable(),
    cityId: z.number().int().positive().nullable(),
    shortDescription: z.string().trim().max(1000).optional().or(z.literal("")),
    description: z.string().trim().optional().or(z.literal("")),
    isOnlineSellable: z.boolean(),
    isFeatured: z.boolean(),
    displayOrder: z.preprocess((v) => (v === "" || v == null ? 0 : Number(v)), z.number().int().min(0)),
    commonStatusId: z.number().int().positive("Status is required"),
    statusChangeRemarks: z.string().trim().max(1000).optional().or(z.literal("")),
  }).superRefine((values, ctx) => {
    const duplicate = rows.some(
      (r) =>
        r.serviceProductId !== currentId &&
        r.serviceProductCode.toLowerCase() === values.serviceProductCode.trim().toLowerCase()
    );
    if (duplicate) {
      ctx.addIssue({ code: "custom", path: ["serviceProductCode"], message: "This product code already exists" });
    }
  });
}

type FormValues = z.infer<ReturnType<typeof useProductSchema>>;

function ProductPanel({
  mode,
  row,
  rows,
  serviceType,
  classifications,
  categories,
  suppliers,
  countries,
  regions,
  statuses,
  userKey,
  tenantId,
  companyId,
  onClose,
  onSaved,
}: {
  mode: Exclude<PanelMode, "closed">;
  row?: ServiceProduct;
  rows: ServiceProduct[];
  serviceType: ServiceType;
  classifications: ServiceProductClassification[];
  categories: ServiceProductCategory[];
  suppliers: Supplier[];
  countries: Country[];
  regions: Region[];
  statuses: CommonStatus[];
  userKey: number;
  tenantId: number;
  companyId: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const schema = useProductSchema(rows, row?.serviceProductId);
  const isReadOnly = mode === "view";
  const [cities, setCities] = useState<City[]>([]);
  const [history, setHistory] = useState<ServiceProductStatusHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    values: {
      serviceProductCode: row?.serviceProductCode ?? "",
      serviceProductName: row?.serviceProductName ?? "",
      serviceProductClassificationId: row?.serviceProductClassificationId ?? classifications[0]?.serviceProductClassificationId ?? 0,
      serviceProductCategoryId: row?.serviceProductCategoryId ?? null,
      supplierId: row?.supplierId ?? null,
      countryId: row?.countryId ?? null,
      regionId: row?.regionId ?? null,
      cityId: row?.cityId ?? null,
      shortDescription: row?.shortDescription ?? "",
      description: row?.description ?? "",
      isOnlineSellable: row?.isOnlineSellable ?? false,
      isFeatured: row?.isFeatured ?? false,
      displayOrder: row?.displayOrder ?? 0,
      commonStatusId: row?.commonStatusId ?? statuses.find((s) => s.isInitial)?.commonStatusId ?? statuses[0]?.commonStatusId ?? 0,
      statusChangeRemarks: "",
    },
  });

  const countryIdWatch = watch("countryId");

  useEffect(() => {
    if (!countryIdWatch) {
      setCities([]);
      return;
    }
    let cancelled = false;
    listCities({ countryId: countryIdWatch, activeOnly: true }).then((rows) => {
      if (!cancelled) setCities(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [countryIdWatch]);

  useEffect(() => {
    if (mode !== "view" || !row) {
      setHistory([]);
      return;
    }
    let cancelled = false;
    setLoadingHistory(true);
    listServiceProductStatusHistory(row.serviceProductId)
      .then((rows) => {
        if (!cancelled) setHistory(rows);
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(error instanceof ServiceProductStatusHistoryApiError ? error.message : "Failed to load status history");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, row]);

  async function onSubmit(values: FormValues) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    const payload = {
      serviceProductCode: values.serviceProductCode.trim(),
      serviceProductName: values.serviceProductName.trim(),
      serviceTypeId: serviceType.serviceTypeId,
      serviceProductClassificationId: values.serviceProductClassificationId,
      serviceProductCategoryId: values.serviceProductCategoryId,
      supplierId: values.supplierId,
      countryId: values.countryId,
      regionId: values.regionId,
      cityId: values.cityId,
      shortDescription: values.shortDescription || undefined,
      description: values.description || undefined,
      isOnlineSellable: values.isOnlineSellable,
      isFeatured: values.isFeatured,
      displayOrder: values.displayOrder,
      commonStatusId: values.commonStatusId,
      tenantId,
      companyId,
    };
    try {
      if (mode === "edit" && row) {
        await updateServiceProduct(row.serviceProductId, {
          ...payload,
          statusChangeRemarks: values.statusChangeRemarks || undefined,
          isActive: row.isActive,
          modifiedBy: userKey,
        });
        toast.success("Product updated");
      } else if (mode === "create") {
        await createServiceProduct({ ...payload, createdBy: userKey });
        toast.success("Product created");
      }
      await onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof ServiceProductsApiError ? error.message : "Could not save product");
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">
            {mode === "create" ? "Add product" : mode === "edit" ? "Edit product" : "Product details"}
          </h2>
          <p className="text-sm text-muted-foreground">Under {serviceType.serviceTypeName}</p>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
        <div className="space-y-2">
          <Label htmlFor="serviceProductCode" required>
            Code
          </Label>
          <Input
            id="serviceProductCode"
            autoFocus={!isReadOnly}
            disabled={isReadOnly}
            placeholder="e.g. DOHA_DESERT_SAFARI"
            aria-invalid={!!errors.serviceProductCode}
            {...register("serviceProductCode")}
          />
          {errors.serviceProductCode && <p className="text-sm text-destructive">{errors.serviceProductCode.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="serviceProductName" required>
            Name
          </Label>
          <Input
            id="serviceProductName"
            disabled={isReadOnly}
            placeholder="e.g. Doha Desert Safari"
            aria-invalid={!!errors.serviceProductName}
            {...register("serviceProductName")}
          />
          {errors.serviceProductName && <p className="text-sm text-destructive">{errors.serviceProductName.message}</p>}
        </div>

        <div className="space-y-2">
          <Label required>Classification</Label>
          <Controller
            control={control}
            name="serviceProductClassificationId"
            render={({ field }) => (
              <Select value={field.value ? String(field.value) : ""} onValueChange={(v) => field.onChange(Number(v))} disabled={isReadOnly}>
                <SelectTrigger className="h-10 w-full min-w-0" aria-invalid={!!errors.serviceProductClassificationId}>
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value) return "Select classification";
                      return classifications.find((c) => String(c.serviceProductClassificationId) === value)?.classificationName ?? value;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {classifications.map((c) => (
                    <SelectItem key={c.serviceProductClassificationId} value={String(c.serviceProductClassificationId)}>
                      {c.classificationName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.serviceProductClassificationId && (
            <p className="text-sm text-destructive">{errors.serviceProductClassificationId.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Category</Label>
          <Controller
            control={control}
            name="serviceProductCategoryId"
            render={({ field }) => (
              <Select
                value={field.value == null ? NONE_OPTION : String(field.value)}
                onValueChange={(v) => field.onChange(!v || v === NONE_OPTION ? null : Number(v))}
                disabled={isReadOnly}
              >
                <SelectTrigger className="h-10 w-full min-w-0">
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value || value === NONE_OPTION) return "None";
                      return categories.find((c) => String(c.serviceProductCategoryId) === value)?.categoryName ?? "None";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_OPTION}>None</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.serviceProductCategoryId} value={String(c.serviceProductCategoryId)}>
                      {c.categoryName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label>Primary supplier</Label>
          <Controller
            control={control}
            name="supplierId"
            render={({ field }) => (
              <Select
                value={field.value == null ? NONE_OPTION : String(field.value)}
                onValueChange={(v) => field.onChange(!v || v === NONE_OPTION ? null : Number(v))}
                disabled={isReadOnly}
              >
                <SelectTrigger className="h-10 w-full min-w-0">
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value || value === NONE_OPTION) return "None";
                      return suppliers.find((s) => String(s.supplierKey) === value)?.name ?? "None";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_OPTION}>None</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.supplierKey} value={String(s.supplierKey)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label required>Status</Label>
          <Controller
            control={control}
            name="commonStatusId"
            render={({ field }) => (
              <Select value={field.value ? String(field.value) : ""} onValueChange={(v) => field.onChange(Number(v))} disabled={isReadOnly}>
                <SelectTrigger className="h-10 w-full min-w-0" aria-invalid={!!errors.commonStatusId}>
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value) return "Select status";
                      return statuses.find((s) => String(s.commonStatusId) === value)?.statusName ?? value;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s.commonStatusId} value={String(s.commonStatusId)}>
                      {s.statusName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.commonStatusId && <p className="text-sm text-destructive">{errors.commonStatusId.message}</p>}
        </div>

        {mode === "edit" && row && (
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="statusChangeRemarks">Status change remarks (optional)</Label>
            <Input id="statusChangeRemarks" placeholder="Only recorded if the status changes" {...register("statusChangeRemarks")} />
          </div>
        )}

        <div className="space-y-2">
          <Label>Country</Label>
          <Controller
            control={control}
            name="countryId"
            render={({ field }) => (
              <Select
                value={field.value == null ? NONE_OPTION : String(field.value)}
                onValueChange={(v) => {
                  field.onChange(!v || v === NONE_OPTION ? null : Number(v));
                  setValue("cityId", null);
                }}
                disabled={isReadOnly}
              >
                <SelectTrigger className="h-10 w-full min-w-0">
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value || value === NONE_OPTION) return "None";
                      return countries.find((c) => String(c.countryKey) === value)?.name ?? "None";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_OPTION}>None</SelectItem>
                  {countries.map((c) => (
                    <SelectItem key={c.countryKey} value={String(c.countryKey)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label>City</Label>
          <Controller
            control={control}
            name="cityId"
            render={({ field }) => (
              <Select
                value={field.value == null ? NONE_OPTION : String(field.value)}
                onValueChange={(v) => field.onChange(!v || v === NONE_OPTION ? null : Number(v))}
                disabled={isReadOnly || !countryIdWatch}
              >
                <SelectTrigger className="h-10 w-full min-w-0">
                  <SelectValue>
                    {(value: string | null) => {
                      if (!countryIdWatch) return "Select country first";
                      if (!value || value === NONE_OPTION) return "None";
                      return cities.find((c) => String(c.cityKey) === value)?.name ?? "None";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_OPTION}>None</SelectItem>
                  {cities.map((c) => (
                    <SelectItem key={c.cityKey} value={String(c.cityKey)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label>Region</Label>
          <Controller
            control={control}
            name="regionId"
            render={({ field }) => (
              <Select
                value={field.value == null ? NONE_OPTION : String(field.value)}
                onValueChange={(v) => field.onChange(!v || v === NONE_OPTION ? null : Number(v))}
                disabled={isReadOnly}
              >
                <SelectTrigger className="h-10 w-full min-w-0">
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value || value === NONE_OPTION) return "None";
                      return regions.find((r) => String(r.regionId) === value)?.regionName ?? "None";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_OPTION}>None</SelectItem>
                  {regions.map((r) => (
                    <SelectItem key={r.regionId} value={String(r.regionId)}>
                      {r.regionName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="displayOrder">Display order</Label>
          <Input id="displayOrder" type="number" min={0} disabled={isReadOnly} {...register("displayOrder")} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="shortDescription">Short description</Label>
          <Textarea id="shortDescription" rows={2} disabled={isReadOnly} {...register("shortDescription")} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">Full description</Label>
          <Textarea id="description" rows={4} disabled={isReadOnly} {...register("description")} />
        </div>

        <div className="flex items-center gap-4 pb-2 sm:col-span-2">
          <Controller
            control={control}
            name="isOnlineSellable"
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} disabled={isReadOnly} />
                Online sellable
              </label>
            )}
          />
          <Controller
            control={control}
            name="isFeatured"
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} disabled={isReadOnly} />
                Featured
              </label>
            )}
          />
        </div>

        {mode === "view" && row && (
          <div className="space-y-2">
            <Label>Active</Label>
            <div>
              <Badge variant={row.isActive ? "default" : "secondary"}>{row.isActive ? "active" : "inactive"}</Badge>
            </div>
          </div>
        )}

        {mode === "view" && row && (
          <div className="space-y-2 sm:col-span-2">
            <Label className="flex items-center gap-1.5">
              <History className="h-3.5 w-3.5" /> Status history
            </Label>
            {loadingHistory ? (
              <p className="text-xs text-muted-foreground">Loading…</p>
            ) : history.length === 0 ? (
              <p className="text-xs text-muted-foreground">No history yet.</p>
            ) : (
              <ul className="space-y-1.5 rounded-lg border border-border p-3 text-xs">
                {history.map((h) => (
                  <li key={h.serviceProductStatusHistoryId} className="flex items-center justify-between gap-2 text-muted-foreground">
                    <span>
                      {h.fromStatusName ?? "—"} → <span className="font-medium text-foreground">{h.toStatusName}</span>
                      {h.remarks ? ` — ${h.remarks}` : ""}
                    </span>
                    <span className="shrink-0">{new Date(h.changedDtTm).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
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

function ProductList({ roleDef }: { roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const activeTenantId = useTenantStore((s) => s.tenantId);
  const activeTenant = useTenantStore((s) => s.tenant);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [typeCounts, setTypeCounts] = useState<Map<number, number>>(new Map());
  const [classifications, setClassifications] = useState<ServiceProductClassification[]>([]);
  const [categories, setCategories] = useState<ServiceProductCategory[]>([]);
  const [statuses, setStatuses] = useState<CommonStatus[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [rows, setRows] = useState<ServiceProduct[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<ServiceProduct | undefined>();
  const [serviceTypeFilter, setServiceTypeFilter] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>("displayOrder");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const isSuperAdmin = roleDef.id === SUPER_ADMIN_ROLE_ID;
  const platformMode = isSuperAdmin && isPlatformMode(activeTenantId);
  const scopeTenantId = platformMode ? 0 : (user?.tenantKey ?? activeTenant.tenantKey ?? 0);

  const canEdit = can(roleDef, "serviceProduct", "edit");
  const canCreate = can(roleDef, "serviceProduct", "create");
  const canDelete = can(roleDef, "serviceProduct", "delete");
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;
  const companyKey = user?.companyKey ?? 0;

  const selectedServiceType = serviceTypes.find((t) => t.serviceTypeId === serviceTypeFilter);

  async function loadServiceTypes() {
    if (scopeTenantId <= 0) {
      setServiceTypes([]);
      setLoadingTypes(false);
      setLoadError(platformMode ? "Select a tenant workspace to manage products." : "Missing tenant scope.");
      return;
    }
    setLoadingTypes(true);
    setLoadError(null);
    try {
      const [typeRows, allProducts, statusTypeRows, supplierRows, countryRows, regionRows] = await Promise.all([
        listServiceTypes({ tenantId: scopeTenantId, activeOnly: true }),
        listServiceProducts({ tenantId: scopeTenantId }),
        listCommonStatusTypes({ tenantId: scopeTenantId, activeOnly: true }),
        listSuppliers({ tenantId: scopeTenantId, activeOnly: true }),
        listCountries({ activeOnly: true }),
        listRegions({ activeOnly: true }),
      ]);
      setServiceTypes(typeRows);
      setSuppliers(supplierRows);
      setCountries(countryRows);
      setRegions(regionRows);
      const counts = new Map<number, number>();
      for (const p of allProducts) {
        counts.set(p.serviceTypeId, (counts.get(p.serviceTypeId) ?? 0) + 1);
      }
      setTypeCounts(counts);
      setServiceTypeFilter((current) => {
        if (current && typeRows.some((t) => t.serviceTypeId === current)) return current;
        const withData = typeRows.find((t) => (counts.get(t.serviceTypeId) ?? 0) > 0);
        return withData?.serviceTypeId ?? typeRows[0]?.serviceTypeId ?? null;
      });

      const productStatusType = statusTypeRows.find((t) => t.statusTypeCode === "SERVICE_PRODUCT");
      if (productStatusType) {
        const statusRows = await listCommonStatuses({ tenantId: scopeTenantId, commonStatusTypeId: productStatusType.commonStatusTypeId, activeOnly: true });
        setStatuses(statusRows);
      } else {
        setStatuses([]);
      }
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
      setCategories([]);
      return;
    }
    setLoadingRows(true);
    try {
      const [productRows, classificationRows, categoryRows] = await Promise.all([
        listServiceProducts({ tenantId: scopeTenantId, serviceTypeId: serviceTypeFilter }),
        listServiceProductClassifications({ tenantId: scopeTenantId, serviceTypeId: serviceTypeFilter, activeOnly: true }),
        listServiceProductCategories({ tenantId: scopeTenantId, serviceTypeId: serviceTypeFilter, activeOnly: true }),
      ]);
      setRows(productRows);
      setClassifications(classificationRows);
      setCategories(categoryRows);
      setTypeCounts((prev) => {
        const next = new Map(prev);
        next.set(serviceTypeFilter, productRows.length);
        return next;
      });
    } catch (error) {
      toast.error(
        error instanceof ServiceProductsApiError ||
          error instanceof ServiceProductClassificationsApiError ||
          error instanceof ServiceProductCategoriesApiError
          ? error.message
          : "Failed to load products"
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
        (r) => r.serviceProductName.toLowerCase().includes(term) || r.serviceProductCode.toLowerCase().includes(term)
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

  async function toggleActive(row: ServiceProduct) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      await setServiceProductActive(row.serviceProductId, !row.isActive, userKey);
      await refreshRows();
      toast.success(row.isActive ? "Product deactivated" : "Product activated");
    } catch (error) {
      toast.error(error instanceof ServiceProductsApiError ? error.message : "Could not update status");
    }
  }

  async function removeRow(row: ServiceProduct) {
    try {
      await deleteServiceProduct(row.serviceProductId);
      await refreshRows();
      toast.success("Product deleted");
    } catch (error) {
      toast.error(error instanceof ServiceProductsApiError ? error.message : "Could not delete product");
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Service Product"
        description="The sellable product catalog — Transfer/Tour/Activity products, classified and optionally categorized."
        actions={
          canCreate && panelMode === "closed" && selectedServiceType && statuses.length > 0 ? (
            <Button
              onClick={() => {
                setTarget(undefined);
                setPanelMode("create");
              }}
              disabled={classifications.length === 0}
            >
              <Plus className="h-4 w-4" />
              Add product
            </Button>
          ) : undefined
        }
      />

      {loadError && <p className="text-sm text-destructive">{loadError}</p>}
      {loadingTypes && <p className="text-sm text-muted-foreground">Loading service types…</p>}
      {!loadingTypes && scopeTenantId > 0 && serviceTypes.length === 0 && (
        <EmptyState icon={Package} tone="muted" heading="No service types yet" description="Create a service type first under Admin → Product → Service Type." size="compact" />
      )}
      {!loadingTypes && serviceTypes.length > 0 && statuses.length === 0 && (
        <p className="text-sm text-destructive">
          No &ldquo;Service Product&rdquo; status lifecycle found — create statuses under Admin → Configuration → Common Status.
        </p>
      )}

      {!loadingTypes && serviceTypes.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select value={serviceTypeFilter ? String(serviceTypeFilter) : ""} onValueChange={(v) => setServiceTypeFilter(v ? Number(v) : null)}>
            <SelectTrigger className="w-56">
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
        <ProductPanel
          mode={panelMode}
          row={target}
          rows={rows}
          serviceType={selectedServiceType}
          classifications={classifications}
          categories={categories}
          suppliers={suppliers}
          countries={countries}
          regions={regions}
          statuses={statuses}
          userKey={userKey}
          tenantId={scopeTenantId}
          companyId={target?.companyId ?? companyKey}
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
            <Input placeholder="Search code or name…" value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9" />
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
            <p className="p-6 text-sm text-muted-foreground">Loading products…</p>
          ) : rows.length === 0 ? (
            <EmptyState icon={Package} tone="primary" heading="No products yet" description={`Add your first product under ${selectedServiceType.serviceTypeName}.`} size="compact" />
          ) : visible.length === 0 ? (
            <EmptyState icon={Search} tone="muted" heading="No matching products" description="Try a different search or status filter." size="compact" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead sortKey="serviceProductCode" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                    Code
                  </SortableTableHead>
                  <SortableTableHead sortKey="serviceProductName" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                    Name
                  </SortableTableHead>
                  <TableHead>Classification</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="w-20 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((row) => (
                  <TableRow key={row.serviceProductId}>
                    <TableCell className="font-mono text-xs font-medium">{row.serviceProductCode}</TableCell>
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-1.5">
                        {row.isFeatured && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
                        {row.serviceProductName}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.classificationName ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{row.supplierName ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{row.statusName ?? "—"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.isActive ? "default" : "secondary"}>{row.isActive ? "active" : "inactive"}</Badge>
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
                          {canDelete && <DropdownMenuItem onClick={() => void removeRow(row)}>Delete</DropdownMenuItem>}
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

export default function ServiceProductMasterPage() {
  return <AccessGate module="serviceProduct">{(roleDef) => <ProductList roleDef={roleDef} />}</AccessGate>;
}
