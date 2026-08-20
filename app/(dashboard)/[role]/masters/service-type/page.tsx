"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Tags, Eye, Pencil, Power, PowerOff, Trash2, X, Search, Loader2 } from "lucide-react";
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
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore, isPlatformMode } from "@/lib/store/tenant.store";
import { useUsersStore } from "@/lib/store/users.store";
import { listCompanies } from "@/lib/services/db-companies.service";
import {
  listServiceTypes,
  createServiceType,
  updateServiceType,
  setServiceTypeActive,
  deleteServiceType,
  ServiceTypesApiError,
} from "@/lib/services/service-types.service";
import { can } from "@/config/permissions";
import { SUPER_ADMIN_ROLE_ID } from "@/mock/data/roles";
import { ICONS, ICON_NAMES } from "@/lib/icon-registry";
import type { Company, RoleDef, ServiceType } from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";
type SortKey = "serviceTypeName" | "serviceTypeCode" | "displayOrder";
type StatusFilter = "all" | "active" | "inactive";

const ALL_COMPANIES = "all";

function useServiceTypeSchema(serviceTypes: ServiceType[], currentId?: number) {
  return z.object({
    companyId: z.number().int().positive("Company is required"),
    serviceTypeCode: z
      .string()
      .trim()
      .min(1, "Service type code is required")
      .max(50, "Must be 50 characters or fewer"),
    serviceTypeName: z
      .string()
      .trim()
      .min(1, "Service type name is required")
      .max(100, "Must be 100 characters or fewer"),
    description: z.string().trim().max(500).optional().or(z.literal("")),
    icon: z.string().trim().max(200).optional().or(z.literal("")),
    displayOrder: z.preprocess((v) => (v === "" || v == null ? 0 : Number(v)), z.number().int().min(0)),
  }).superRefine((values, ctx) => {
    const duplicateCode = serviceTypes.some(
      (t) =>
        t.serviceTypeId !== currentId &&
        t.companyId === values.companyId &&
        t.serviceTypeCode.toLowerCase() === values.serviceTypeCode.trim().toLowerCase()
    );
    if (duplicateCode) {
      ctx.addIssue({
        code: "custom",
        path: ["serviceTypeCode"],
        message: "This service type code already exists for the selected company",
      });
    }
    const duplicateName = serviceTypes.some(
      (t) =>
        t.serviceTypeId !== currentId &&
        t.companyId === values.companyId &&
        t.serviceTypeName.trim().toLowerCase() === values.serviceTypeName.trim().toLowerCase()
    );
    if (duplicateName) {
      ctx.addIssue({
        code: "custom",
        path: ["serviceTypeName"],
        message: "This service type name already exists for the selected company",
      });
    }
  });
}

type FormValues = z.infer<ReturnType<typeof useServiceTypeSchema>>;

function IconPreview({ name }: { name: string | undefined }) {
  const Icon = name ? ICONS[name] : undefined;
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-input bg-muted/40 text-muted-foreground">
      {Icon ? <Icon className="h-5 w-5" /> : <span className="text-xs">—</span>}
    </div>
  );
}

function ServiceTypePanel({
  mode,
  serviceType,
  serviceTypes,
  companies,
  userKey,
  tenantId,
  onClose,
  onSaved,
}: {
  mode: Exclude<PanelMode, "closed">;
  serviceType?: ServiceType;
  serviceTypes: ServiceType[];
  companies: Company[];
  userKey: number;
  tenantId: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const schema = useServiceTypeSchema(serviceTypes, serviceType?.serviceTypeId);
  const isReadOnly = mode === "view";

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
      companyId: serviceType?.companyId ?? companies[0]?.companyKey ?? 0,
      serviceTypeCode: serviceType?.serviceTypeCode ?? "",
      serviceTypeName: serviceType?.serviceTypeName ?? "",
      description: serviceType?.description ?? "",
      icon: serviceType?.icon ?? "",
      displayOrder: serviceType?.displayOrder ?? 0,
    },
  });

  const iconWatch = watch("icon");

  function blankValues(): FormValues {
    return { companyId: companies[0]?.companyKey ?? 0, serviceTypeCode: "", serviceTypeName: "", description: "", icon: "", displayOrder: 0 };
  }

  async function submit(values: FormValues, keepOpenForMore: boolean) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      if (mode === "edit" && serviceType) {
        await updateServiceType(serviceType.serviceTypeId, {
          serviceTypeCode: values.serviceTypeCode.trim(),
          serviceTypeName: values.serviceTypeName.trim(),
          description: values.description || undefined,
          icon: values.icon || undefined,
          displayOrder: values.displayOrder,
          tenantId,
          companyId: values.companyId,
          isActive: serviceType.isActive,
          modifiedBy: userKey,
        });
        toast.success("Service type updated");
        await onSaved();
        onClose();
      } else if (mode === "create") {
        await createServiceType({
          serviceTypeCode: values.serviceTypeCode.trim(),
          serviceTypeName: values.serviceTypeName.trim(),
          description: values.description || undefined,
          icon: values.icon || undefined,
          displayOrder: values.displayOrder,
          tenantId,
          companyId: values.companyId,
          createdBy: userKey,
        });
        toast.success("Service type created");
        await onSaved();
        if (keepOpenForMore) {
          reset(blankValues());
        } else {
          onClose();
        }
      }
    } catch (error) {
      toast.error(error instanceof ServiceTypesApiError ? error.message : "Could not save service type");
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">
            {mode === "create" ? "Add service type" : mode === "edit" ? "Edit service type" : "Service type details"}
          </h2>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit((values) => submit(values, false))} className="grid grid-cols-2 gap-3 sm:grid-cols-4" noValidate>
        <div className="col-span-2 space-y-1">
          <Label required>Company</Label>
          <Controller
            control={control}
            name="companyId"
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : ""}
                onValueChange={(v) => field.onChange(Number(v))}
                disabled={isReadOnly || mode === "edit"}
              >
                <SelectTrigger className="h-10 w-full max-w-full min-w-0" aria-invalid={!!errors.companyId}>
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value) return "Select company";
                      return companies.find((c) => String(c.companyKey) === value)?.name ?? value;
                    }}
                  </SelectValue>
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
          {errors.companyId && <p className="text-sm text-destructive">{errors.companyId.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="serviceTypeCode" required>
            Code
          </Label>
          <Input
            id="serviceTypeCode"
            autoFocus={!isReadOnly}
            disabled={isReadOnly}
            placeholder="e.g. HOTEL"
            aria-invalid={!!errors.serviceTypeCode}
            {...register("serviceTypeCode")}
          />
          {errors.serviceTypeCode && (
            <p className="text-sm text-destructive">{errors.serviceTypeCode.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="serviceTypeName" required>
            Name
          </Label>
          <Input
            id="serviceTypeName"
            disabled={isReadOnly}
            placeholder="e.g. Hotel"
            aria-invalid={!!errors.serviceTypeName}
            {...register("serviceTypeName")}
          />
          {errors.serviceTypeName && (
            <p className="text-sm text-destructive">{errors.serviceTypeName.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="displayOrder">Display order</Label>
          <Input id="displayOrder" type="number" min={0} disabled={isReadOnly} {...register("displayOrder")} />
        </div>

        {mode === "view" && serviceType && (
          <div className="space-y-1">
            <Label>Status</Label>
            <div>
              <Badge variant={serviceType.isActive ? "default" : "secondary"}>
                {serviceType.isActive ? "active" : "inactive"}
              </Badge>
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
              placeholder="e.g. BedDouble"
              list="service-type-icon-options"
              {...register("icon")}
            />
            <datalist id="service-type-icon-options">
              {ICON_NAMES.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>
          <p className="text-xs text-muted-foreground">Lucide icon name — start typing to see matches.</p>
        </div>

        {!isReadOnly && (
          <div className="col-span-2 flex items-center gap-2 sm:col-span-4">
            <Button type="submit" disabled={isSubmitting || companies.length === 0}>
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

function ServiceTypeList({ roleDef }: { roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const activeTenantId = useTenantStore((s) => s.tenantId);
  const activeTenant = useTenantStore((s) => s.tenant);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<ServiceType | undefined>();
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState<string>(ALL_COMPANIES);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>("displayOrder");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const isSuperAdmin = roleDef.id === SUPER_ADMIN_ROLE_ID;
  const platformMode = isSuperAdmin && isPlatformMode(activeTenantId);
  const scopeTenantId = platformMode ? 0 : (user?.tenantKey ?? activeTenant.tenantKey ?? 0);

  const canEdit = can(roleDef, "serviceType", "edit");
  const canCreate = can(roleDef, "serviceType", "create");
  const canDelete = can(roleDef, "serviceType", "delete");
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  async function refresh() {
    if (scopeTenantId <= 0) {
      setServiceTypes([]);
      setCompanies([]);
      setLoading(false);
      setLoadError(platformMode ? "Select a tenant workspace to manage service types." : "Missing tenant scope.");
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [typeRows, companyRows] = await Promise.all([
        listServiceTypes({ tenantId: scopeTenantId }),
        listCompanies({ tenantId: scopeTenantId, activeOnly: true }),
      ]);
      setServiceTypes(typeRows);
      setCompanies(companyRows.filter((c) => c.companyKey > 0));
    } catch (error) {
      setLoadError(error instanceof ServiceTypesApiError ? error.message : "Failed to load service types");
      setServiceTypes([]);
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
    let result = serviceTypes;
    if (companyFilter !== ALL_COMPANIES) {
      const companyKey = Number(companyFilter);
      result = result.filter((t) => t.companyId === companyKey);
    }
    if (term) {
      result = result.filter(
        (t) =>
          t.serviceTypeName.toLowerCase().includes(term) ||
          t.serviceTypeCode.toLowerCase().includes(term) ||
          (t.companyName ?? "").toLowerCase().includes(term)
      );
    }
    if (statusFilter === "active") result = result.filter((t) => t.isActive);
    if (statusFilter === "inactive") result = result.filter((t) => !t.isActive);
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
  }, [serviceTypes, search, companyFilter, statusFilter, sortKey, sortDirection]);

  async function toggleActive(row: ServiceType) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      await setServiceTypeActive(row.serviceTypeId, !row.isActive, userKey);
      await refresh();
      toast.success(row.isActive ? "Service type deactivated" : "Service type activated");
    } catch (error) {
      toast.error(error instanceof ServiceTypesApiError ? error.message : "Could not update status");
    }
  }

  async function removeRow(row: ServiceType) {
    try {
      await deleteServiceType(row.serviceTypeId);
      await refresh();
      toast.success("Service type deleted");
    } catch (error) {
      toast.error(error instanceof ServiceTypesApiError ? error.message : "Could not delete service type");
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Service Type"
        description="Service types (Flight, Hotel, Transfer, …) are scoped to a company within the current tenant."
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
              Add service type
            </Button>
          ) : undefined
        }
      />

      {loadError && <p className="text-sm text-destructive">{loadError}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading service types…</p>}
      {!loading && scopeTenantId > 0 && companies.length === 0 && (
        <p className="text-sm text-muted-foreground">Create a company first before adding service types.</p>
      )}

      {panelMode !== "closed" && scopeTenantId > 0 && (
        <ServiceTypePanel
          mode={panelMode}
          serviceType={target}
          serviceTypes={serviceTypes}
          companies={companies}
          userKey={userKey}
          tenantId={scopeTenantId}
          onSaved={refresh}
          onClose={() => {
            setPanelMode("closed");
            setTarget(undefined);
          }}
        />
      )}

      {serviceTypes.length > 0 && (
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
        {!loading && serviceTypes.length === 0 && scopeTenantId > 0 ? (
          <EmptyState
            icon={Tags}
            tone="primary"
            heading="No service types yet"
            description="Add your first service type (Flight, Hotel, Transfer, …) under a company."
            size="compact"
          />
        ) : visible.length === 0 && !loading && scopeTenantId > 0 ? (
          <EmptyState
            icon={Search}
            tone="muted"
            heading="No matching service types"
            description="Try a different search, company, or status filter."
            size="compact"
          />
        ) : scopeTenantId > 0 ? (
          <Table className="table-fixed border-collapse text-xs [&_th]:whitespace-normal [&_td]:whitespace-normal">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[8%] px-2 py-1.5">
                  <IconHeaderCell />
                </TableHead>
                <SortableTableHead
                  sortKey="serviceTypeCode"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                  className="w-[16%] px-2 py-1.5"
                >
                  Code
                </SortableTableHead>
                <SortableTableHead
                  sortKey="serviceTypeName"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                  className="w-[20%] px-2 py-1.5"
                >
                  Name
                </SortableTableHead>
                <TableHead className="w-[20%] px-2 py-1.5">Company</TableHead>
                <SortableTableHead
                  sortKey="displayOrder"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                  className="w-[8%] px-2 py-1.5"
                >
                  Order
                </SortableTableHead>
                <TableHead className="w-[12%] px-2 py-1.5">Status</TableHead>
                <TableHead className="w-[16%] px-2 py-1.5 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row) => (
                <TableRow key={row.serviceTypeId}>
                  <TableCell className="px-2 py-1.5">
                    <IconPreview name={row.icon ?? undefined} />
                  </TableCell>
                  <TableCell className="px-2 py-1.5 font-mono font-medium leading-tight">{row.serviceTypeCode}</TableCell>
                  <TableCell className="px-2 py-1.5 font-medium leading-tight">{row.serviceTypeName}</TableCell>
                  <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">
                    {row.companyName ??
                      companies.find((c) => c.companyKey === row.companyId)?.name ??
                      `C${row.companyId}`}
                  </TableCell>
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
        ) : null}
      </Card>
    </div>
  );
}

function IconHeaderCell() {
  return <span className="sr-only">Icon</span>;
}

export default function ServiceTypeMasterPage() {
  return <AccessGate module="serviceType">{(roleDef) => <ServiceTypeList roleDef={roleDef} />}</AccessGate>;
}
