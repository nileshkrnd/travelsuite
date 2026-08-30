"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { FileText, MoreHorizontal, Plus, Search, X } from "lucide-react";
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
import { useUsersStore } from "@/lib/store/users.store";
import { useTenantStore, isPlatformMode } from "@/lib/store/tenant.store";
import { resolveSessionCompanyKey } from "@/lib/session-company";
import {
  listAdditionalInfoTypes,
  createAdditionalInfoType,
  updateAdditionalInfoType,
  setAdditionalInfoTypeActive,
  deleteAdditionalInfoType,
  AdditionalInfoTypesApiError,
} from "@/lib/services/additional-info-types.service";
import { can } from "@/config/permissions";
import { SUPER_ADMIN_ROLE_ID } from "@/mock/data/roles";
import type { AdditionalInfoType, AdditionalInfoValueTypeCode, RoleDef } from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";
type StatusFilter = "all" | "active" | "inactive";
type SortKey = "infoTypeCode" | "infoTypeName" | "valueTypeCode" | "displayOrder";

const VALUE_TYPE_OPTIONS: { value: AdditionalInfoValueTypeCode; label: string }[] = [
  { value: "BOOLEAN", label: "Boolean" },
  { value: "TEXT", label: "Text" },
  { value: "NUMBER", label: "Number" },
  { value: "DATE", label: "Date" },
  { value: "TIME", label: "Time" },
  { value: "DATETIME", label: "Date & time" },
];

function valueTypeLabel(code: string) {
  return VALUE_TYPE_OPTIONS.find((o) => o.value === code)?.label ?? code;
}

function useSchema(rows: AdditionalInfoType[], currentId?: number) {
  return z.object({
    infoTypeCode: z
      .string()
      .trim()
      .min(1, "Info type code is required")
      .max(50, "Must be 50 characters or fewer")
      .refine(
        (value) =>
          !rows.some(
            (r) =>
              r.additionalInfoTypeId !== currentId &&
              r.infoTypeCode.toLowerCase() === value.trim().toLowerCase()
          ),
        "This additional info type code already exists"
      ),
    infoTypeName: z.string().trim().min(1, "Info type name is required").max(200, "Must be 200 characters or fewer"),
    description: z.string().trim().max(500).optional().or(z.literal("")),
    valueTypeCode: z.enum(["BOOLEAN", "TEXT", "NUMBER", "DATE", "TIME", "DATETIME"]),
    displayOrder: z.preprocess((v) => (v === "" || v == null ? 0 : Number(v)), z.number().int().min(0)),
  });
}

export default function AdditionalInfoTypeMasterPage() {
  return (
    <AccessGate module="additionalInfoType">
      {(roleDef) => <MasterList roleDef={roleDef} />}
    </AccessGate>
  );
}

function MasterList({ roleDef }: { roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const activeTenantId = useTenantStore((s) => s.tenantId);
  const [rows, setRows] = useState<AdditionalInfoType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<AdditionalInfoType | undefined>();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>("displayOrder");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const canEdit = can(roleDef, "additionalInfoType", "edit");
  const canCreate = can(roleDef, "additionalInfoType", "create");
  const canDelete = can(roleDef, "additionalInfoType", "delete");
  const actorKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;
  const isSuperAdmin = roleDef.id === SUPER_ADMIN_ROLE_ID;
  const platformMode = isSuperAdmin && isPlatformMode(activeTenantId);
  const scopeTenantId = platformMode ? 0 : (user?.tenantKey ?? 0);
  const scopeCompanyId = resolveSessionCompanyKey(user) ?? 0;
  const scopeReady = scopeTenantId > 0 && scopeCompanyId > 0;

  useEffect(() => {
    let cancelled = false;
    if (!scopeReady) {
      setRows([]);
      setLoading(false);
      setLoadError(platformMode ? "Select a tenant workspace to manage this master." : "Missing tenant or company scope.");
      return;
    }
    setLoading(true);
    setLoadError(null);
    listAdditionalInfoTypes({ tenantId: scopeTenantId, companyId: scopeCompanyId })
      .then((data) => {
        if (cancelled) return;
        setRows(data);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err instanceof AdditionalInfoTypesApiError ? err.message : "Failed to load");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [scopeTenantId, scopeCompanyId, scopeReady, platformMode]);

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
          r.infoTypeName.toLowerCase().includes(term) ||
          r.infoTypeCode.toLowerCase().includes(term) ||
          (r.description ?? "").toLowerCase().includes(term) ||
          r.valueTypeCode.toLowerCase().includes(term)
      );
    }
    if (statusFilter !== "all") {
      result = result.filter((r) => (statusFilter === "active" ? r.isActive : !r.isActive));
    }
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [rows, search, statusFilter, sortKey, sortDirection]);

  function upsertLocal(row: AdditionalInfoType) {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.additionalInfoTypeId === row.additionalInfoTypeId);
      return idx === -1 ? [...prev, row] : prev.map((r, i) => (i === idx ? row : r));
    });
  }

  async function toggleActive(row: AdditionalInfoType) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      const saved = await setAdditionalInfoTypeActive(row.additionalInfoTypeId, !row.isActive, actorKey);
      upsertLocal(saved);
      toast.success(saved.isActive ? "Activated" : "Deactivated");
    } catch (error) {
      toast.error(error instanceof AdditionalInfoTypesApiError ? error.message : "Could not update status");
    }
  }

  async function removeRow(row: AdditionalInfoType) {
    try {
      await deleteAdditionalInfoType(row.additionalInfoTypeId);
      setRows((prev) => prev.filter((r) => r.additionalInfoTypeId !== row.additionalInfoTypeId));
      toast.success("Additional info type deleted");
    } catch (error) {
      toast.error(error instanceof AdditionalInfoTypesApiError ? error.message : "Could not delete additional info type");
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Additional Info Type"
        description="Wheelchair access, confirmation at booking, minimum age and other typed product facts."
        actions={
          canCreate && panelMode === "closed" ? (
            <Button
              onClick={() => {
                setTarget(undefined);
                setPanelMode("create");
              }}
            >
              <Plus className="h-4 w-4" />
              Add additional info type
            </Button>
          ) : undefined
        }
      />

      {loadError && <p className="text-sm text-destructive">{loadError}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading additional info type…</p>}

      {panelMode !== "closed" && (
        <MasterPanel
          mode={panelMode}
          row={target}
          rows={rows}
          actorKey={actorKey}
          scopeTenantId={scopeTenantId}
          scopeCompanyId={scopeCompanyId}
          onSaved={upsertLocal}
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
        {!loading && rows.length === 0 ? (
          <EmptyState
            icon={FileText}
            tone="primary"
            heading="No additional info types yet"
            description="Add your first additional info type."
            size="compact"
          />
        ) : visible.length === 0 && !loading ? (
          <EmptyState
            icon={Search}
            tone="muted"
            heading="No matching additional info types"
            description="Try a different search term or status filter."
            size="compact"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Sr. No</TableHead>
                <SortableTableHead sortKey="infoTypeCode" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                  Code
                </SortableTableHead>
                <SortableTableHead sortKey="infoTypeName" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                  Name
                </SortableTableHead>
                <SortableTableHead sortKey="valueTypeCode" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                  Value type
                </SortableTableHead>
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
              {visible.map((row, index) => (
                <TableRow key={row.additionalInfoTypeId}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-mono text-sm">{row.infoTypeCode}</TableCell>
                  <TableCell className="font-medium">{row.infoTypeName}</TableCell>
                  <TableCell>{valueTypeLabel(row.valueTypeCode)}</TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">{row.displayOrder}</TableCell>
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
    </div>
  );
}

function MasterPanel({
  mode,
  row,
  rows,
  actorKey,
  scopeTenantId,
  scopeCompanyId,
  onSaved,
  onClose,
}: {
  mode: Exclude<PanelMode, "closed">;
  row?: AdditionalInfoType;
  rows: AdditionalInfoType[];
  actorKey: number;
  scopeTenantId: number;
  scopeCompanyId: number;
  onSaved: (row: AdditionalInfoType) => void;
  onClose: () => void;
}) {
  const isReadOnly = mode === "view";
  const schema = useSchema(rows, row?.additionalInfoTypeId);
  type FormValues = z.infer<typeof schema>;

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      infoTypeCode: row?.infoTypeCode ?? "",
      infoTypeName: row?.infoTypeName ?? "",
      description: row?.description ?? "",
      valueTypeCode: row?.valueTypeCode ?? "TEXT",
      displayOrder: row?.displayOrder ?? 0,
    },
  });

  async function onSubmit(values: FormValues) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again before saving.");
      return;
    }
    const payload = {
      infoTypeCode: values.infoTypeCode.trim().toUpperCase(),
      infoTypeName: values.infoTypeName.trim(),
      description: values.description?.trim() || null,
      valueTypeCode: values.valueTypeCode,
      displayOrder: values.displayOrder,
    };
    try {
      if (mode === "edit" && row) {
        const saved = await updateAdditionalInfoType(row.additionalInfoTypeId, {
          ...payload,
          isActive: row.isActive,
          modifiedBy: actorKey,
        });
        onSaved(saved);
        toast.success("Additional info type updated");
      } else if (mode === "create") {
        const created = await createAdditionalInfoType({
          ...payload,
          tenantId: scopeTenantId,
          companyId: scopeCompanyId,
          createdBy: actorKey,
        });
        onSaved(created);
        toast.success("Additional info type created");
      }
      onClose();
    } catch (error) {
      toast.error(error instanceof AdditionalInfoTypesApiError ? error.message : "Could not save additional info type");
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <h2 className="text-base font-semibold">
          {mode === "create"
            ? "Add additional info type"
            : mode === "edit"
              ? "Edit additional info type"
              : "Additional info type details"}
        </h2>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
        <div className="space-y-2">
          <Label htmlFor="infoTypeCode" required>
            Info type code
          </Label>
          <Input
            id="infoTypeCode"
            autoFocus={!isReadOnly}
            disabled={isReadOnly}
            className="uppercase"
            placeholder="e.g. MIN_AGE, WHEELCHAIR"
            aria-invalid={!!errors.infoTypeCode}
            {...register("infoTypeCode")}
          />
          {errors.infoTypeCode && <p className="text-sm text-destructive">{errors.infoTypeCode.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="infoTypeName" required>
            Info type name
          </Label>
          <Input
            id="infoTypeName"
            disabled={isReadOnly}
            placeholder="e.g. Minimum age, Wheelchair accessible"
            aria-invalid={!!errors.infoTypeName}
            {...register("infoTypeName")}
          />
          {errors.infoTypeName && <p className="text-sm text-destructive">{errors.infoTypeName.message}</p>}
        </div>
        <div className="space-y-2">
          <Label required>Value type</Label>
          <Controller
            name="valueTypeCode"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={isReadOnly}>
                <SelectTrigger className="w-full" aria-invalid={!!errors.valueTypeCode}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VALUE_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.valueTypeCode && <p className="text-sm text-destructive">{errors.valueTypeCode.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="displayOrder">Display order</Label>
          <Input id="displayOrder" type="number" disabled={isReadOnly} {...register("displayOrder")} />
          {errors.displayOrder && <p className="text-sm text-destructive">{errors.displayOrder.message}</p>}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" disabled={isReadOnly} rows={3} {...register("description")} />
          {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
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
            <Button type="submit" disabled={isSubmitting}>
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
