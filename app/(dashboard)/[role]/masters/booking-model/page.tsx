"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, BookMarked, Eye, Pencil, Power, PowerOff, Trash2, X, Search, Loader2 } from "lucide-react";
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
  listBookingModels,
  createBookingModel,
  updateBookingModel,
  setBookingModelActive,
  deleteBookingModel,
  BookingModelsApiError,
} from "@/lib/services/booking-models.service";
import { can } from "@/config/permissions";
import { SUPER_ADMIN_ROLE_ID } from "@/mock/data/roles";
import type { BookingModel, Company, RoleDef } from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";
type SortKey = "bookingModelName" | "bookingModelCode" | "displayOrder";
type StatusFilter = "all" | "active" | "inactive";

const ALL_COMPANIES = "all";

function useBookingModelSchema(rows: BookingModel[], currentId?: number) {
  return z.object({
    companyId: z.number().int().positive("Company is required"),
    bookingModelCode: z.string().trim().min(1, "Code is required").max(50, "Must be 50 characters or fewer"),
    bookingModelName: z.string().trim().min(1, "Name is required").max(100, "Must be 100 characters or fewer"),
    description: z.string().trim().max(500).optional().or(z.literal("")),
    displayOrder: z.preprocess((v) => (v === "" || v == null ? 0 : Number(v)), z.number().int().min(0)),
  }).superRefine((values, ctx) => {
    const duplicateCode = rows.some(
      (r) =>
        r.bookingModelId !== currentId &&
        r.companyId === values.companyId &&
        r.bookingModelCode.toLowerCase() === values.bookingModelCode.trim().toLowerCase()
    );
    if (duplicateCode) {
      ctx.addIssue({ code: "custom", path: ["bookingModelCode"], message: "This code already exists for the selected company" });
    }
    const duplicateName = rows.some(
      (r) =>
        r.bookingModelId !== currentId &&
        r.companyId === values.companyId &&
        r.bookingModelName.trim().toLowerCase() === values.bookingModelName.trim().toLowerCase()
    );
    if (duplicateName) {
      ctx.addIssue({ code: "custom", path: ["bookingModelName"], message: "This name already exists for the selected company" });
    }
  });
}

type FormValues = z.infer<ReturnType<typeof useBookingModelSchema>>;

function BookingModelPanel({
  mode,
  row,
  rows,
  companies,
  userKey,
  tenantId,
  onClose,
  onSaved,
}: {
  mode: Exclude<PanelMode, "closed">;
  row?: BookingModel;
  rows: BookingModel[];
  companies: Company[];
  userKey: number;
  tenantId: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const schema = useBookingModelSchema(rows, row?.bookingModelId);
  const isReadOnly = mode === "view";

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    values: {
      companyId: row?.companyId ?? companies[0]?.companyKey ?? 0,
      bookingModelCode: row?.bookingModelCode ?? "",
      bookingModelName: row?.bookingModelName ?? "",
      description: row?.description ?? "",
      displayOrder: row?.displayOrder ?? 0,
    },
  });

  function blankValues(): FormValues {
    return { companyId: companies[0]?.companyKey ?? 0, bookingModelCode: "", bookingModelName: "", description: "", displayOrder: 0 };
  }

  async function submit(values: FormValues, keepOpenForMore: boolean) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      if (mode === "edit" && row) {
        await updateBookingModel(row.bookingModelId, {
          bookingModelCode: values.bookingModelCode.trim(),
          bookingModelName: values.bookingModelName.trim(),
          description: values.description || undefined,
          displayOrder: values.displayOrder,
          tenantId,
          companyId: values.companyId,
          isActive: row.isActive,
          modifiedBy: userKey,
        });
        toast.success("Booking model updated");
        await onSaved();
        onClose();
      } else if (mode === "create") {
        await createBookingModel({
          bookingModelCode: values.bookingModelCode.trim(),
          bookingModelName: values.bookingModelName.trim(),
          description: values.description || undefined,
          displayOrder: values.displayOrder,
          tenantId,
          companyId: values.companyId,
          createdBy: userKey,
        });
        toast.success("Booking model created");
        await onSaved();
        if (keepOpenForMore) {
          reset(blankValues());
        } else {
          onClose();
        }
      }
    } catch (error) {
      toast.error(error instanceof BookingModelsApiError ? error.message : "Could not save booking model");
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <h2 className="text-base font-semibold">
          {mode === "create" ? "Add booking model" : mode === "edit" ? "Edit booking model" : "Booking model details"}
        </h2>
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
          <Label htmlFor="bookingModelCode" required>
            Code
          </Label>
          <Input
            id="bookingModelCode"
            autoFocus={!isReadOnly}
            disabled={isReadOnly}
            placeholder="e.g. TIME_SLOT"
            aria-invalid={!!errors.bookingModelCode}
            {...register("bookingModelCode")}
          />
          {errors.bookingModelCode && <p className="text-sm text-destructive">{errors.bookingModelCode.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="bookingModelName" required>
            Name
          </Label>
          <Input
            id="bookingModelName"
            disabled={isReadOnly}
            placeholder="e.g. Time Slot"
            aria-invalid={!!errors.bookingModelName}
            {...register("bookingModelName")}
          />
          {errors.bookingModelName && <p className="text-sm text-destructive">{errors.bookingModelName.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="displayOrder">Display order</Label>
          <Input id="displayOrder" type="number" min={0} disabled={isReadOnly} {...register("displayOrder")} />
        </div>

        <div className="col-span-2 space-y-1 sm:col-span-4">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" rows={2} disabled={isReadOnly} {...register("description")} />
        </div>

        {mode === "view" && row && (
          <div className="space-y-1">
            <Label>Status</Label>
            <div>
              <Badge variant={row.isActive ? "default" : "secondary"}>{row.isActive ? "active" : "inactive"}</Badge>
            </div>
          </div>
        )}

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

function BookingModelList({ roleDef }: { roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const activeTenantId = useTenantStore((s) => s.tenantId);
  const activeTenant = useTenantStore((s) => s.tenant);
  const [rows, setRows] = useState<BookingModel[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<BookingModel | undefined>();
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState<string>(ALL_COMPANIES);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>("displayOrder");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const isSuperAdmin = roleDef.id === SUPER_ADMIN_ROLE_ID;
  const platformMode = isSuperAdmin && isPlatformMode(activeTenantId);
  const scopeTenantId = platformMode ? 0 : (user?.tenantKey ?? activeTenant.tenantKey ?? 0);

  const canEdit = can(roleDef, "bookingModel", "edit");
  const canCreate = can(roleDef, "bookingModel", "create");
  const canDelete = can(roleDef, "bookingModel", "delete");
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  async function refresh() {
    if (scopeTenantId <= 0) {
      setRows([]);
      setCompanies([]);
      setLoading(false);
      setLoadError(platformMode ? "Select a tenant workspace to manage booking models." : "Missing tenant scope.");
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [rowsResult, companyRows] = await Promise.all([
        listBookingModels({ tenantId: scopeTenantId }),
        listCompanies({ tenantId: scopeTenantId, activeOnly: true }),
      ]);
      setRows(rowsResult);
      setCompanies(companyRows.filter((c) => c.companyKey > 0));
    } catch (error) {
      setLoadError(error instanceof BookingModelsApiError ? error.message : "Failed to load booking models");
      setRows([]);
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
    let result = rows;
    if (companyFilter !== ALL_COMPANIES) {
      const companyKey = Number(companyFilter);
      result = result.filter((r) => r.companyId === companyKey);
    }
    if (term) {
      result = result.filter(
        (r) => r.bookingModelName.toLowerCase().includes(term) || r.bookingModelCode.toLowerCase().includes(term)
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
  }, [rows, search, companyFilter, statusFilter, sortKey, sortDirection]);

  async function toggleActive(row: BookingModel) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      await setBookingModelActive(row.bookingModelId, !row.isActive, userKey);
      await refresh();
      toast.success(row.isActive ? "Booking model deactivated" : "Booking model activated");
    } catch (error) {
      toast.error(error instanceof BookingModelsApiError ? error.message : "Could not update status");
    }
  }

  async function removeRow(row: BookingModel) {
    try {
      await deleteBookingModel(row.bookingModelId);
      await refresh();
      toast.success("Booking model deleted");
    } catch (error) {
      toast.error(error instanceof BookingModelsApiError ? error.message : "Could not delete booking model");
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Booking Model"
        description="Booking models (Date, Time Slot, Request, …) are scoped to a company within the current tenant."
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
              Add booking model
            </Button>
          ) : undefined
        }
      />

      {loadError && <p className="text-sm text-destructive">{loadError}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading booking models…</p>}
      {!loading && scopeTenantId > 0 && companies.length === 0 && (
        <p className="text-sm text-muted-foreground">Create a company first before adding booking models.</p>
      )}

      {panelMode !== "closed" && scopeTenantId > 0 && (
        <BookingModelPanel
          mode={panelMode}
          row={target}
          rows={rows}
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

      {rows.length > 0 && (
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
        {!loading && rows.length === 0 && scopeTenantId > 0 ? (
          <EmptyState icon={BookMarked} tone="primary" heading="No booking models yet" description="Add your first booking model." size="compact" />
        ) : visible.length === 0 && !loading && scopeTenantId > 0 ? (
          <EmptyState icon={Search} tone="muted" heading="No matching booking models" description="Try a different search, company, or status filter." size="compact" />
        ) : scopeTenantId > 0 ? (
          <Table className="table-fixed border-collapse text-xs [&_th]:whitespace-normal [&_td]:whitespace-normal">
            <TableHeader>
              <TableRow>
                <SortableTableHead sortKey="bookingModelCode" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} className="w-[16%] px-2 py-1.5">
                  Code
                </SortableTableHead>
                <SortableTableHead sortKey="bookingModelName" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} className="w-[22%] px-2 py-1.5">
                  Name
                </SortableTableHead>
                <TableHead className="w-[22%] px-2 py-1.5">Company</TableHead>
                <SortableTableHead sortKey="displayOrder" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} className="w-[10%] px-2 py-1.5">
                  Order
                </SortableTableHead>
                <TableHead className="w-[12%] px-2 py-1.5">Status</TableHead>
                <TableHead className="w-[18%] px-2 py-1.5 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row) => (
                <TableRow key={row.bookingModelId}>
                  <TableCell className="px-2 py-1.5 font-mono font-medium leading-tight">{row.bookingModelCode}</TableCell>
                  <TableCell className="px-2 py-1.5 font-medium leading-tight">{row.bookingModelName}</TableCell>
                  <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">
                    {row.companyName ?? companies.find((c) => c.companyKey === row.companyId)?.name ?? `C${row.companyId}`}
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

export default function BookingModelMasterPage() {
  return <AccessGate module="bookingModel">{(roleDef) => <BookingModelList roleDef={roleDef} />}</AccessGate>;
}
