"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, BedDouble, Pencil, Power, PowerOff, Trash2, MoreHorizontal, X, Loader2 } from "lucide-react";
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
  listPropertyRoomTypeExtraBeds,
  createPropertyRoomTypeExtraBed,
  updatePropertyRoomTypeExtraBed,
  setPropertyRoomTypeExtraBedActive,
  deletePropertyRoomTypeExtraBed,
  PropertyRoomTypeExtraBedsApiError,
} from "@/lib/services/property-room-type-extra-beds.service";
import type { BedType, PropertyRoom, PropertyRoomTypeExtraBed } from "@/types";

const editSchema = z.object({
  extraBedTypeId: z.number().int().positive("Bed type is required"),
  maxQuantity: z.number().int().positive("Max quantity must be at least 1"),
  adultAllowed: z.boolean(),
  childAllowed: z.boolean(),
  isComplimentary: z.boolean(),
});
type EditFormValues = z.infer<typeof editSchema>;

let tempIdSeq = 0;
function nextTempId() {
  tempIdSeq += 1;
  return `pending-extrabed-${tempIdSeq}`;
}

interface ExtraBedRow {
  tempId: string;
  extraBedTypeId: number;
  maxQuantity: number;
  adultAllowed: boolean;
  childAllowed: boolean;
  isComplimentary: boolean;
}

function emptyRow(): ExtraBedRow {
  return {
    tempId: nextTempId(),
    extraBedTypeId: 0,
    maxQuantity: 1,
    adultAllowed: true,
    childAllowed: true,
    isComplimentary: false,
  };
}

function ExtraBedEditForm({
  entry,
  bedTypes,
  onCancel,
  onSubmit,
}: {
  entry: PropertyRoomTypeExtraBed;
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
      extraBedTypeId: entry.extraBedTypeId,
      maxQuantity: entry.maxQuantity,
      adultAllowed: entry.adultAllowed,
      childAllowed: entry.childAllowed,
      isComplimentary: entry.isComplimentary,
    },
  });

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-start justify-between gap-4">
        <h3 className="text-sm font-semibold">Edit extra bed policy</h3>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onCancel} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3 sm:grid-cols-3" noValidate>
        <div className="space-y-2">
          <Label required>Bed type</Label>
          <Controller
            control={control}
            name="extraBedTypeId"
            render={({ field }) => (
              <Select value={field.value ? String(field.value) : ""} onValueChange={(v) => field.onChange(Number(v))}>
                <SelectTrigger className="h-10 w-full" aria-invalid={!!errors.extraBedTypeId}>
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
          {errors.extraBedTypeId && <p className="text-sm text-destructive">{errors.extraBedTypeId.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxQuantity" required>
            Max quantity
          </Label>
          <Input id="maxQuantity" type="number" min={1} {...register("maxQuantity", { valueAsNumber: true })} />
          {errors.maxQuantity && <p className="text-sm text-destructive">{errors.maxQuantity.message}</p>}
        </div>
        <div className="flex flex-wrap items-end gap-3 pb-2">
          <Controller
            control={control}
            name="adultAllowed"
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} />
                Adult
              </label>
            )}
          />
          <Controller
            control={control}
            name="childAllowed"
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} />
                Child
              </label>
            )}
          />
          <Controller
            control={control}
            name="isComplimentary"
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} />
                Complimentary
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

/** Add multiple extra bed policies in one go — a row per bed type, saved together. */
function ExtraBedBatchAddForm({
  bedTypes,
  onCancel,
  onSubmit,
}: {
  bedTypes: BedType[];
  onCancel: () => void;
  onSubmit: (rows: ExtraBedRow[]) => Promise<void>;
}) {
  const [rows, setRows] = useState<ExtraBedRow[]>([emptyRow()]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateRow(tempId: string, patch: Partial<Omit<ExtraBedRow, "tempId">>) {
    setRows((prev) => prev.map((r) => (r.tempId === tempId ? { ...r, ...patch } : r)));
  }

  function removeRow(tempId: string) {
    setRows((prev) => prev.filter((r) => r.tempId !== tempId));
  }

  async function handleSubmit() {
    setSubmitError(null);
    const valid = rows.filter((r) => r.extraBedTypeId > 0 && r.maxQuantity > 0);
    if (valid.length === 0) {
      setSubmitError("Add at least one row with a bed type selected.");
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
        <h3 className="text-sm font-semibold">Add extra bed policies</h3>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onCancel} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.tempId} className="flex items-start gap-3 rounded-lg border border-border p-3">
            <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
              <Select
                value={row.extraBedTypeId ? String(row.extraBedTypeId) : ""}
                onValueChange={(v) => updateRow(row.tempId, { extraBedTypeId: Number(v) })}
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
                placeholder="Max quantity"
                value={row.maxQuantity}
                onChange={(e) => updateRow(row.tempId, { maxQuantity: Number(e.target.value) || 1 })}
              />
              <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={row.adultAllowed}
                    onCheckedChange={(v) => updateRow(row.tempId, { adultAllowed: !!v })}
                  />
                  Adult
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={row.childAllowed}
                    onCheckedChange={(v) => updateRow(row.tempId, { childAllowed: !!v })}
                  />
                  Child
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={row.isComplimentary}
                    onCheckedChange={(v) => updateRow(row.tempId, { isComplimentary: !!v })}
                  />
                  Complimentary
                </label>
              </div>
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
          Save {rows.length > 1 ? `${rows.length} extra beds` : "extra bed"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}

/** Extra-bed policies list scoped to one property room (used on the room detail "Extra Beds" tab). */
export function PropertyRoomExtraBedsPanel({
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
  const [entries, setEntries] = useState<PropertyRoomTypeExtraBed[]>([]);
  const [bedTypes, setBedTypes] = useState<BedType[]>([]);
  const [loading, setLoading] = useState(true);
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PropertyRoomTypeExtraBed | undefined>();

  async function refresh() {
    setLoading(true);
    try {
      const [rows, types] = await Promise.all([
        listPropertyRoomTypeExtraBeds({ propertyRoomId: room.propertyRoomKey }),
        listBedTypes({ activeOnly: true }),
      ]);
      setEntries(rows);
      setBedTypes(types);
    } catch (error) {
      toast.error(
        error instanceof PropertyRoomTypeExtraBedsApiError ? error.message : "Failed to load extra bed policies"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.propertyRoomKey]);

  async function handleBatchSubmit(rows: ExtraBedRow[]) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    let failures = 0;
    for (const row of rows) {
      try {
        await createPropertyRoomTypeExtraBed({
          extraBedTypeId: row.extraBedTypeId,
          maxQuantity: row.maxQuantity,
          adultAllowed: row.adultAllowed,
          childAllowed: row.childAllowed,
          isComplimentary: row.isComplimentary,
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
      toast.success(`${rows.length} extra bed polic${rows.length === 1 ? "y" : "ies"} added`);
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
      await updatePropertyRoomTypeExtraBed(editTarget.propertyRoomTypeExtraBedKey, {
        ...values,
        modifiedBy: actorKey,
      });
      toast.success("Extra bed policy updated");
      await refresh();
      setEditTarget(undefined);
    } catch (error) {
      toast.error(
        error instanceof PropertyRoomTypeExtraBedsApiError ? error.message : "Could not save extra bed policy"
      );
    }
  }

  async function toggleStatus(entry: PropertyRoomTypeExtraBed) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      await setPropertyRoomTypeExtraBedActive(entry.propertyRoomTypeExtraBedKey, !entry.isActive, actorKey);
      await refresh();
      toast.success(entry.isActive ? "Deactivated" : "Activated");
    } catch (error) {
      toast.error(error instanceof PropertyRoomTypeExtraBedsApiError ? error.message : "Could not update status");
    }
  }

  async function removeEntry(entry: PropertyRoomTypeExtraBed) {
    try {
      await deletePropertyRoomTypeExtraBed(entry.propertyRoomTypeExtraBedKey);
      await refresh();
      toast.success("Extra bed policy removed");
    } catch (error) {
      toast.error(error instanceof PropertyRoomTypeExtraBedsApiError ? error.message : "Could not remove policy");
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading extra bed policies…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">Extra beds</p>
          <p className="text-sm text-muted-foreground">Which extra bed types may be added, limits, and eligibility.</p>
        </div>
        {canCreate && !addFormOpen && !editTarget && (
          <Button onClick={() => setAddFormOpen(true)}>
            <Plus className="h-4 w-4" />
            Add extra beds
          </Button>
        )}
      </div>

      {addFormOpen && (
        <ExtraBedBatchAddForm
          bedTypes={bedTypes}
          onCancel={() => setAddFormOpen(false)}
          onSubmit={handleBatchSubmit}
        />
      )}

      {editTarget && (
        <ExtraBedEditForm
          entry={editTarget}
          bedTypes={bedTypes}
          onCancel={() => setEditTarget(undefined)}
          onSubmit={handleEditSubmit}
        />
      )}

      <Card>
        {entries.length === 0 ? (
          <EmptyState
            icon={BedDouble}
            tone="primary"
            heading="No extra bed policies yet"
            description="Define which extra beds can be added to this room type."
            size="compact"
            action={
              canCreate ? (
                <Button onClick={() => setAddFormOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Add extra beds
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
                <TableHead>Max qty</TableHead>
                <TableHead>Eligibility</TableHead>
                <TableHead>Complimentary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry, index) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-medium">
                    {entry.extraBedTypeName ?? `Bed type ${entry.extraBedTypeId}`}
                  </TableCell>
                  <TableCell className="tabular-nums">{entry.maxQuantity}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {entry.adultAllowed && <Badge variant="outline">Adult</Badge>}
                      {entry.childAllowed && <Badge variant="outline">Child</Badge>}
                      {!entry.adultAllowed && !entry.childAllowed && <span className="text-muted-foreground">—</span>}
                    </div>
                  </TableCell>
                  <TableCell>{entry.isComplimentary ? "Yes" : "No"}</TableCell>
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
