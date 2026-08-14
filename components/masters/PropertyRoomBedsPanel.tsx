"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, BedSingle, Pencil, Power, PowerOff, Trash2, MoreHorizontal, X, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
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
import { listBedTypes } from "@/lib/services/bed-types.service";
import {
  listPropertyRoomTypeBeds,
  createPropertyRoomTypeBed,
  updatePropertyRoomTypeBed,
  setPropertyRoomTypeBedActive,
  deletePropertyRoomTypeBed,
  PropertyRoomTypeBedsApiError,
} from "@/lib/services/property-room-type-beds.service";
import type { BedType, PropertyRoom, PropertyRoomTypeBed } from "@/types";

const editSchema = z.object({
  bedTypeId: z.number().int().positive("Bed type is required"),
  bedCount: z.number().int().positive("Bed count must be at least 1"),
  isExtraBed: z.boolean(),
});
type EditFormValues = z.infer<typeof editSchema>;

let tempIdSeq = 0;
function nextTempId() {
  tempIdSeq += 1;
  return `pending-bed-${tempIdSeq}`;
}

interface BedRow {
  tempId: string;
  bedTypeId: number;
  bedCount: number;
  isExtraBed: boolean;
}

function emptyRow(): BedRow {
  return { tempId: nextTempId(), bedTypeId: 0, bedCount: 1, isExtraBed: false };
}

function BedEditForm({
  entry,
  bedTypes,
  onCancel,
  onSubmit,
}: {
  entry: PropertyRoomTypeBed;
  bedTypes: BedType[];
  onCancel: () => void;
  onSubmit: (values: EditFormValues) => Promise<void>;
}) {
  const {
    handleSubmit,
    control,
    register,
    formState: { errors, isSubmitting },
  } = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      bedTypeId: entry.bedTypeId,
      bedCount: entry.bedCount,
      isExtraBed: entry.isExtraBed,
    },
  });

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-start justify-between gap-4">
        <h3 className="text-sm font-semibold">Edit bed configuration</h3>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onCancel} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3 sm:grid-cols-3" noValidate>
        <div className="space-y-2">
          <Label required>Bed type</Label>
          <Controller
            control={control}
            name="bedTypeId"
            render={({ field }) => (
              <Select value={field.value ? String(field.value) : ""} onValueChange={(v) => field.onChange(Number(v))}>
                <SelectTrigger className="h-10 w-full" aria-invalid={!!errors.bedTypeId}>
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value) return "Select bed type";
                      return bedTypes.find((b) => String(b.bedTypeKey) === value)?.name ?? "Select bed type";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {bedTypes.map((b) => (
                    <SelectItem key={b.bedTypeKey} value={String(b.bedTypeKey)}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.bedTypeId && <p className="text-sm text-destructive">{errors.bedTypeId.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="bedCount" required>
            Bed count
          </Label>
          <Input id="bedCount" type="number" min={1} {...register("bedCount", { valueAsNumber: true })} />
          {errors.bedCount && <p className="text-sm text-destructive">{errors.bedCount.message}</p>}
        </div>
        <div className="flex items-end pb-2">
          <Controller
            control={control}
            name="isExtraBed"
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} />
                This is an extra bed
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

/** Add multiple bed configurations in one go — a row per bed type, saved together. */
function BedBatchAddForm({
  bedTypes,
  onCancel,
  onSubmit,
}: {
  bedTypes: BedType[];
  onCancel: () => void;
  onSubmit: (rows: BedRow[]) => Promise<void>;
}) {
  const [rows, setRows] = useState<BedRow[]>([emptyRow()]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateRow(tempId: string, patch: Partial<Omit<BedRow, "tempId">>) {
    setRows((prev) => prev.map((r) => (r.tempId === tempId ? { ...r, ...patch } : r)));
  }

  function removeRow(tempId: string) {
    setRows((prev) => prev.filter((r) => r.tempId !== tempId));
  }

  async function handleSubmit() {
    setSubmitError(null);
    const valid = rows.filter((r) => r.bedTypeId > 0 && r.bedCount > 0);
    if (valid.length === 0) {
      setSubmitError("Add at least one bed row with a bed type selected.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(valid);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-start justify-between gap-4">
        <h3 className="text-sm font-semibold">Add bed configurations</h3>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onCancel} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.tempId} className="flex items-start gap-3 rounded-lg border border-border p-3">
            <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-3">
              <Select
                value={row.bedTypeId ? String(row.bedTypeId) : ""}
                onValueChange={(v) => updateRow(row.tempId, { bedTypeId: Number(v) })}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value) return "Select bed type";
                      return bedTypes.find((b) => String(b.bedTypeKey) === value)?.name ?? "Select bed type";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {bedTypes.map((b) => (
                    <SelectItem key={b.bedTypeKey} value={String(b.bedTypeKey)}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min={1}
                placeholder="Bed count"
                value={row.bedCount}
                onChange={(e) => updateRow(row.tempId, { bedCount: Number(e.target.value) || 1 })}
              />
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={row.isExtraBed}
                  onCheckedChange={(v) => updateRow(row.tempId, { isExtraBed: !!v })}
                />
                Extra bed
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
          Save {rows.length > 1 ? `${rows.length} beds` : "bed"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}

/** Bed configurations list scoped to one property room (used on the room detail "Beds" tab). */
export function PropertyRoomBedsPanel({
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
  const [entries, setEntries] = useState<PropertyRoomTypeBed[]>([]);
  const [bedTypes, setBedTypes] = useState<BedType[]>([]);
  const [loading, setLoading] = useState(true);
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PropertyRoomTypeBed | undefined>();

  async function refresh() {
    setLoading(true);
    try {
      const [rows, types] = await Promise.all([
        listPropertyRoomTypeBeds({ propertyRoomId: room.propertyRoomKey }),
        listBedTypes({ activeOnly: true }),
      ]);
      setEntries(rows);
      setBedTypes(types);
    } catch (error) {
      toast.error(error instanceof PropertyRoomTypeBedsApiError ? error.message : "Failed to load bed configurations");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.propertyRoomKey]);

  async function handleBatchSubmit(rows: BedRow[]) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    let failures = 0;
    for (const row of rows) {
      try {
        await createPropertyRoomTypeBed({
          bedTypeId: row.bedTypeId,
          bedCount: row.bedCount,
          isExtraBed: row.isExtraBed,
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
      toast.success(`${rows.length} bed configuration${rows.length === 1 ? "" : "s"} added`);
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
      await updatePropertyRoomTypeBed(editTarget.propertyRoomTypeBedKey, { ...values, modifiedBy: actorKey });
      toast.success("Bed configuration updated");
      await refresh();
      setEditTarget(undefined);
    } catch (error) {
      toast.error(error instanceof PropertyRoomTypeBedsApiError ? error.message : "Could not save bed configuration");
    }
  }

  async function toggleStatus(entry: PropertyRoomTypeBed) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      await setPropertyRoomTypeBedActive(entry.propertyRoomTypeBedKey, !entry.isActive, actorKey);
      await refresh();
      toast.success(entry.isActive ? "Deactivated" : "Activated");
    } catch (error) {
      toast.error(error instanceof PropertyRoomTypeBedsApiError ? error.message : "Could not update status");
    }
  }

  async function removeEntry(entry: PropertyRoomTypeBed) {
    try {
      await deletePropertyRoomTypeBed(entry.propertyRoomTypeBedKey);
      await refresh();
      toast.success("Bed configuration removed");
    } catch (error) {
      toast.error(error instanceof PropertyRoomTypeBedsApiError ? error.message : "Could not remove configuration");
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading bed configurations…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">Bed configuration</p>
          <p className="text-sm text-muted-foreground">Which bed types and how many for this room type.</p>
        </div>
        {canCreate && !addFormOpen && !editTarget && (
          <Button onClick={() => setAddFormOpen(true)}>
            <Plus className="h-4 w-4" />
            Add beds
          </Button>
        )}
      </div>

      {addFormOpen && (
        <BedBatchAddForm bedTypes={bedTypes} onCancel={() => setAddFormOpen(false)} onSubmit={handleBatchSubmit} />
      )}

      {editTarget && (
        <BedEditForm
          entry={editTarget}
          bedTypes={bedTypes}
          onCancel={() => setEditTarget(undefined)}
          onSubmit={handleEditSubmit}
        />
      )}

      <Card>
        {entries.length === 0 ? (
          <EmptyState
            icon={BedSingle}
            tone="primary"
            heading="No bed configurations yet"
            description="Add bed types and counts for this room."
            size="compact"
            action={
              canCreate ? (
                <Button onClick={() => setAddFormOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Add beds
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Sr. No</TableHead>
                <TableHead>Bed type</TableHead>
                <TableHead>Count</TableHead>
                <TableHead>Extra bed</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry, index) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-medium">{entry.bedTypeName ?? `Bed type ${entry.bedTypeId}`}</TableCell>
                  <TableCell className="tabular-nums">{entry.bedCount}</TableCell>
                  <TableCell>{entry.isExtraBed ? "Yes" : "No"}</TableCell>
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
