"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Plus,
  ImageIcon,
  Film,
  Pencil,
  Power,
  PowerOff,
  Trash2,
  MoreHorizontal,
  X,
  Loader2,
  Check,
} from "lucide-react";
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
import { RoomMediaUploadField } from "@/components/masters/RoomMediaUploadField";
import { RoomMediaMultiUploadField, type UploadedMediaFile } from "@/components/masters/RoomMediaMultiUploadField";
import { useSessionStore } from "@/lib/store/session.store";
import { listMediaTypes } from "@/lib/services/media-types.service";
import { listMediaCategories } from "@/lib/services/media-categories.service";
import {
  listPropertyRoomTypeMedia,
  createPropertyRoomTypeMedia,
  updatePropertyRoomTypeMedia,
  setPropertyRoomTypeMediaActive,
  deletePropertyRoomTypeMedia,
  PropertyRoomTypeMediaApiError,
} from "@/lib/services/property-room-type-media.service";
import type { MediaCategory, MediaType, PropertyRoom, PropertyRoomTypeMedia } from "@/types";

const editSchema = z.object({
  mediaTypeId: z.number().int().positive("Media type is required"),
  mediaCategoryId: z.number().int().positive("Media category is required"),
  mediaUrl: z.string().trim().min(1, "Upload a file first"),
  fileName: z.string().nullable(),
  fileType: z.string().nullable(),
  altText: z.string().trim().max(500).optional().or(z.literal("")),
  caption: z.string().trim().max(500).optional().or(z.literal("")),
  displayOrder: z.number().int(),
  isPrimary: z.boolean(),
});
type EditFormValues = z.infer<typeof editSchema>;

function isVideoUrl(url: string) {
  return /\.(mp4)$/i.test(url);
}

let tempIdSeq = 0;
function nextTempId() {
  tempIdSeq += 1;
  return `pending-${tempIdSeq}`;
}

interface PendingMediaItem extends UploadedMediaFile {
  tempId: string;
  caption: string;
  altText: string;
}

function MediaEditForm({
  entry,
  mediaTypes,
  mediaCategories,
  onCancel,
  onSubmit,
}: {
  entry: PropertyRoomTypeMedia;
  mediaTypes: MediaType[];
  mediaCategories: MediaCategory[];
  onCancel: () => void;
  onSubmit: (values: EditFormValues) => Promise<void>;
}) {
  const {
    handleSubmit,
    control,
    register,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      mediaTypeId: entry.mediaTypeId,
      mediaCategoryId: entry.mediaCategoryId,
      mediaUrl: entry.mediaUrl,
      fileName: entry.fileName,
      fileType: entry.fileType,
      altText: entry.altText ?? "",
      caption: entry.caption ?? "",
      displayOrder: entry.displayOrder,
      isPrimary: entry.isPrimary,
    },
  });

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-start justify-between gap-4">
        <h3 className="text-sm font-semibold">Edit media</h3>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onCancel} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3 sm:grid-cols-2" noValidate>
        <div className="sm:col-span-2">
          <Controller
            control={control}
            name="mediaUrl"
            render={({ field }) => (
              <RoomMediaUploadField
                id="mediaUrl"
                label="File"
                required
                mediaUrl={field.value}
                fileName={entry.fileName}
                onChange={(url, name, type) => {
                  setValue("mediaUrl", url ?? "", { shouldValidate: true });
                  setValue("fileName", name);
                  setValue("fileType", type);
                }}
                error={errors.mediaUrl?.message}
              />
            )}
          />
        </div>

        <div className="space-y-2">
          <Label required>Media type</Label>
          <Controller
            control={control}
            name="mediaTypeId"
            render={({ field }) => (
              <Select value={field.value ? String(field.value) : ""} onValueChange={(v) => field.onChange(Number(v))}>
                <SelectTrigger className="h-10 w-full" aria-invalid={!!errors.mediaTypeId}>
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value) return "Select media type";
                      return mediaTypes.find((t) => String(t.mediaTypeKey) === value)?.name ?? "Select media type";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {mediaTypes.map((t) => (
                    <SelectItem key={t.mediaTypeKey} value={String(t.mediaTypeKey)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.mediaTypeId && <p className="text-sm text-destructive">{errors.mediaTypeId.message}</p>}
        </div>

        <div className="space-y-2">
          <Label required>Media category</Label>
          <Controller
            control={control}
            name="mediaCategoryId"
            render={({ field }) => (
              <Select value={field.value ? String(field.value) : ""} onValueChange={(v) => field.onChange(Number(v))}>
                <SelectTrigger className="h-10 w-full" aria-invalid={!!errors.mediaCategoryId}>
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value) return "Select category";
                      return (
                        mediaCategories.find((c) => String(c.mediaCategoryKey) === value)?.name ?? "Select category"
                      );
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {mediaCategories.map((c) => (
                    <SelectItem key={c.mediaCategoryKey} value={String(c.mediaCategoryKey)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.mediaCategoryId && <p className="text-sm text-destructive">{errors.mediaCategoryId.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="caption">Caption</Label>
          <Input id="caption" {...register("caption")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="altText">Alt text</Label>
          <Input id="altText" placeholder="For SEO / accessibility" {...register("altText")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="displayOrder">Display order</Label>
          <Input id="displayOrder" type="number" {...register("displayOrder", { valueAsNumber: true })} />
        </div>
        <div className="flex items-end pb-2">
          <Controller
            control={control}
            name="isPrimary"
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} />
                Primary room image
              </label>
            )}
          />
        </div>

        <div className="flex items-center gap-2 sm:col-span-2">
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

/** Upload multiple images/videos at once, each with its own caption and alt text. */
function MediaBatchAddForm({
  mediaTypes,
  mediaCategories,
  onCancel,
  onSubmit,
}: {
  mediaTypes: MediaType[];
  mediaCategories: MediaCategory[];
  onCancel: () => void;
  onSubmit: (
    items: PendingMediaItem[],
    mediaTypeId: number,
    mediaCategoryId: number,
    primaryTempId: string | null
  ) => Promise<void>;
}) {
  const [mediaTypeId, setMediaTypeId] = useState(0);
  const [mediaCategoryId, setMediaCategoryId] = useState(0);
  const [items, setItems] = useState<PendingMediaItem[]>([]);
  const [primaryTempId, setPrimaryTempId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function addUploaded(file: UploadedMediaFile) {
    const tempId = nextTempId();
    setItems((prev) => [...prev, { tempId, ...file, caption: "", altText: "" }]);
  }

  function removeItem(tempId: string) {
    setItems((prev) => prev.filter((i) => i.tempId !== tempId));
    setPrimaryTempId((prev) => (prev === tempId ? null : prev));
  }

  function updateItem(tempId: string, patch: Partial<Pick<PendingMediaItem, "caption" | "altText">>) {
    setItems((prev) => prev.map((i) => (i.tempId === tempId ? { ...i, ...patch } : i)));
  }

  async function handleSubmit() {
    setSubmitError(null);
    if (!mediaTypeId || !mediaCategoryId) {
      setSubmitError("Select a media type and category first.");
      return;
    }
    if (items.length === 0) {
      setSubmitError("Upload at least one image or video.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(items, mediaTypeId, mediaCategoryId, primaryTempId);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-start justify-between gap-4">
        <h3 className="text-sm font-semibold">Add media</h3>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onCancel} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label required>Media type</Label>
          <Select value={mediaTypeId ? String(mediaTypeId) : ""} onValueChange={(v) => setMediaTypeId(Number(v))}>
            <SelectTrigger className="h-10 w-full">
              <SelectValue>
                {(value: string | null) => {
                  if (!value) return "Select media type";
                  return mediaTypes.find((t) => String(t.mediaTypeKey) === value)?.name ?? "Select media type";
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {mediaTypes.map((t) => (
                <SelectItem key={t.mediaTypeKey} value={String(t.mediaTypeKey)}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label required>Media category</Label>
          <Select
            value={mediaCategoryId ? String(mediaCategoryId) : ""}
            onValueChange={(v) => setMediaCategoryId(Number(v))}
          >
            <SelectTrigger className="h-10 w-full">
              <SelectValue>
                {(value: string | null) => {
                  if (!value) return "Select category";
                  return mediaCategories.find((c) => String(c.mediaCategoryKey) === value)?.name ?? "Select category";
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {mediaCategories.map((c) => (
                <SelectItem key={c.mediaCategoryKey} value={String(c.mediaCategoryKey)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="sm:col-span-2">
          <RoomMediaMultiUploadField id="batchMediaUpload" label="Files" onUploaded={addUploaded} />
        </div>
      </div>

      {items.length > 0 && (
        <div className="mt-4 space-y-3">
          <p className="text-xs font-medium text-muted-foreground">
            {items.length} file{items.length === 1 ? "" : "s"} — add a caption and alt text for each, and pick one
            primary image if needed.
          </p>
          {items.map((item) => (
            <div key={item.tempId} className="flex items-start gap-3 rounded-lg border border-border p-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted/30">
                {isVideoUrl(item.mediaUrl) ? (
                  <Film className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <img src={item.mediaUrl} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                <Input
                  placeholder="Caption"
                  value={item.caption}
                  onChange={(e) => updateItem(item.tempId, { caption: e.target.value })}
                />
                <Input
                  placeholder="Alt text (SEO / accessibility)"
                  value={item.altText}
                  onChange={(e) => updateItem(item.tempId, { altText: e.target.value })}
                />
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <input
                    type="radio"
                    name="primaryMedia"
                    checked={primaryTempId === item.tempId}
                    onChange={() => setPrimaryTempId(item.tempId)}
                  />
                  Primary room image
                </label>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => removeItem(item.tempId)}
                aria-label="Remove"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {submitError && <p className="mt-3 text-sm text-destructive">{submitError}</p>}

      <div className="mt-4 flex items-center gap-2">
        <Button type="button" disabled={submitting} onClick={() => void handleSubmit()}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Add {items.length > 0 ? `${items.length} ` : ""}media
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}

/** Media list scoped to one property room (used on the room detail "Media" tab). */
export function PropertyRoomMediaPanel({
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
  const [entries, setEntries] = useState<PropertyRoomTypeMedia[]>([]);
  const [mediaTypes, setMediaTypes] = useState<MediaType[]>([]);
  const [mediaCategories, setMediaCategories] = useState<MediaCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PropertyRoomTypeMedia | undefined>();

  async function refresh() {
    setLoading(true);
    try {
      const [rows, types, categories] = await Promise.all([
        listPropertyRoomTypeMedia({ propertyRoomId: room.propertyRoomKey }),
        listMediaTypes({ activeOnly: true }),
        listMediaCategories({ activeOnly: true }),
      ]);
      setEntries(rows);
      setMediaTypes(types);
      setMediaCategories(categories);
    } catch (error) {
      toast.error(error instanceof PropertyRoomTypeMediaApiError ? error.message : "Failed to load media");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.propertyRoomKey]);

  async function handleBatchSubmit(
    items: PendingMediaItem[],
    mediaTypeId: number,
    mediaCategoryId: number,
    primaryTempId: string | null
  ) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    const baseOrder = entries.length;
    let failures = 0;
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index]!;
      try {
        await createPropertyRoomTypeMedia({
          mediaTypeId,
          mediaCategoryId,
          mediaUrl: item.mediaUrl,
          fileName: item.fileName,
          fileType: item.fileType,
          caption: item.caption || null,
          altText: item.altText || null,
          displayOrder: baseOrder + index,
          isPrimary: item.tempId === primaryTempId,
          propertyId: room.propertyId,
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
      toast.success(`${items.length} media item${items.length === 1 ? "" : "s"} added`);
    } else {
      toast.error(`${failures} of ${items.length} uploads could not be saved`);
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
      await updatePropertyRoomTypeMedia(editTarget.propertyRoomTypeMediaKey, {
        mediaTypeId: values.mediaTypeId,
        mediaCategoryId: values.mediaCategoryId,
        mediaUrl: values.mediaUrl,
        fileName: values.fileName,
        fileType: values.fileType,
        altText: values.altText || null,
        caption: values.caption || null,
        displayOrder: values.displayOrder,
        isPrimary: values.isPrimary,
        modifiedBy: actorKey,
      });
      toast.success("Media updated");
      await refresh();
      setEditTarget(undefined);
    } catch (error) {
      toast.error(error instanceof PropertyRoomTypeMediaApiError ? error.message : "Could not save media");
    }
  }

  async function toggleStatus(entry: PropertyRoomTypeMedia) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      await setPropertyRoomTypeMediaActive(entry.propertyRoomTypeMediaKey, !entry.isActive, actorKey);
      await refresh();
      toast.success(entry.isActive ? "Deactivated" : "Activated");
    } catch (error) {
      toast.error(error instanceof PropertyRoomTypeMediaApiError ? error.message : "Could not update status");
    }
  }

  async function removeEntry(entry: PropertyRoomTypeMedia) {
    try {
      await deletePropertyRoomTypeMedia(entry.propertyRoomTypeMediaKey);
      await refresh();
      toast.success("Media removed");
    } catch (error) {
      toast.error(error instanceof PropertyRoomTypeMediaApiError ? error.message : "Could not remove media");
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading media…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">Media</p>
          <p className="text-sm text-muted-foreground">Photos, videos, and virtual tours for this room type.</p>
        </div>
        {canCreate && !addFormOpen && !editTarget && (
          <Button onClick={() => setAddFormOpen(true)}>
            <Plus className="h-4 w-4" />
            Add media
          </Button>
        )}
      </div>

      {addFormOpen && (
        <MediaBatchAddForm
          mediaTypes={mediaTypes}
          mediaCategories={mediaCategories}
          onCancel={() => setAddFormOpen(false)}
          onSubmit={handleBatchSubmit}
        />
      )}

      {editTarget && (
        <MediaEditForm
          entry={editTarget}
          mediaTypes={mediaTypes}
          mediaCategories={mediaCategories}
          onCancel={() => setEditTarget(undefined)}
          onSubmit={handleEditSubmit}
        />
      )}

      <Card>
        {entries.length === 0 ? (
          <EmptyState
            icon={ImageIcon}
            tone="primary"
            heading="No media yet"
            description="Add photos or videos for this room type."
            size="compact"
            action={
              canCreate ? (
                <Button onClick={() => setAddFormOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Add media
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Sr. No</TableHead>
                <TableHead className="w-14">Preview</TableHead>
                <TableHead>Caption</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Primary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry, index) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell>
                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border border-border bg-muted/30">
                      {isVideoUrl(entry.mediaUrl) ? (
                        <Film className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <img src={entry.mediaUrl} alt={entry.altText ?? ""} className="h-full w-full object-cover" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">{entry.caption ?? "—"}</TableCell>
                  <TableCell>{entry.mediaTypeName ?? `Type ${entry.mediaTypeId}`}</TableCell>
                  <TableCell>{entry.mediaCategoryName ?? `Category ${entry.mediaCategoryId}`}</TableCell>
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
