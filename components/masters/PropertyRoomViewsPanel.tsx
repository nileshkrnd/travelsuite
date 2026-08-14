"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Mountain, Pencil, Power, PowerOff, Trash2, MoreHorizontal, X, Loader2, Check } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { listViewTypes } from "@/lib/services/view-types.service";
import {
  listPropertyRoomTypeViews,
  createPropertyRoomTypeView,
  updatePropertyRoomTypeView,
  setPropertyRoomTypeViewActive,
  deletePropertyRoomTypeView,
  PropertyRoomTypeViewsApiError,
} from "@/lib/services/property-room-type-views.service";
import type { PropertyRoom, PropertyRoomTypeView, ViewType } from "@/types";

const editSchema = z.object({
  viewTypeId: z.number().int().positive("View type is required"),
  isPrimary: z.boolean(),
});
type EditFormValues = z.infer<typeof editSchema>;

let tempIdSeq = 0;
function nextTempId() {
  tempIdSeq += 1;
  return `pending-view-${tempIdSeq}`;
}

interface ViewRow {
  tempId: string;
  viewTypeId: number;
}

function emptyRow(): ViewRow {
  return { tempId: nextTempId(), viewTypeId: 0 };
}

function ViewEditForm({
  entry,
  viewTypes,
  onCancel,
  onSubmit,
}: {
  entry: PropertyRoomTypeView;
  viewTypes: ViewType[];
  onCancel: () => void;
  onSubmit: (values: EditFormValues) => Promise<void>;
}) {
  const {
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      viewTypeId: entry.viewTypeId,
      isPrimary: entry.isPrimary,
    },
  });

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-start justify-between gap-4">
        <h3 className="text-sm font-semibold">Edit view</h3>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onCancel} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3 sm:grid-cols-3" noValidate>
        <div className="space-y-2 sm:col-span-2">
          <Label required>View type</Label>
          <Controller
            control={control}
            name="viewTypeId"
            render={({ field }) => (
              <Select value={field.value ? String(field.value) : ""} onValueChange={(v) => field.onChange(Number(v))}>
                <SelectTrigger className="h-10 w-full" aria-invalid={!!errors.viewTypeId}>
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value) return "Select view type";
                      return viewTypes.find((v) => String(v.viewTypeKey) === value)?.name ?? "Select view type";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {viewTypes.map((v) => (
                    <SelectItem key={v.viewTypeKey} value={String(v.viewTypeKey)}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.viewTypeId && <p className="text-sm text-destructive">{errors.viewTypeId.message}</p>}
        </div>
        <div className="flex items-end pb-2">
          <Controller
            control={control}
            name="isPrimary"
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} />
                Primary view
              </label>
            )}
          />
        </div>
        <div className="flex items-center gap-2 sm:col-span-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Save
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}

/** Add multiple views in one go — a row per view type, saved together, with one shared primary. */
function ViewBatchAddForm({
  viewTypes,
  onCancel,
  onSubmit,
}: {
  viewTypes: ViewType[];
  onCancel: () => void;
  onSubmit: (rows: ViewRow[], primaryTempId: string | null) => Promise<void>;
}) {
  const [rows, setRows] = useState<ViewRow[]>([emptyRow()]);
  const [primaryTempId, setPrimaryTempId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateRow(tempId: string, viewTypeId: number) {
    setRows((prev) => prev.map((r) => (r.tempId === tempId ? { ...r, viewTypeId } : r)));
  }

  function removeRow(tempId: string) {
    setRows((prev) => prev.filter((r) => r.tempId !== tempId));
    setPrimaryTempId((prev) => (prev === tempId ? null : prev));
  }

  async function handleSubmit() {
    setSubmitError(null);
    const valid = rows.filter((r) => r.viewTypeId > 0);
    if (valid.length === 0) {
      setSubmitError("Add at least one view row with a view type selected.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(valid, primaryTempId);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-start justify-between gap-4">
        <h3 className="text-sm font-semibold">Add views</h3>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onCancel} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.tempId} className="flex items-center gap-3 rounded-lg border border-border p-3">
            <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
              <Select
                value={row.viewTypeId ? String(row.viewTypeId) : ""}
                onValueChange={(v) => updateRow(row.tempId, Number(v))}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value) return "Select view type";
                      return viewTypes.find((v) => String(v.viewTypeKey) === value)?.name ?? "Select view type";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {viewTypes.map((v) => (
                    <SelectItem key={v.viewTypeKey} value={String(v.viewTypeKey)}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="primaryView"
                  checked={primaryTempId === row.tempId}
                  onChange={() => setPrimaryTempId(row.tempId)}
                />
                Primary view
              </label>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => removeRow(row.tempId)}
              aria-label="Remove row"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={() => setRows((prev) => [...prev, emptyRow()])}
      >
        <Plus className="h-3.5 w-3.5" />
        Add another row
      </Button>

      {submitError && <p className="mt-3 text-sm text-destructive">{submitError}</p>}

      <div className="mt-4 flex items-center gap-2">
        <Button type="button" disabled={submitting} onClick={() => void handleSubmit()}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Save {rows.length > 1 ? `${rows.length} views` : "view"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}

/** Room views list scoped to one property room (used on the room detail "Views" tab). */
export function PropertyRoomViewsPanel({
  room,
  canEdit,
  canCreate,
  canDelete,
}: {
  room: PropertyRoom;
  canEdit: boolean;
  canCreate: boolean;
  canDelete: boolean;
}) {
  const sessionUser = useSessionStore((s) => s.user);
  const actorKey = sessionUser?.userKey ?? 0;
  const [entries, setEntries] = useState<PropertyRoomTypeView[]>([]);
  const [viewTypes, setViewTypes] = useState<ViewType[]>([]);
  const [loading, setLoading] = useState(true);
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PropertyRoomTypeView | undefined>();

  async function refresh() {
    setLoading(true);
    try {
      const [rows, types] = await Promise.all([
        listPropertyRoomTypeViews({ propertyRoomId: room.propertyRoomKey }),
        listViewTypes({ activeOnly: true }),
      ]);
      setEntries(rows);
      setViewTypes(types);
    } catch (error) {
      toast.error(error instanceof PropertyRoomTypeViewsApiError ? error.message : "Failed to load views");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.propertyRoomKey]);

  async function handleBatchSubmit(rows: ViewRow[], primaryTempId: string | null) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    let failures = 0;
    for (const row of rows) {
      try {
        await createPropertyRoomTypeView({
          viewTypeId: row.viewTypeId,
          isPrimary: row.tempId === primaryTempId,
          propertyRoomId: room.propertyRoomKey,
          tenantId: room.tenantKey,
          companyId: room.companyKey,
          createdBy: actorKey,
        });
      } catch {
        failures += 1;
      }
    }
    if (failures === 0) {
      toast.success(`${rows.length} view${rows.length === 1 ? "" : "s"} added`);
    } else {
      toast.error(`${failures} of ${rows.length} rows could not be saved`);
    }
    await refresh();
    setAddFormOpen(false);
  }

  async function handleEditSubmit(values: EditFormValues) {
    if (!actorKey || !editTarget) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      await updatePropertyRoomTypeView(editTarget.propertyRoomTypeViewKey, { ...values, modifiedBy: actorKey });
      toast.success("View updated");
      await refresh();
      setEditTarget(undefined);
    } catch (error) {
      toast.error(error instanceof PropertyRoomTypeViewsApiError ? error.message : "Could not save view");
    }
  }

  async function toggleStatus(entry: PropertyRoomTypeView) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      await setPropertyRoomTypeViewActive(entry.propertyRoomTypeViewKey, !entry.isActive, actorKey);
      await refresh();
      toast.success(entry.isActive ? "Deactivated" : "Activated");
    } catch (error) {
      toast.error(error instanceof PropertyRoomTypeViewsApiError ? error.message : "Could not update status");
    }
  }

  async function removeEntry(entry: PropertyRoomTypeView) {
    try {
      await deletePropertyRoomTypeView(entry.propertyRoomTypeViewKey);
      await refresh();
      toast.success("View removed");
    } catch (error) {
      toast.error(error instanceof PropertyRoomTypeViewsApiError ? error.message : "Could not remove view");
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading views…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">Views</p>
          <p className="text-sm text-muted-foreground">Which views apply to this room type, with one primary.</p>
        </div>
        {canCreate && !addFormOpen && !editTarget && (
          <Button onClick={() => setAddFormOpen(true)}>
            <Plus className="h-4 w-4" />
            Add views
          </Button>
        )}
      </div>

      {addFormOpen && (
        <ViewBatchAddForm viewTypes={viewTypes} onCancel={() => setAddFormOpen(false)} onSubmit={handleBatchSubmit} />
      )}

      {editTarget && (
        <ViewEditForm
          entry={editTarget}
          viewTypes={viewTypes}
          onCancel={() => setEditTarget(undefined)}
          onSubmit={handleEditSubmit}
        />
      )}

      <Card>
        {entries.length === 0 ? (
          <EmptyState
            icon={Mountain}
            tone="primary"
            heading="No views yet"
            description="Add the views available for this room type."
            size="compact"
            action={
              canCreate ? (
                <Button onClick={() => setAddFormOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Add views
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Sr. No</TableHead>
                <TableHead>View type</TableHead>
                <TableHead>Primary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry, index) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-medium">{entry.viewTypeName ?? `View type ${entry.viewTypeId}`}</TableCell>
                  <TableCell>
                    {entry.isPrimary ? (
                      <Badge variant="default" className="gap-1">
                        <Check className="h-3 w-3" />
                        Primary
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={entry.isActive ? "default" : "secondary"}>
                      {entry.isActive ? "active" : "inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canEdit && (
                          <DropdownMenuItem
                            onClick={() => {
                              setAddFormOpen(false);
                              setEditTarget(entry);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                            Modify
                          </DropdownMenuItem>
                        )}
                        {canEdit && (
                          <DropdownMenuItem onClick={() => void toggleStatus(entry)}>
                            {entry.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                            {entry.isActive ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <DropdownMenuItem onClick={() => void removeEntry(entry)}>
                            <Trash2 className="h-4 w-4" />
                            Remove
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
