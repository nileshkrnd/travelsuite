"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import type { LucideIcon } from "lucide-react";
import { Plus, MoreHorizontal, X, Search, Loader2 } from "lucide-react";
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
import {
  TenantCompanyNameMasterApiError,
  createTenantCompanyNameService,
  type TenantCompanyNameEntity,
} from "@/lib/services/tenant-company-name-master.service";
import { can, type ModuleKey } from "@/config/permissions";
import { shouldLockSessionCompany } from "@/lib/session-company";
import { SUPER_ADMIN_ROLE_ID } from "@/mock/data/roles";
import type { Company, RoleDef } from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";
type StatusFilter = "all" | "active" | "inactive";

const ALL_COMPANIES = "all";

export type TenantCompanyNameMasterConfig = {
  moduleKey: ModuleKey;
  title: string;
  description: string;
  entityLabel: string;
  nameLabel: string;
  idField: string;
  nameField: string;
  apiPath: string;
  icon: LucideIcon;
  addButtonLabel: string;
};

export function TenantCompanyNameMasterPage({ config }: { config: TenantCompanyNameMasterConfig }) {
  return (
    <AccessGate module={config.moduleKey}>
      {(roleDef) => <MasterList roleDef={roleDef} config={config} />}
    </AccessGate>
  );
}

function MasterList({ roleDef, config }: { roleDef: RoleDef; config: TenantCompanyNameMasterConfig }) {
  const service = useMemo(
    () =>
      createTenantCompanyNameService({
        apiPath: config.apiPath,
        idField: config.idField,
        nameField: config.nameField,
      }),
    [config.apiPath, config.idField, config.nameField]
  );

  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const activeTenantId = useTenantStore((s) => s.tenantId);
  const activeTenant = useTenantStore((s) => s.tenant);
  const [rows, setRows] = useState<TenantCompanyNameEntity[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<TenantCompanyNameEntity | undefined>();
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState<string>(ALL_COMPANIES);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<"name" | "createdDtTm" | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const isSuperAdmin = roleDef.id === SUPER_ADMIN_ROLE_ID;
  const platformMode = isSuperAdmin && isPlatformMode(activeTenantId);
  const scopeTenantId = platformMode ? 0 : (user?.tenantKey ?? activeTenant.tenantKey ?? 0);
  const { locked: companyLocked, companyId: lockedCompanyId } = shouldLockSessionCompany(
    user,
    companies
  );

  const canEdit = can(roleDef, config.moduleKey, "edit");
  const canCreate = can(roleDef, config.moduleKey, "create");
  const canDelete = can(roleDef, config.moduleKey, "delete");
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;
  const Icon = config.icon;

  async function refresh() {
    if (scopeTenantId <= 0) {
      setRows([]);
      setCompanies([]);
      setLoading(false);
      setLoadError(
        platformMode
          ? `Select a tenant workspace to manage ${config.title.toLowerCase()}.`
          : "Missing tenant scope."
      );
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [dataRows, companyRows] = await Promise.all([
        service.list({ tenantId: scopeTenantId }),
        listCompanies({ tenantId: scopeTenantId, activeOnly: true }),
      ]);
      setRows(dataRows);
      setCompanies(companyRows.filter((c) => c.companyKey > 0));
    } catch (error) {
      setLoadError(
        error instanceof TenantCompanyNameMasterApiError
          ? error.message
          : `Failed to load ${config.title.toLowerCase()}`
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeTenantId]);

  function toggleSort(key: "name" | "createdDtTm") {
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
    if (companyLocked && lockedCompanyId != null) {
      result = result.filter((t) => t.companyId === lockedCompanyId);
    } else if (companyFilter !== ALL_COMPANIES) {
      const companyKey = Number(companyFilter);
      result = result.filter((t) => t.companyId === companyKey);
    }
    if (term) {
      result = result.filter(
        (t) =>
          String(t[config.nameField] ?? "")
            .toLowerCase()
            .includes(term) || (t.companyName ?? "").toLowerCase().includes(term)
      );
    }
    if (statusFilter === "active") result = result.filter((t) => t.isActive);
    if (statusFilter === "inactive") result = result.filter((t) => !t.isActive);
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const aVal = sortKey === "name" ? String(a[config.nameField] ?? "") : String(a.createdDtTm);
        const bVal = sortKey === "name" ? String(b[config.nameField] ?? "") : String(b.createdDtTm);
        const cmp = aVal.localeCompare(bVal);
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [
    rows,
    search,
    companyFilter,
    statusFilter,
    sortKey,
    sortDirection,
    companyLocked,
    lockedCompanyId,
    config.nameField,
  ]);

  async function toggleActive(row: TenantCompanyNameEntity) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      await service.setActive(Number(row[config.idField]), !row.isActive, userKey);
      await refresh();
      toast.success(row.isActive ? `${config.entityLabel} deactivated` : `${config.entityLabel} activated`);
    } catch (error) {
      toast.error(
        error instanceof TenantCompanyNameMasterApiError ? error.message : "Could not update status"
      );
    }
  }

  async function removeRow(row: TenantCompanyNameEntity) {
    try {
      await service.remove(Number(row[config.idField]));
      await refresh();
      toast.success(`${config.entityLabel} deleted`);
    } catch (error) {
      toast.error(
        error instanceof TenantCompanyNameMasterApiError
          ? error.message
          : `Could not delete ${config.entityLabel.toLowerCase()}`
      );
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={config.title}
        description={config.description}
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
              {config.addButtonLabel}
            </Button>
          ) : undefined
        }
      />

      {loadError && <p className="text-sm text-destructive">{loadError}</p>}
      {loading && (
        <p className="text-sm text-muted-foreground">Loading {config.title.toLowerCase()}…</p>
      )}
      {!loading && scopeTenantId > 0 && companies.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Create a company first before adding {config.title.toLowerCase()}.
        </p>
      )}

      {panelMode !== "closed" && scopeTenantId > 0 && (
        <MasterPanel
          mode={panelMode}
          row={target}
          rows={rows}
          companies={companies}
          userKey={userKey}
          tenantId={scopeTenantId}
          lockedCompanyId={companyLocked ? lockedCompanyId : null}
          config={config}
          service={service}
          onSaved={refresh}
          onClose={() => {
            setPanelMode("closed");
            setTarget(undefined);
          }}
        />
      )}

      {rows.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name…"
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
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter((value as StatusFilter) ?? "all")}
          >
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
        {!loading && rows.length === 0 && scopeTenantId > 0 ? (
          <EmptyState
            icon={Icon}
            tone="primary"
            heading={`No ${config.title.toLowerCase()} yet`}
            description={`Add your first ${config.entityLabel.toLowerCase()} under a company.`}
            size="compact"
          />
        ) : visible.length === 0 && !loading && scopeTenantId > 0 ? (
          <EmptyState
            icon={Search}
            tone="muted"
            heading={`No matching ${config.title.toLowerCase()}`}
            description="Try a different search, company, or status filter."
            size="compact"
          />
        ) : scopeTenantId > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Sr.</TableHead>
                <SortableTableHead
                  sortKey="name"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                >
                  Name
                </SortableTableHead>
                {!companyLocked && <TableHead>Company</TableHead>}
                <TableHead>Status</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row, index) => (
                <TableRow key={String(row[config.idField])}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-medium">{String(row[config.nameField] ?? "")}</TableCell>
                  {!companyLocked && (
                    <TableCell className="text-muted-foreground">
                      {row.companyName ??
                        companies.find((c) => c.companyKey === row.companyId)?.name ??
                        `C${row.companyId}`}
                    </TableCell>
                  )}
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

function MasterPanel({
  mode,
  row,
  rows,
  companies,
  userKey,
  tenantId,
  lockedCompanyId,
  config,
  service,
  onClose,
  onSaved,
}: {
  mode: Exclude<PanelMode, "closed">;
  row?: TenantCompanyNameEntity;
  rows: TenantCompanyNameEntity[];
  companies: Company[];
  userKey: number;
  tenantId: number;
  lockedCompanyId: number | null;
  config: TenantCompanyNameMasterConfig;
  service: ReturnType<typeof createTenantCompanyNameService>;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const isReadOnly = mode === "view";
  const companyLocked = lockedCompanyId != null && lockedCompanyId > 0;
  const currentId = row ? Number(row[config.idField]) : undefined;
  const defaultCompanyId = row?.companyId ?? lockedCompanyId ?? companies[0]?.companyKey ?? 0;
  const lockedCompanyName =
    companies.find((c) => c.companyKey === (row?.companyId ?? lockedCompanyId))?.name ?? null;

  const schema = useMemo(
    () =>
      z
        .object({
          companyId: z.number().int().positive("Company is required"),
          name: z.string().trim().min(1, `${config.nameLabel} is required`).max(100),
        })
        .superRefine((values, ctx) => {
          const duplicate = rows.some(
            (t) =>
              Number(t[config.idField]) !== currentId &&
              t.companyId === values.companyId &&
              String(t[config.nameField] ?? "")
                .toLowerCase() === values.name.trim().toLowerCase()
          );
          if (duplicate) {
            ctx.addIssue({
              code: "custom",
              path: ["name"],
              message: `This ${config.entityLabel.toLowerCase()} already exists for the selected company`,
            });
          }
        }),
    [rows, currentId, config]
  );

  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      companyId: defaultCompanyId,
      name: row ? String(row[config.nameField] ?? "") : "",
    },
  });

  async function onSubmit(values: FormValues) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      if (mode === "edit" && row) {
        await service.update(Number(row[config.idField]), {
          name: values.name.trim(),
          tenantId,
          companyId: values.companyId,
          isActive: row.isActive,
          modifiedBy: userKey,
        });
        toast.success(`${config.entityLabel} updated`);
      } else if (mode === "create") {
        await service.create({
          name: values.name.trim(),
          tenantId,
          companyId: values.companyId,
          createdBy: userKey,
        });
        toast.success(`${config.entityLabel} created`);
      }
      await onSaved();
      onClose();
    } catch (error) {
      toast.error(
        error instanceof TenantCompanyNameMasterApiError
          ? error.message
          : `Could not save ${config.entityLabel.toLowerCase()}`
      );
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">
            {mode === "create"
              ? `Add ${config.entityLabel.toLowerCase()}`
              : mode === "edit"
                ? `Edit ${config.entityLabel.toLowerCase()}`
                : `${config.entityLabel} details`}
          </h2>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
        {companyLocked || mode === "edit" || mode === "view" ? (
          <div className="space-y-2 sm:col-span-2">
            <Label>Company</Label>
            <Input value={lockedCompanyName ?? `Company #${defaultCompanyId}`} disabled readOnly />
            <input type="hidden" {...register("companyId", { valueAsNumber: true })} />
          </div>
        ) : (
          <div className="space-y-2 sm:col-span-2">
            <Label required>Company</Label>
            <Controller
              control={control}
              name="companyId"
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : ""}
                  onValueChange={(v) => field.onChange(Number(v))}
                  disabled={isReadOnly}
                >
                  <SelectTrigger
                    className="h-10 w-full max-w-full min-w-0"
                    aria-invalid={!!errors.companyId}
                  >
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
        )}

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="name" required>
            {config.nameLabel}
          </Label>
          <Input
            id="name"
            autoFocus={!isReadOnly}
            disabled={isReadOnly}
            aria-invalid={!!errors.name}
            {...register("name")}
          />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>

        {mode === "view" && row && (
          <div className="space-y-2 sm:col-span-2">
            <Label>Status</Label>
            <div>
              <Badge variant={row.isActive ? "default" : "secondary"}>
                {row.isActive ? "active" : "inactive"}
              </Badge>
            </div>
          </div>
        )}

        {!isReadOnly && (
          <div className="flex items-center gap-2 sm:col-span-2">
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
