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
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  listServiceProductLocationTypes,
  createServiceProductLocationType,
  updateServiceProductLocationType,
  setServiceProductLocationTypeActive,
  deleteServiceProductLocationType,
  ServiceProductLocationTypesApiError,
} from "@/lib/services/service-product-location-types.service";
import { useSessionStore } from "@/lib/store/session.store";
import { useUsersStore } from "@/lib/store/users.store";
import { can } from "@/config/permissions";
import type { RoleDef, ServiceProductLocationType } from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";
type SortKey = "locationTypeCode" | "locationTypeName" | "displayOrder";
type StatusFilter = "all" | "active" | "inactive";

const locationTypeBaseSchema = z.object({
  locationTypeCode: z.string().trim().min(1, "Code is required").max(50, "Must be 50 characters or fewer"),
  locationTypeName: z.string().trim().min(1, "Name is required").max(100, "Must be 100 characters or fewer"),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  isPickupLocation: z.boolean(),
  isDropoffLocation: z.boolean(),
  isMeetingPoint: z.boolean(),
  isDestination: z.boolean(),
  displayOrder: z.preprocess((v) => (v === "" || v == null ? 0 : Number(v)), z.number().int().min(0)),
});

function useLocationTypeSchema(rows: ServiceProductLocationType[], currentId?: number) {
  return useMemo(
    () =>
      locationTypeBaseSchema.superRefine((values, ctx) => {
        const codeDuplicate = rows.some(
          (r) =>
            r.serviceProductLocationTypeId !== currentId &&
            r.locationTypeCode.toLowerCase() === values.locationTypeCode.trim().toLowerCase()
        );
        if (codeDuplicate) {
          ctx.addIssue({ code: "custom", path: ["locationTypeCode"], message: "This code already exists" });
        }
        const nameDuplicate = rows.some(
          (r) =>
            r.serviceProductLocationTypeId !== currentId &&
            r.locationTypeName.toLowerCase() === values.locationTypeName.trim().toLowerCase()
        );
        if (nameDuplicate) {
          ctx.addIssue({ code: "custom", path: ["locationTypeName"], message: "This name already exists" });
        }
      }),
    [rows, currentId]
  );
}

type FormValues = z.infer<typeof locationTypeBaseSchema>;

function blankValues(): FormValues {
  return {
    locationTypeCode: "",
    locationTypeName: "",
    description: "",
    isPickupLocation: false,
    isDropoffLocation: false,
    isMeetingPoint: false,
    isDestination: false,
    displayOrder: 0,
  };
}

function LocationTypePanel({
  mode,
  row,
  rows,
  userKey,
  onClose,
  onSaved,
}: {
  mode: Exclude<PanelMode, "closed">;
  row?: ServiceProductLocationType;
  rows: ServiceProductLocationType[];
  userKey: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const schema = useLocationTypeSchema(rows, row?.serviceProductLocationTypeId);
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
      locationTypeCode: row?.locationTypeCode ?? "",
      locationTypeName: row?.locationTypeName ?? "",
      description: row?.description ?? "",
      isPickupLocation: row?.isPickupLocation ?? false,
      isDropoffLocation: row?.isDropoffLocation ?? false,
      isMeetingPoint: row?.isMeetingPoint ?? false,
      isDestination: row?.isDestination ?? false,
      displayOrder: row?.displayOrder ?? 0,
    },
  });

  async function submit(values: FormValues, keepOpenForMore: boolean) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    const payload = {
      locationTypeCode: values.locationTypeCode.trim(),
      locationTypeName: values.locationTypeName.trim(),
      description: values.description?.trim() || null,
      isPickupLocation: values.isPickupLocation,
      isDropoffLocation: values.isDropoffLocation,
      isMeetingPoint: values.isMeetingPoint,
      isDestination: values.isDestination,
      displayOrder: values.displayOrder,
    };
    try {
      if (mode === "edit" && row) {
        await updateServiceProductLocationType(row.serviceProductLocationTypeId, {
          ...payload,
          isActive: row.isActive,
          modifiedBy: userKey,
        });
        toast.success("Location type updated");
      } else if (mode === "create") {
        await createServiceProductLocationType({ ...payload, createdBy: userKey });
        toast.success("Location type created");
      }
      await onSaved();
      if (mode === "create" && keepOpenForMore) {
        reset(blankValues());
      } else {
        onClose();
      }
    } catch (error) {
      toast.error(error instanceof ServiceProductLocationTypesApiError ? error.message : "Could not save location type");
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <h2 className="text-base font-semibold">
          {mode === "create" ? "Add location type" : mode === "edit" ? "Edit location type" : "Location type details"}
        </h2>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit((values) => submit(values, false))} className="grid grid-cols-2 gap-3 sm:grid-cols-4" noValidate>
        <div className="space-y-1">
          <Label htmlFor="locationTypeCode" required>
            Code
          </Label>
          <Input
            id="locationTypeCode"
            autoFocus={!isReadOnly}
            disabled={isReadOnly}
            placeholder="e.g. PICKUP"
            aria-invalid={!!errors.locationTypeCode}
            {...register("locationTypeCode")}
          />
          {errors.locationTypeCode && <p className="text-sm text-destructive">{errors.locationTypeCode.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="locationTypeName" required>
            Name
          </Label>
          <Input
            id="locationTypeName"
            disabled={isReadOnly}
            placeholder="e.g. Pickup"
            aria-invalid={!!errors.locationTypeName}
            {...register("locationTypeName")}
          />
          {errors.locationTypeName && <p className="text-sm text-destructive">{errors.locationTypeName.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="displayOrder">Display order</Label>
          <Input id="displayOrder" type="number" min={0} disabled={isReadOnly} {...register("displayOrder")} />
        </div>

        {mode === "view" && row && (
          <div className="space-y-1">
            <Label>Status</Label>
            <div>
              <Badge variant={row.isActive ? "default" : "secondary"}>{row.isActive ? "active" : "inactive"}</Badge>
            </div>
          </div>
        )}

        <div className="space-y-1 sm:col-span-2 sm:col-start-1">
          <Label className="flex items-center gap-2 text-sm font-normal">
            <Controller
              control={control}
              name="isPickupLocation"
              render={({ field }) => (
                <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} disabled={isReadOnly} />
              )}
            />
            Pickup location
          </Label>
        </div>

        <div className="space-y-1 sm:col-span-2">
          <Label className="flex items-center gap-2 text-sm font-normal">
            <Controller
              control={control}
              name="isDropoffLocation"
              render={({ field }) => (
                <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} disabled={isReadOnly} />
              )}
            />
            Drop-off location
          </Label>
        </div>

        <div className="space-y-1 sm:col-span-2">
          <Label className="flex items-center gap-2 text-sm font-normal">
            <Controller
              control={control}
              name="isMeetingPoint"
              render={({ field }) => (
                <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} disabled={isReadOnly} />
              )}
            />
            Meeting point
          </Label>
        </div>

        <div className="space-y-1 sm:col-span-2">
          <Label className="flex items-center gap-2 text-sm font-normal">
            <Controller
              control={control}
              name="isDestination"
              render={({ field }) => (
                <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} disabled={isReadOnly} />
              )}
            />
            Represents destination
          </Label>
        </div>

        <div className="space-y-1 sm:col-span-4">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" rows={2} disabled={isReadOnly} {...register("description")} />
        </div>

        {!isReadOnly && (
          <div className="flex items-center gap-2 sm:col-span-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "edit" ? "Save" : "Create"}
            </Button>
            {mode === "create" && (
              <Button type="button" variant="secondary" disabled={isSubmitting} onClick={handleSubmit((values) => submit(values, true))}>
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Create & add more
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

function LocationTypeList({ roleDef }: { roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const [rows, setRows] = useState<ServiceProductLocationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<ServiceProductLocationType | undefined>();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>("displayOrder");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const canEdit = can(roleDef, "serviceProductLocationType", "edit");
  const canCreate = can(roleDef, "serviceProductLocationType", "create");
  const canDelete = can(roleDef, "serviceProductLocationType", "delete");
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  async function refresh() {
    setLoading(true);
    setLoadError(null);
    try {
      const rowsResult = await listServiceProductLocationTypes();
      setRows(rowsResult);
    } catch (error) {
      setLoadError(error instanceof ServiceProductLocationTypesApiError ? error.message : "Failed to load location types");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

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
        (r) => r.locationTypeName.toLowerCase().includes(term) || r.locationTypeCode.toLowerCase().includes(term)
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

  async function toggleActive(row: ServiceProductLocationType) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      await setServiceProductLocationTypeActive(row.serviceProductLocationTypeId, !row.isActive, userKey);
      await refresh();
      toast.success(row.isActive ? "Location type deactivated" : "Location type activated");
    } catch (error) {
      toast.error(error instanceof ServiceProductLocationTypesApiError ? error.message : "Could not update status");
    }
  }

  async function removeRow(row: ServiceProductLocationType) {
    try {
      await deleteServiceProductLocationType(row.serviceProductLocationTypeId);
      await refresh();
      toast.success("Location type deleted");
    } catch (error) {
      toast.error(error instanceof ServiceProductLocationTypesApiError ? error.message : "Could not delete location type");
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Service Product Location Type"
        description="Global lookup — Destination, Pickup, Drop-off, Meeting Point, Airport, Hotel, …"
        actions={
          canCreate && panelMode === "closed" ? (
            <Button
              onClick={() => {
                setTarget(undefined);
                setPanelMode("create");
              }}
            >
              <Plus className="h-4 w-4" />
              Add location type
            </Button>
          ) : undefined
        }
      />

      {loadError && <p className="text-sm text-destructive">{loadError}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading location types…</p>}

      {panelMode !== "closed" && (
        <LocationTypePanel
          mode={panelMode}
          row={target}
          rows={rows}
          userKey={userKey}
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

      <Card>
        {!loading && rows.length === 0 ? (
          <EmptyState icon={Tags} tone="primary" heading="No location types yet" description="Add your first location type." size="compact" />
        ) : visible.length === 0 && !loading ? (
          <EmptyState icon={Search} tone="muted" heading="No matching location types" description="Try a different search or status filter." size="compact" />
        ) : (
          <Table className="table-fixed border-collapse text-xs [&_th]:whitespace-normal [&_td]:whitespace-normal">
            <TableHeader>
              <TableRow>
                <SortableTableHead sortKey="locationTypeCode" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} className="w-[14%] px-2 py-1.5">
                  Code
                </SortableTableHead>
                <SortableTableHead sortKey="locationTypeName" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} className="w-[18%] px-2 py-1.5">
                  Name
                </SortableTableHead>
                <TableHead className="w-[28%] px-2 py-1.5">Flags</TableHead>
                <SortableTableHead sortKey="displayOrder" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} className="w-[10%] px-2 py-1.5">
                  Order
                </SortableTableHead>
                <TableHead className="w-[12%] px-2 py-1.5">Status</TableHead>
                <TableHead className="w-[18%] px-2 py-1.5 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row) => (
                <TableRow key={row.serviceProductLocationTypeId}>
                  <TableCell className="px-2 py-1.5 font-mono leading-tight font-medium">{row.locationTypeCode}</TableCell>
                  <TableCell className="px-2 py-1.5 leading-tight font-medium">{row.locationTypeName}</TableCell>
                  <TableCell className="px-2 py-1.5 leading-tight">
                    <div className="flex flex-wrap gap-1">
                      {row.isPickupLocation && <Badge variant="outline" className="px-1.5 py-0 text-[11px]">pickup</Badge>}
                      {row.isDropoffLocation && <Badge variant="outline" className="px-1.5 py-0 text-[11px]">dropoff</Badge>}
                      {row.isMeetingPoint && <Badge variant="outline" className="px-1.5 py-0 text-[11px]">meeting</Badge>}
                      {row.isDestination && <Badge variant="outline" className="px-1.5 py-0 text-[11px]">destination</Badge>}
                      {!row.isPickupLocation && !row.isDropoffLocation && !row.isMeetingPoint && !row.isDestination && (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">{row.displayOrder}</TableCell>
                  <TableCell className="px-2 py-1.5 leading-tight">
                    <Badge variant={row.isActive ? "default" : "secondary"} className="px-1.5 py-0 text-[11px]">{row.isActive ? "active" : "inactive"}</Badge>
                  </TableCell>
                  <TableCell className="px-2 py-1.5 text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      <Tooltip>
                        <TooltipTrigger render={<Button variant="ghost" size="icon-sm" aria-label="View" onClick={() => { setTarget(row); setPanelMode("view"); }} />}>
                          <Eye className="h-3.5 w-3.5" />
                        </TooltipTrigger>
                        <TooltipContent>View</TooltipContent>
                      </Tooltip>
                      {canEdit && (
                        <>
                          <Tooltip>
                            <TooltipTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Edit" onClick={() => { setTarget(row); setPanelMode("edit"); }} />}>
                              <Pencil className="h-3.5 w-3.5" />
                            </TooltipTrigger>
                            <TooltipContent>Edit</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger render={<Button variant="ghost" size="icon-sm" aria-label={row.isActive ? "Deactivate" : "Activate"} onClick={() => void toggleActive(row)} />}>
                              {row.isActive ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                            </TooltipTrigger>
                            <TooltipContent>{row.isActive ? "Deactivate" : "Activate"}</TooltipContent>
                          </Tooltip>
                        </>
                      )}
                      {canDelete && (
                        <Tooltip>
                          <TooltipTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Delete" onClick={() => void removeRow(row)} />}>
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
    </div>
  );
}

export default function ServiceProductLocationTypeMasterPage() {
  return <AccessGate module="serviceProductLocationType">{(roleDef) => <LocationTypeList roleDef={roleDef} />}</AccessGate>;
}
