"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Building, MoreHorizontal, Search, Loader2 } from "lucide-react";
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
import { listCompanies } from "@/lib/services/db-companies.service";
import { listPropertyTypes } from "@/lib/services/property-types.service";
import { createTenantCompanyNameService } from "@/lib/services/tenant-company-name-master.service";
import {
  listProperties,
  createProperty,
  updateProperty,
  setPropertyActive,
  deleteProperty,
  PropertiesApiError,
} from "@/lib/services/properties.service";
import { can } from "@/config/permissions";
import { shouldLockSessionCompany } from "@/lib/session-company";
import { SUPER_ADMIN_ROLE_ID } from "@/mock/data/roles";
import type { Company, Property, PropertyType, RoleDef } from "@/types";
import type { TenantCompanyNameEntity } from "@/lib/services/tenant-company-name-master.service";

type PanelMode = "closed" | "create" | "edit" | "view";
type SortKey = "propertyCode" | "createdDtTm";
type StatusFilter = "all" | "active" | "inactive";

const ALL_COMPANIES = "all";
const NONE = "__none__";

const categoriesApi = createTenantCompanyNameService({
  apiPath: "/api/property-categories",
  idField: "propertyCategoryId",
  nameField: "propertyCategoryName",
});
const usagesApi = createTenantCompanyNameService({
  apiPath: "/api/property-usages",
  idField: "propertyUsageId",
  nameField: "propertyUsageName",
});
const ownershipApi = createTenantCompanyNameService({
  apiPath: "/api/ownership-types",
  idField: "ownershipTypeId",
  nameField: "ownershipTypeName",
});
const brandsApi = createTenantCompanyNameService({
  apiPath: "/api/property-brands",
  idField: "propertyBrandId",
  nameField: "propertyBrandName",
});

function optionalId() {
  return z.preprocess(
    (v) => (v === "" || v === NONE || v === 0 || v == null ? null : Number(v)),
    z.number().int().positive().nullable()
  );
}

function usePropertySchema(properties: Property[], currentId?: number) {
  return z
    .object({
      companyId: z.number().int().positive("Company is required"),
      propertyCode: z.string().trim().min(1, "Property code is required").max(50),
      propertyTypeId: z.number().int().positive("Property type is required"),
      propertyCategoryId: optionalId(),
      propertyUsageId: optionalId(),
      ownershipTypeId: optionalId(),
      propertyBrandId: optionalId(),
      supplierId: z.preprocess(
        (v) => (v === "" || v == null ? null : Number(v)),
        z.number().int().positive().nullable()
      ),
      openingDate: z.string().optional().or(z.literal("")),
      closingDate: z.string().optional().or(z.literal("")),
      rating: z.preprocess(
        (v) => (v === "" || v == null ? null : Number(v)),
        z.number().min(0).max(9.99).nullable()
      ),
      starRating: z.preprocess(
        (v) => (v === "" || v == null ? null : Number(v)),
        z.number().int().min(0).max(7).nullable()
      ),
      isFeatured: z.boolean(),
      isPublished: z.boolean(),
    })
    .superRefine((values, ctx) => {
      const duplicate = properties.some(
        (p) =>
          p.propertyId !== currentId &&
          p.companyId === values.companyId &&
          p.propertyCode.toLowerCase() === values.propertyCode.trim().toLowerCase()
      );
      if (duplicate) {
        ctx.addIssue({
          code: "custom",
          path: ["propertyCode"],
          message: "This property code already exists for the selected company",
        });
      }
      if (values.openingDate && values.closingDate && values.closingDate < values.openingDate) {
        ctx.addIssue({
          code: "custom",
          path: ["closingDate"],
          message: "Closing date must be on or after opening date",
        });
      }
    });
}

type FormValues = z.infer<ReturnType<typeof usePropertySchema>>;

function PropertyPanel({
  mode,
  property,
  properties,
  companies,
  userKey,
  tenantId,
  lockedCompanyId,
  onSaved,
  onClose,
}: {
  mode: PanelMode;
  property?: Property;
  properties: Property[];
  companies: Company[];
  userKey: number;
  tenantId: number;
  lockedCompanyId: number | null;
  onSaved: () => Promise<void>;
  onClose: () => void;
}) {
  const isReadOnly = mode === "view";
  const schema = usePropertySchema(properties, property?.propertyId);
  const defaultCompanyId =
    property?.companyId ??
    lockedCompanyId ??
    companies[0]?.companyKey ??
    0;

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    defaultValues: {
      companyId: defaultCompanyId,
      propertyCode: property?.propertyCode ?? "",
      propertyTypeId: property?.propertyTypeId ?? 0,
      propertyCategoryId: property?.propertyCategoryId ?? null,
      propertyUsageId: property?.propertyUsageId ?? null,
      ownershipTypeId: property?.ownershipTypeId ?? null,
      propertyBrandId: property?.propertyBrandId ?? null,
      supplierId: property?.supplierId ?? null,
      openingDate: property?.openingDate ?? "",
      closingDate: property?.closingDate ?? "",
      rating: property?.rating ?? null,
      starRating: property?.starRating ?? null,
      isFeatured: property?.isFeatured ?? false,
      isPublished: property?.isPublished ?? false,
    },
  });

  const companyId = useWatch({ control, name: "companyId" });
  const [types, setTypes] = useState<PropertyType[]>([]);
  const [categories, setCategories] = useState<TenantCompanyNameEntity[]>([]);
  const [usages, setUsages] = useState<TenantCompanyNameEntity[]>([]);
  const [ownerships, setOwnerships] = useState<TenantCompanyNameEntity[]>([]);
  const [brands, setBrands] = useState<TenantCompanyNameEntity[]>([]);
  const [lookupsLoading, setLookupsLoading] = useState(false);

  useEffect(() => {
    if (!companyId || companyId <= 0) {
      setTypes([]);
      setCategories([]);
      setUsages([]);
      setOwnerships([]);
      setBrands([]);
      return;
    }
    let cancelled = false;
    setLookupsLoading(true);
    void (async () => {
      try {
        const [typeRows, catRows, usageRows, ownRows, brandRows] = await Promise.all([
          listPropertyTypes({ tenantId, companyId, activeOnly: true }),
          categoriesApi.list({ tenantId, companyId, activeOnly: true }),
          usagesApi.list({ tenantId, companyId, activeOnly: true }),
          ownershipApi.list({ tenantId, companyId, activeOnly: true }),
          brandsApi.list({ tenantId, companyId, activeOnly: true }),
        ]);
        if (cancelled) return;
        setTypes(typeRows);
        setCategories(catRows);
        setUsages(usageRows);
        setOwnerships(ownRows);
        setBrands(brandRows);
      } catch {
        if (!cancelled) toast.error("Failed to load property lookups");
      } finally {
        if (!cancelled) setLookupsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId, tenantId]);

  const companyLocked = lockedCompanyId != null;
  const companyName =
    companies.find((c) => c.companyKey === (property?.companyId ?? lockedCompanyId ?? companyId))
      ?.name ?? "";

  async function onSubmit(values: FormValues) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      const payload = {
        tenantId,
        companyId: values.companyId,
        propertyCode: values.propertyCode.trim(),
        propertyTypeId: values.propertyTypeId,
        propertyCategoryId: values.propertyCategoryId,
        propertyUsageId: values.propertyUsageId,
        ownershipTypeId: values.ownershipTypeId,
        propertyBrandId: values.propertyBrandId,
        supplierId: values.supplierId,
        openingDate: values.openingDate || null,
        closingDate: values.closingDate || null,
        rating: values.rating,
        starRating: values.starRating,
        isFeatured: values.isFeatured,
        isPublished: values.isPublished,
      };
      if (mode === "edit" && property) {
        await updateProperty(property.propertyId, {
          ...payload,
          isActive: property.isActive,
          modifiedBy: userKey,
        });
        toast.success("Property updated");
      } else {
        await createProperty({ ...payload, createdBy: userKey });
        toast.success("Property created");
      }
      await onSaved();
      onClose();
      reset();
    } catch (error) {
      toast.error(error instanceof PropertiesApiError ? error.message : "Could not save property");
    }
  }

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {mode === "create" ? "Add property" : mode === "edit" ? "Edit property" : "Property details"}
        </h2>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label required>Company</Label>
          {companyLocked || isReadOnly ? (
            <Input value={companyName} disabled />
          ) : (
            <Controller
              control={control}
              name="companyId"
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : ""}
                  onValueChange={(v) => {
                    const next = Number(v);
                    field.onChange(next);
                    setValue("propertyTypeId", 0);
                    setValue("propertyCategoryId", null);
                    setValue("propertyUsageId", null);
                    setValue("ownershipTypeId", null);
                    setValue("propertyBrandId", null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={String(c.companyKey)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          )}
          {errors.companyId && <p className="text-sm text-destructive">{errors.companyId.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="propertyCode" required>
            Property code
          </Label>
          <Input
            id="propertyCode"
            disabled={isReadOnly}
            aria-invalid={!!errors.propertyCode}
            {...register("propertyCode")}
          />
          {errors.propertyCode && (
            <p className="text-sm text-destructive">{errors.propertyCode.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label required>Property type</Label>
          <Controller
            control={control}
            name="propertyTypeId"
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : ""}
                onValueChange={(v) => field.onChange(Number(v))}
                disabled={isReadOnly || lookupsLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={lookupsLoading ? "Loading…" : "Select type"} />
                </SelectTrigger>
                <SelectContent>
                  {types.map((t) => (
                    <SelectItem key={t.propertyTypeId} value={String(t.propertyTypeId)}>
                      {t.propertyTypeName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.propertyTypeId && (
            <p className="text-sm text-destructive">{errors.propertyTypeId.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Category</Label>
          <Controller
            control={control}
            name="propertyCategoryId"
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : NONE}
                onValueChange={(v) => field.onChange(v === NONE ? null : Number(v))}
                disabled={isReadOnly || lookupsLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {categories.map((c) => (
                    <SelectItem
                      key={String(c.propertyCategoryId)}
                      value={String(c.propertyCategoryId)}
                    >
                      {String(c.propertyCategoryName)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label>Usage</Label>
          <Controller
            control={control}
            name="propertyUsageId"
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : NONE}
                onValueChange={(v) => field.onChange(v === NONE ? null : Number(v))}
                disabled={isReadOnly || lookupsLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {usages.map((u) => (
                    <SelectItem key={String(u.propertyUsageId)} value={String(u.propertyUsageId)}>
                      {String(u.propertyUsageName)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label>Ownership type</Label>
          <Controller
            control={control}
            name="ownershipTypeId"
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : NONE}
                onValueChange={(v) => field.onChange(v === NONE ? null : Number(v))}
                disabled={isReadOnly || lookupsLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {ownerships.map((o) => (
                    <SelectItem key={String(o.ownershipTypeId)} value={String(o.ownershipTypeId)}>
                      {String(o.ownershipTypeName)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label>Brand</Label>
          <Controller
            control={control}
            name="propertyBrandId"
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : NONE}
                onValueChange={(v) => field.onChange(v === NONE ? null : Number(v))}
                disabled={isReadOnly || lookupsLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {brands.map((b) => (
                    <SelectItem key={String(b.propertyBrandId)} value={String(b.propertyBrandId)}>
                      {String(b.propertyBrandName)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="supplierId">Supplier ID</Label>
          <Input
            id="supplierId"
            type="number"
            disabled={isReadOnly}
            placeholder="Optional"
            {...register("supplierId")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="openingDate">Opening date</Label>
          <Input id="openingDate" type="date" disabled={isReadOnly} {...register("openingDate")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="closingDate">Closing date</Label>
          <Input id="closingDate" type="date" disabled={isReadOnly} {...register("closingDate")} />
          {errors.closingDate && (
            <p className="text-sm text-destructive">{errors.closingDate.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="rating">Rating</Label>
          <Input
            id="rating"
            type="number"
            step="0.01"
            min={0}
            max={9.99}
            disabled={isReadOnly}
            placeholder="e.g. 4.50"
            {...register("rating")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="starRating">Star rating</Label>
          <Input
            id="starRating"
            type="number"
            min={0}
            max={7}
            disabled={isReadOnly}
            placeholder="e.g. 5"
            {...register("starRating")}
          />
        </div>

        <div className="flex flex-wrap items-center gap-6 sm:col-span-2 lg:col-span-3">
          <Controller
            control={control}
            name="isFeatured"
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={field.value}
                  disabled={isReadOnly}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                />
                Featured
              </label>
            )}
          />
          <Controller
            control={control}
            name="isPublished"
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={field.value}
                  disabled={isReadOnly}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                />
                Published
              </label>
            )}
          />
          {mode === "view" && property && (
            <Badge variant={property.isActive ? "default" : "secondary"}>
              {property.isActive ? "active" : "inactive"}
            </Badge>
          )}
        </div>

        {!isReadOnly && (
          <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-3">
            <Button type="submit" disabled={isSubmitting || companies.length === 0}>
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

function PropertyList({ roleDef }: { roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const activeTenantId = useTenantStore((s) => s.tenantId);
  const activeTenant = useTenantStore((s) => s.tenant);
  const [properties, setProperties] = useState<Property[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<Property | undefined>();
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState<string>(ALL_COMPANIES);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const isSuperAdmin = roleDef.id === SUPER_ADMIN_ROLE_ID;
  const platformMode = isSuperAdmin && isPlatformMode(activeTenantId);
  const scopeTenantId = platformMode ? 0 : (user?.tenantKey ?? activeTenant.tenantKey ?? 0);
  const { locked: companyLocked, companyId: lockedCompanyId } = shouldLockSessionCompany(
    user,
    companies
  );

  const canEdit = can(roleDef, "property", "edit");
  const canCreate = can(roleDef, "property", "create");
  const canDelete = can(roleDef, "property", "delete");
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  async function refresh() {
    if (scopeTenantId <= 0) {
      setProperties([]);
      setCompanies([]);
      setLoading(false);
      setLoadError(platformMode ? "Select a tenant workspace to manage properties." : "Missing tenant scope.");
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [rows, companyRows] = await Promise.all([
        listProperties({ tenantId: scopeTenantId }),
        listCompanies({ tenantId: scopeTenantId, activeOnly: true }),
      ]);
      setProperties(rows);
      setCompanies(companyRows.filter((c) => c.companyKey > 0));
    } catch (error) {
      setLoadError(error instanceof PropertiesApiError ? error.message : "Failed to load properties");
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeTenantId]);

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
    let result = properties;
    if (companyLocked && lockedCompanyId != null) {
      result = result.filter((p) => p.companyId === lockedCompanyId);
    } else if (companyFilter !== ALL_COMPANIES) {
      const companyKey = Number(companyFilter);
      result = result.filter((p) => p.companyId === companyKey);
    }
    if (term) {
      result = result.filter(
        (p) =>
          p.propertyCode.toLowerCase().includes(term) ||
          (p.propertyTypeName ?? "").toLowerCase().includes(term) ||
          (p.propertyBrandName ?? "").toLowerCase().includes(term) ||
          (p.companyName ?? "").toLowerCase().includes(term)
      );
    }
    if (statusFilter === "active") result = result.filter((p) => p.isActive);
    if (statusFilter === "inactive") result = result.filter((p) => !p.isActive);
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const cmp = String(a[sortKey]).localeCompare(String(b[sortKey]));
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [
    properties,
    search,
    companyFilter,
    statusFilter,
    sortKey,
    sortDirection,
    companyLocked,
    lockedCompanyId,
  ]);

  async function toggleActive(row: Property) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      await setPropertyActive(row.propertyId, !row.isActive, userKey);
      await refresh();
      toast.success(row.isActive ? "Property deactivated" : "Property activated");
    } catch (error) {
      toast.error(error instanceof PropertiesApiError ? error.message : "Could not update status");
    }
  }

  async function removeRow(row: Property) {
    try {
      await deleteProperty(row.propertyId);
      await refresh();
      toast.success("Property deleted");
    } catch (error) {
      toast.error(error instanceof PropertiesApiError ? error.message : "Could not delete property");
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Property"
        description="Properties are scoped to a company and linked to product masters (type, category, brand, etc.)."
        actions={
          canCreate && panelMode === "closed" && scopeTenantId > 0 ? (
            <Button
              onClick={() => {
                setTarget(undefined);
                setPanelMode("create");
              }}
              disabled={companies.length === 0}
            >
              <Plus className="h-4 w-4" />
              Add property
            </Button>
          ) : undefined
        }
      />

      {loadError && <p className="text-sm text-destructive">{loadError}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading properties…</p>}
      {!loading && scopeTenantId > 0 && companies.length === 0 && (
        <p className="text-sm text-muted-foreground">Create a company first before adding properties.</p>
      )}

      {panelMode !== "closed" && scopeTenantId > 0 && (
        <PropertyPanel
          mode={panelMode}
          property={target}
          properties={properties}
          companies={companies}
          userKey={userKey}
          tenantId={scopeTenantId}
          lockedCompanyId={companyLocked ? lockedCompanyId : null}
          onSaved={refresh}
          onClose={() => {
            setPanelMode("closed");
            setTarget(undefined);
          }}
        />
      )}

      {properties.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search code, type, brand…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-9"
            />
          </div>
          {!companyLocked && (
            <Select value={companyFilter} onValueChange={(v) => setCompanyFilter(v ?? ALL_COMPANIES)}>
              <SelectTrigger className="w-52">
                <SelectValue>
                  {(value: string | null) => {
                    if (!value || value === ALL_COMPANIES) return "All companies";
                    return companies.find((c) => String(c.companyKey) === value)?.name ?? value;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_COMPANIES}>All companies</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={String(c.companyKey)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
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

      <Card>
        {!loading && properties.length === 0 && scopeTenantId > 0 ? (
          <EmptyState
            icon={Building}
            tone="primary"
            heading="No properties yet"
            description="Add your first property under a company."
            size="compact"
          />
        ) : visible.length === 0 && !loading && scopeTenantId > 0 ? (
          <EmptyState
            icon={Search}
            tone="muted"
            heading="No matching properties"
            description="Try a different search, company, or status filter."
            size="compact"
          />
        ) : scopeTenantId > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Sr.</TableHead>
                <SortableTableHead
                  sortKey="propertyCode"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                >
                  Code
                </SortableTableHead>
                <TableHead>Type</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Stars</TableHead>
                <TableHead>Flags</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row, index) => (
                <TableRow key={row.propertyId}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-medium">{row.propertyCode}</TableCell>
                  <TableCell className="text-muted-foreground">{row.propertyTypeName ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{row.propertyBrandName ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{row.starRating ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {row.isFeatured && <Badge variant="secondary">Featured</Badge>}
                      {row.isPublished && <Badge variant="outline">Published</Badge>}
                      {!row.isFeatured && !row.isPublished && (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.companyName ??
                      companies.find((c) => c.companyKey === row.companyId)?.name ??
                      `C${row.companyId}`}
                  </TableCell>
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
        ) : null}
      </Card>
    </div>
  );
}

export default function PropertyMasterPage() {
  return <AccessGate module="property">{(roleDef) => <PropertyList roleDef={roleDef} />}</AccessGate>;
}
