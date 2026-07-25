"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Globe, MoreHorizontal, X, Search, Loader2 } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { SortableTableHead, type SortDirection } from "@/components/shared/SortableTableHead";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { useTenantsStore } from "@/lib/store/tenants.store";
import { useCompaniesStore } from "@/lib/store/companies.store";
import { useUsersStore } from "@/lib/store/users.store";
import {
  listRegions,
  createRegion,
  updateRegion,
  deleteRegion,
  RegionsApiError,
} from "@/lib/services/regions.service";
import { can } from "@/config/permissions";
import type { Region, RoleDef } from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";
type SortKey = "regionCode" | "regionName" | "companyId" | "createdDtTm";

function useRegionSchema(regions: Region[], currentId?: number) {
  return z.object({
    companyId: z.number().int().positive("Company is required"),
    regionCode: z
      .string()
      .min(1, "Region code is required")
      .max(100, "Region code must be 100 characters or fewer")
      .refine(
        (value) =>
          !regions.some(
            (r) =>
              r.regionId !== currentId && r.regionCode.toLowerCase() === value.trim().toLowerCase()
          ),
        "This region code is already in use for the selected company list"
      ),
    regionName: z
      .string()
      .min(1, "Region name is required")
      .max(200, "Region name must be 200 characters or fewer"),
  });
}

type FormValues = z.infer<ReturnType<typeof useRegionSchema>>;

function RegionPanel({
  mode,
  region,
  regions,
  companies,
  tenantKey,
  userKey,
  onClose,
  onSaved,
}: {
  mode: Exclude<PanelMode, "closed">;
  region?: Region;
  regions: Region[];
  companies: { companyKey: number; name: string }[];
  tenantKey: number;
  userKey: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const schema = useRegionSchema(regions, region?.regionId);
  const isReadOnly = mode === "view";

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      companyId: region?.companyId ?? companies[0]?.companyKey ?? 0,
      regionCode: region?.regionCode ?? "",
      regionName: region?.regionName ?? "",
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      if (mode === "edit" && region) {
        await updateRegion(region.regionId, {
          tenantId: tenantKey,
          companyId: values.companyId,
          regionCode: values.regionCode.trim(),
          regionName: values.regionName.trim(),
          modifiedBy: userKey,
        });
        toast.success("Region updated");
      } else if (mode === "create") {
        await createRegion({
          tenantId: tenantKey,
          companyId: values.companyId,
          regionCode: values.regionCode.trim(),
          regionName: values.regionName.trim(),
          createdBy: userKey,
        });
        toast.success("Region created");
      }
      await onSaved();
      onClose();
    } catch (error) {
      const message = error instanceof RegionsApiError ? error.message : "Could not save region";
      toast.error(message);
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">
            {mode === "create" ? "Add region" : mode === "edit" ? "Edit region" : "Region details"}
          </h2>
          {mode === "view" && region && (
            <p className="text-sm text-muted-foreground">
              Created {new Date(region.createdDtTm).toLocaleString()}
              {region.modifiedDtTm ? ` · Modified ${new Date(region.modifiedDtTm).toLocaleString()}` : ""}
            </p>
          )}
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label>Company</Label>
          <Controller
            control={control}
            name="companyId"
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : undefined}
                onValueChange={(value) => field.onChange(Number(value))}
                disabled={isReadOnly || mode === "edit"}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.companyKey} value={String(c.companyKey)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.companyId && <p className="text-sm text-destructive">{errors.companyId.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="regionCode">Region code</Label>
          <Input
            id="regionCode"
            autoFocus={mode !== "view"}
            disabled={isReadOnly}
            aria-invalid={!!errors.regionCode}
            {...register("regionCode")}
          />
          {errors.regionCode && <p className="text-sm text-destructive">{errors.regionCode.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="regionName">Region name</Label>
          <Input
            id="regionName"
            disabled={isReadOnly}
            aria-invalid={!!errors.regionName}
            {...register("regionName")}
          />
          {errors.regionName && <p className="text-sm text-destructive">{errors.regionName.message}</p>}
        </div>

        {mode === "view" && region && (
          <>
            <div className="space-y-2">
              <Label>Created by (user key)</Label>
              <p className="text-sm tabular-nums">{region.createdBy}</p>
            </div>
            <div className="space-y-2">
              <Label>Modified by (user key)</Label>
              <p className="text-sm tabular-nums">{region.modifiedBy ?? "—"}</p>
            </div>
          </>
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

function RegionList({ roleDef }: { roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const tenant = useTenantStore((s) => s.tenant);
  const tenants = useTenantsStore((s) => s.tenants);
  const users = useUsersStore((s) => s.users);
  const allCompanies = useCompaniesStore((s) => s.companies);

  const tenantCompanies = useMemo(
    () =>
      allCompanies.filter((c) => c.tenantId === tenant.id && c.status === "active" && c.companyKey > 0),
    [allCompanies, tenant.id]
  );

  const resolvedTenantKey =
    tenants.find((t) => t.id === tenant.id)?.tenantKey ?? tenant.tenantKey ?? 0;
  const resolvedUserKey = user
    ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0)
    : 0;

  const [companyFilter, setCompanyFilter] = useState<number | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<Region | undefined>();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const canEdit = can(roleDef, "region", "edit");
  const canCreate = can(roleDef, "region", "create");
  const canDelete = can(roleDef, "region", "delete");
  const tenantKey = resolvedTenantKey;
  const userKey = resolvedUserKey;
  const activeCompanyKey = companyFilter ?? tenantCompanies[0]?.companyKey ?? null;

  useEffect(() => {
    if (!companyFilter && tenantCompanies[0]) {
      setCompanyFilter(tenantCompanies[0].companyKey);
    }
  }, [tenantCompanies, companyFilter]);

  async function refresh() {
    if (!tenantKey || !activeCompanyKey) {
      setRegions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const rows = await listRegions(tenantKey, activeCompanyKey);
      setRegions(rows);
    } catch (error) {
      const message = error instanceof RegionsApiError ? error.message : "Failed to load regions";
      setLoadError(message);
      setRegions([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh when scope changes
  }, [tenantKey, activeCompanyKey]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  const companyName = (companyId: number) =>
    tenantCompanies.find((c) => c.companyKey === companyId)?.name ?? String(companyId);

  const visibleRegions = useMemo(() => {
    const term = search.trim().toLowerCase();
    let result = regions;
    if (term) {
      result = result.filter(
        (r) =>
          r.regionCode.toLowerCase().includes(term) ||
          r.regionName.toLowerCase().includes(term) ||
          companyName(r.companyId).toLowerCase().includes(term)
      );
    }
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        const cmp =
          typeof av === "number" && typeof bv === "number"
            ? av - bv
            : String(av).localeCompare(String(bv));
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [regions, search, sortKey, sortDirection, tenantCompanies]);

  function openCreate() {
    setTarget(undefined);
    setPanelMode("create");
  }
  function openEdit(region: Region) {
    setTarget(region);
    setPanelMode("edit");
  }
  function openView(region: Region) {
    setTarget(region);
    setPanelMode("view");
  }
  function closePanel() {
    setPanelMode("closed");
    setTarget(undefined);
  }

  async function handleDelete(region: Region) {
    try {
      await deleteRegion(region.regionId, tenantKey, region.companyId);
      toast.success("Region deleted");
      await refresh();
    } catch (error) {
      const message = error instanceof RegionsApiError ? error.message : "Could not delete region";
      toast.error(message);
    }
  }

  if (!user || !userKey || !tenantKey) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Globe}
          tone="muted"
          heading="Missing workspace scope"
          description="Sign in again so TenantID and user key are available for Region master."
        />
      </div>
    );
  }

  if (tenantCompanies.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Globe}
          tone="muted"
          heading="No companies in this tenant"
          description="Create a company first, then add regions under it."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Region"
        description="PostgreSQL-backed region master scoped by TenantID and CompanyID."
        actions={
          canCreate && panelMode === "closed" ? (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add region
            </Button>
          ) : undefined
        }
      />

      {panelMode !== "closed" && (
        <RegionPanel
          mode={panelMode}
          region={target}
          regions={regions}
          companies={tenantCompanies}
          tenantKey={tenantKey}
          userKey={userKey}
          onClose={closePanel}
          onSaved={refresh}
        />
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select
          value={activeCompanyKey ? String(activeCompanyKey) : undefined}
          onValueChange={(value) => setCompanyFilter(Number(value))}
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Company" />
          </SelectTrigger>
          <SelectContent>
            {tenantCompanies.map((c) => (
              <SelectItem key={c.companyKey} value={String(c.companyKey)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by code or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
          />
        </div>
      </div>

      <Card>
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading regions…
          </div>
        ) : loadError ? (
          <EmptyState
            icon={Globe}
            tone="muted"
            heading="Could not load regions"
            description={loadError}
            size="compact"
            action={
              <Button variant="outline" onClick={() => void refresh()}>
                Retry
              </Button>
            }
          />
        ) : regions.length === 0 ? (
          <EmptyState
            icon={Globe}
            tone="primary"
            heading="No regions yet"
            description="Add your first region for this company."
            size="compact"
          />
        ) : visibleRegions.length === 0 ? (
          <EmptyState
            icon={Search}
            tone="muted"
            heading="No matching regions"
            description="Try a different search term."
            size="compact"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Sr. No</TableHead>
                <SortableTableHead
                  sortKey="regionCode"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                >
                  Code
                </SortableTableHead>
                <SortableTableHead
                  sortKey="regionName"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                >
                  Name
                </SortableTableHead>
                <SortableTableHead
                  sortKey="companyId"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                >
                  Company
                </SortableTableHead>
                <SortableTableHead
                  sortKey="createdDtTm"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                >
                  Created
                </SortableTableHead>
                <TableHead>Modified</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRegions.map((region, index) => (
                <TableRow key={region.regionId}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-medium">{region.regionCode}</TableCell>
                  <TableCell>{region.regionName}</TableCell>
                  <TableCell>{companyName(region.companyId)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(region.createdDtTm).toLocaleDateString()}
                    <span className="ms-1 text-xs">(#{region.createdBy})</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {region.modifiedDtTm
                      ? `${new Date(region.modifiedDtTm).toLocaleDateString()} (#${region.modifiedBy})`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openView(region)}>View</DropdownMenuItem>
                        {canEdit && (
                          <DropdownMenuItem onClick={() => openEdit(region)}>Edit</DropdownMenuItem>
                        )}
                        {canDelete && (
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => void handleDelete(region)}
                          >
                            Delete
                          </DropdownMenuItem>
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
    </div>
  );
}

export default function RegionMasterPage() {
  return <AccessGate module="region">{(roleDef) => <RegionList roleDef={roleDef} />}</AccessGate>;
}
