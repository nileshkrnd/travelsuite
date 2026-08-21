"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Clock3, Eye, Pencil, Power, PowerOff, Trash2, X, Search, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useSessionStore } from "@/lib/store/session.store";
import { useUsersStore } from "@/lib/store/users.store";
import { listServiceProductAvailabilities } from "@/lib/services/service-product-availabilities.service";
import { listCommonStatusTypes } from "@/lib/services/common-status-types.service";
import { listCommonStatuses } from "@/lib/services/common-statuses.service";
import { listDayOfWeeks } from "@/lib/services/day-of-weeks.service";
import {
  listServiceProductSchedules,
  createServiceProductSchedule,
  updateServiceProductSchedule,
  setServiceProductScheduleActive,
  deleteServiceProductSchedule,
  ServiceProductSchedulesApiError,
} from "@/lib/services/service-product-schedules.service";
import { can } from "@/config/permissions";
import type { CommonStatus, DayOfWeek, RoleDef, ServiceProduct, ServiceProductAvailability, ServiceProductSchedule } from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";
type StatusFilter = "all" | "active" | "inactive";

const NONE = "none";
const timeField = z
  .string()
  .trim()
  .regex(/^\d{2}:\d{2}$/, "Use HH:MM")
  .optional()
  .or(z.literal(""));

const scheduleBaseSchema = z.object({
  dayOfWeekId: z.number().int().positive().nullable(),
  startTime: timeField,
  endTime: timeField,
  capacity: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().positive().nullable()),
  isAvailable: z.boolean(),
  commonStatusId: z.number().int().positive("Status is required"),
});

type FormValues = z.infer<typeof scheduleBaseSchema>;

function toMinutes(t?: string | null): number | null {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function timeRangesOverlap(aStart: number | null, aEnd: number | null, bStart: number | null, bEnd: number | null) {
  const aFrom = aStart ?? 0;
  const aTo = aEnd ?? 24 * 60;
  const bFrom = bStart ?? 0;
  const bTo = bEnd ?? 24 * 60;
  return aFrom < bTo && bFrom < aTo;
}

function useScheduleSchema(rows: ServiceProductSchedule[], currentId?: number) {
  return useMemo(
    () =>
      scheduleBaseSchema.superRefine((values, ctx) => {
        const startMin = toMinutes(values.startTime);
        const endMin = toMinutes(values.endTime);
        if (startMin != null && endMin != null && startMin >= endMin) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endTime"], message: "End time must be after start time" });
        }
        const duplicate = rows.find((r) => {
          if (currentId && r.serviceProductScheduleId === currentId) return false;
          if ((r.dayOfWeekId ?? null) !== (values.dayOfWeekId ?? null)) return false;
          return timeRangesOverlap(toMinutes(r.startTime), toMinutes(r.endTime), startMin, endMin);
        });
        if (duplicate) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["dayOfWeekId"],
            message: "A schedule already exists for this day with an overlapping time range",
          });
        }
      }),
    [rows, currentId]
  );
}

function blankScheduleValues(statuses: CommonStatus[]): FormValues {
  return {
    dayOfWeekId: null,
    startTime: "",
    endTime: "",
    capacity: null,
    isAvailable: true,
    commonStatusId: statuses.find((s) => s.isInitial)?.commonStatusId ?? statuses[0]?.commonStatusId ?? 0,
  };
}

function SchedulePanel({
  mode,
  row,
  rows,
  availability,
  statuses,
  days,
  userKey,
  onClose,
  onSaved,
}: {
  mode: Exclude<PanelMode, "closed">;
  row?: ServiceProductSchedule;
  rows: ServiceProductSchedule[];
  availability: ServiceProductAvailability;
  statuses: CommonStatus[];
  days: DayOfWeek[];
  userKey: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const isReadOnly = mode === "view";
  const scheduleSchema = useScheduleSchema(rows, row?.serviceProductScheduleId);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(scheduleSchema as any),
    values: {
      dayOfWeekId: row?.dayOfWeekId ?? null,
      startTime: row?.startTime ?? "",
      endTime: row?.endTime ?? "",
      capacity: row?.capacity ?? null,
      isAvailable: row?.isAvailable ?? true,
      commonStatusId: row?.commonStatusId ?? statuses.find((s) => s.isInitial)?.commonStatusId ?? statuses[0]?.commonStatusId ?? 0,
    },
  });

  async function submit(values: FormValues, keepOpenForMore: boolean) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    const payload = {
      serviceProductAvailabilityId: availability.serviceProductAvailabilityId,
      serviceProductId: availability.serviceProductId,
      serviceProductOptionId: availability.serviceProductOptionId,
      serviceProductVariantId: availability.serviceProductVariantId,
      dayOfWeekId: values.dayOfWeekId,
      startTime: values.startTime || null,
      endTime: values.endTime || null,
      capacity: values.capacity,
      isAvailable: values.isAvailable,
      commonStatusId: values.commonStatusId,
    };
    try {
      if (mode === "edit" && row) {
        await updateServiceProductSchedule(row.serviceProductScheduleId, { ...payload, isActive: row.isActive, modifiedBy: userKey });
        toast.success("Schedule updated");
      } else if (mode === "create") {
        await createServiceProductSchedule({ ...payload, createdBy: userKey });
        toast.success("Schedule created");
      }
      await onSaved();
      if (mode === "create" && keepOpenForMore) {
        reset(blankScheduleValues(statuses));
      } else {
        onClose();
      }
    } catch (error) {
      toast.error(error instanceof ServiceProductSchedulesApiError ? error.message : "Could not save schedule");
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">
            {mode === "create" ? "Add schedule" : mode === "edit" ? "Edit schedule" : "Schedule details"}
          </h2>
          <p className="text-sm text-muted-foreground">
            Under {availability.variantName ?? availability.optionName ?? availability.serviceProductName}
          </p>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit((values) => submit(values, false))} className="grid grid-cols-2 gap-3 sm:grid-cols-4" noValidate>
        <div className="space-y-1 sm:col-span-2">
          <Label>Day of week (optional)</Label>
          <Controller
            control={control}
            name="dayOfWeekId"
            render={({ field }) => (
              <Select value={field.value ? String(field.value) : NONE} onValueChange={(v) => field.onChange(!v || v === NONE ? null : Number(v))} disabled={isReadOnly}>
                <SelectTrigger className="h-10 w-full min-w-0" aria-invalid={!!errors.dayOfWeekId}>
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value || value === NONE) return "Every day";
                      return days.find((d) => String(d.dayOfWeekId) === value)?.dayOfWeekName ?? value;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Every day</SelectItem>
                  {days.map((d) => (
                    <SelectItem key={d.dayOfWeekId} value={String(d.dayOfWeekId)}>
                      {d.dayOfWeekName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.dayOfWeekId && <p className="text-sm text-destructive">{errors.dayOfWeekId.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="startTime">Start time</Label>
          <Input id="startTime" type="time" disabled={isReadOnly} aria-invalid={!!errors.startTime} {...register("startTime")} />
          {errors.startTime && <p className="text-sm text-destructive">{errors.startTime.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="endTime">End time</Label>
          <Input id="endTime" type="time" disabled={isReadOnly} aria-invalid={!!errors.endTime} {...register("endTime")} />
          {errors.endTime && <p className="text-sm text-destructive">{errors.endTime.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="capacity">Capacity</Label>
          <Input id="capacity" type="number" min={1} disabled={isReadOnly} {...register("capacity")} />
        </div>

        <div className="space-y-1">
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

        <div className="flex items-end pb-2">
          <Controller
            control={control}
            name="isAvailable"
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} disabled={isReadOnly} />
                Available
              </label>
            )}
          />
        </div>

        {mode === "view" && row && (
          <div className="space-y-1">
            <Label>Active</Label>
            <div>
              <Badge variant={row.isActive ? "default" : "secondary"}>{row.isActive ? "active" : "inactive"}</Badge>
            </div>
          </div>
        )}

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

export function ProductScheduleTab({ product, roleDef }: { product: ServiceProduct; roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const [availabilities, setAvailabilities] = useState<ServiceProductAvailability[]>([]);
  const [statuses, setStatuses] = useState<CommonStatus[]>([]);
  const [days, setDays] = useState<DayOfWeek[]>([]);
  const [availabilityCounts, setAvailabilityCounts] = useState<Map<number, number>>(new Map());
  const [rows, setRows] = useState<ServiceProductSchedule[]>([]);
  const [loadingAvailabilities, setLoadingAvailabilities] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<ServiceProductSchedule | undefined>();
  const [availabilityFilter, setAvailabilityFilter] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const canEdit = can(roleDef, "serviceProductSchedule", "edit");
  const canCreate = can(roleDef, "serviceProductSchedule", "create");
  const canDelete = can(roleDef, "serviceProductSchedule", "delete");
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  const selectedAvailability = availabilities.find((a) => a.serviceProductAvailabilityId === availabilityFilter);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listCommonStatusTypes({ tenantId: product.tenantId, activeOnly: true }), listDayOfWeeks({ activeOnly: true })]).then(
      async ([statusTypeRows, dayRows]) => {
        if (cancelled) return;
        setDays(dayRows);
        const productStatusType = statusTypeRows.find((t) => t.statusTypeCode === "SERVICE_PRODUCT");
        if (productStatusType) {
          const statusRows = await listCommonStatuses({ tenantId: product.tenantId, commonStatusTypeId: productStatusType.commonStatusTypeId, activeOnly: true });
          if (!cancelled) setStatuses(statusRows);
        }
      }
    );
    return () => {
      cancelled = true;
    };
  }, [product.tenantId]);

  useEffect(() => {
    let cancelled = false;
    setLoadingAvailabilities(true);
    Promise.all([
      listServiceProductAvailabilities({ serviceProductId: product.serviceProductId, activeOnly: true }),
      listServiceProductSchedules({ serviceProductId: product.serviceProductId }),
    ])
      .then(([availRows, allSchedules]) => {
        if (cancelled) return;
        setAvailabilities(availRows);
        const counts = new Map<number, number>();
        for (const s of allSchedules) counts.set(s.serviceProductAvailabilityId, (counts.get(s.serviceProductAvailabilityId) ?? 0) + 1);
        setAvailabilityCounts(counts);
        setAvailabilityFilter((current) =>
          current && availRows.some((a) => a.serviceProductAvailabilityId === current) ? current : (availRows[0]?.serviceProductAvailabilityId ?? null)
        );
      })
      .catch((error) => {
        if (!cancelled) toast.error(error instanceof ServiceProductSchedulesApiError ? error.message : "Failed to load availability windows");
      })
      .finally(() => {
        if (!cancelled) setLoadingAvailabilities(false);
      });
    return () => {
      cancelled = true;
    };
  }, [product.serviceProductId]);

  async function refreshRows() {
    if (!availabilityFilter) {
      setRows([]);
      return;
    }
    setLoadingRows(true);
    try {
      const rowsResult = await listServiceProductSchedules({ serviceProductAvailabilityId: availabilityFilter });
      setRows(rowsResult);
      setAvailabilityCounts((prev) => {
        const next = new Map(prev);
        next.set(availabilityFilter, rowsResult.length);
        return next;
      });
    } catch (error) {
      toast.error(error instanceof ServiceProductSchedulesApiError ? error.message : "Failed to load schedules");
      setRows([]);
    } finally {
      setLoadingRows(false);
    }
  }

  useEffect(() => {
    void refreshRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availabilityFilter]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    let result = rows;
    if (term) {
      result = result.filter((r) => (r.dayOfWeekName ?? "").toLowerCase().includes(term) || (r.startTime ?? "").includes(term));
    }
    if (statusFilter === "active") result = result.filter((r) => r.isActive);
    if (statusFilter === "inactive") result = result.filter((r) => !r.isActive);
    return result;
  }, [rows, search, statusFilter]);

  async function toggleActive(row: ServiceProductSchedule) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      await setServiceProductScheduleActive(row.serviceProductScheduleId, !row.isActive, userKey);
      await refreshRows();
      toast.success(row.isActive ? "Schedule deactivated" : "Schedule activated");
    } catch (error) {
      toast.error(error instanceof ServiceProductSchedulesApiError ? error.message : "Could not update status");
    }
  }

  async function removeRow(row: ServiceProductSchedule) {
    try {
      await deleteServiceProductSchedule(row.serviceProductScheduleId);
      await refreshRows();
      toast.success("Schedule deleted");
    } catch (error) {
      toast.error(error instanceof ServiceProductSchedulesApiError ? error.message : "Could not delete schedule");
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Schedule"
        description="Time slots / departures within an availability window — start/end time, capacity, applicable day."
        actions={
          canCreate && panelMode === "closed" && selectedAvailability && statuses.length > 0 ? (
            <Button onClick={() => { setTarget(undefined); setPanelMode("create"); }}>
              <Plus className="h-4 w-4" />
              Add schedule
            </Button>
          ) : undefined
        }
      />

      {loadingAvailabilities && <p className="text-sm text-muted-foreground">Loading availability windows…</p>}

      {!loadingAvailabilities && availabilities.length === 0 && (
        <EmptyState icon={Clock3} tone="muted" heading="No availability windows yet" description="Add an availability window on the Availability tab first." size="compact" />
      )}

      {availabilities.length > 0 && (
        <Select value={availabilityFilter ? String(availabilityFilter) : ""} onValueChange={(v) => setAvailabilityFilter(v ? Number(v) : null)}>
          <SelectTrigger className="w-72">
            <SelectValue>
              {(value: string | null) => {
                if (!value) return "Select availability window";
                const a = availabilities.find((a) => String(a.serviceProductAvailabilityId) === value);
                if (!a) return value;
                const label = a.variantName ?? a.optionName ?? "Whole product";
                return `${label} (${availabilityCounts.get(a.serviceProductAvailabilityId) ?? 0})`;
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {availabilities.map((a) => (
              <SelectItem key={a.serviceProductAvailabilityId} value={String(a.serviceProductAvailabilityId)}>
                {a.variantName ?? a.optionName ?? "Whole product"} ({availabilityCounts.get(a.serviceProductAvailabilityId) ?? 0})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {panelMode !== "closed" && selectedAvailability && (
        <SchedulePanel mode={panelMode} row={target} rows={rows} availability={selectedAvailability} statuses={statuses} days={days} userKey={userKey} onSaved={refreshRows} onClose={() => { setPanelMode("closed"); setTarget(undefined); }} />
      )}

      {selectedAvailability && rows.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search day or time…" value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9" />
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

      {selectedAvailability && (
        <Card>
          {loadingRows ? (
            <p className="p-6 text-sm text-muted-foreground">Loading schedules…</p>
          ) : rows.length === 0 ? (
            <EmptyState icon={Clock3} tone="primary" heading="No schedules yet" description="Add a time slot for this availability window." size="compact" />
          ) : visible.length === 0 ? (
            <EmptyState icon={Search} tone="muted" heading="No matching schedules" description="Try a different search or status filter." size="compact" />
          ) : (
            <Table className="table-fixed border-collapse text-xs [&_th]:h-auto [&_th]:whitespace-normal [&_td]:whitespace-normal">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[14%] px-2 py-1.5">Day</TableHead>
                  <TableHead className="w-[12%] px-2 py-1.5">Start</TableHead>
                  <TableHead className="w-[12%] px-2 py-1.5">End</TableHead>
                  <TableHead className="w-[12%] px-2 py-1.5">Capacity</TableHead>
                  <TableHead className="w-[16%] px-2 py-1.5">Status</TableHead>
                  <TableHead className="w-[12%] px-2 py-1.5">Active</TableHead>
                  <TableHead className="w-[22%] px-2 py-1.5 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((row) => (
                  <TableRow key={row.serviceProductScheduleId}>
                    <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">{row.dayOfWeekName ?? "Every day"}</TableCell>
                    <TableCell className="px-2 py-1.5 font-mono leading-tight">{row.startTime ?? "—"}</TableCell>
                    <TableCell className="px-2 py-1.5 font-mono leading-tight">{row.endTime ?? "—"}</TableCell>
                    <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">{row.capacity ?? "—"}</TableCell>
                    <TableCell className="px-2 py-1.5 leading-tight">
                      <Badge variant="outline" className="px-1.5 py-0 text-[11px]">{row.statusName ?? "—"}</Badge>
                    </TableCell>
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
      )}
    </div>
  );
}
