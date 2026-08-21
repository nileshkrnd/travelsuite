"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Image as ImageIcon, Eye, Pencil, Power, PowerOff, Trash2, X, Search, Loader2, Star, Film } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
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
import { ServiceProductMediaUploadField, type UploadedFileInfo } from "@/components/masters/ServiceProductMediaUploadField";
import { ServiceProductMediaBulkUploadField, type StagedMediaFile } from "@/components/masters/ServiceProductMediaBulkUploadField";
import { useSessionStore } from "@/lib/store/session.store";
import { useUsersStore } from "@/lib/store/users.store";
import { listMediaTypes } from "@/lib/services/media-types.service";
import { listMediaCategories } from "@/lib/services/media-categories.service";
import { listCommonStatusTypes } from "@/lib/services/common-status-types.service";
import { listCommonStatuses } from "@/lib/services/common-statuses.service";
import {
  listServiceProductMedia,
  createServiceProductMedia,
  updateServiceProductMedia,
  setServiceProductMediaActive,
  deleteServiceProductMedia,
  ServiceProductMediaApiError,
} from "@/lib/services/service-product-media.service";
import { can } from "@/config/permissions";
import type { CommonStatus, MediaCategory, MediaType, RoleDef, ServiceProduct, ServiceProductMedia } from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";
type StatusFilter = "all" | "active" | "inactive";

function isVideoUrl(url: string) {
  return /\.(mp4)$/i.test(url);
}

function MediaThumb({ url, className }: { url: string | null | undefined; className?: string }) {
  return (
    <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted ${className ?? "h-14 w-14"}`}>
      {url ? (
        isVideoUrl(url) ? (
          <Film className="h-5 w-5 text-muted-foreground" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- local upload path, not a static asset
          <img src={url} alt="" className="h-full w-full object-cover" />
        )
      ) : (
        <ImageIcon className="h-5 w-5 text-muted-foreground" />
      )}
    </div>
  );
}

/* ---------------------------------- Bulk create (multi-file upload) ---------------------------------- */

interface StagedItem extends StagedMediaFile {
  title: string;
  description: string;
  altText: string;
  isPrimary: boolean;
}

function MediaBulkCreatePanel({
  product,
  mediaTypes,
  mediaCategories,
  statuses,
  userKey,
  onClose,
  onSaved,
}: {
  product: ServiceProduct;
  mediaTypes: MediaType[];
  mediaCategories: MediaCategory[];
  statuses: CommonStatus[];
  userKey: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [mediaTypeId, setMediaTypeId] = useState(0);
  const [mediaCategoryId, setMediaCategoryId] = useState(0);
  const [commonStatusId, setCommonStatusId] = useState(statuses.find((s) => s.isInitial)?.commonStatusId ?? statuses[0]?.commonStatusId ?? 0);
  const [staged, setStaged] = useState<StagedItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const selectedMediaTypeName = mediaTypes.find((t) => t.mediaTypeKey === mediaTypeId)?.name;

  function handleFilesUploaded(files: StagedMediaFile[]) {
    setFormError(null);
    setStaged((prev) => [
      ...prev,
      ...files.map((f, i) => ({
        ...f,
        title: f.fileName.replace(/\.[^./]+$/, ""),
        description: "",
        altText: "",
        isPrimary: prev.length === 0 && i === 0,
      })),
    ]);
  }

  function updateStaged(tempId: string, patch: Partial<StagedItem>) {
    setStaged((prev) => prev.map((s) => (s.tempId === tempId ? { ...s, ...patch } : s)));
  }

  function removeStaged(tempId: string) {
    setStaged((prev) => prev.filter((s) => s.tempId !== tempId));
  }

  function setPrimary(tempId: string) {
    setStaged((prev) => prev.map((s) => ({ ...s, isPrimary: s.tempId === tempId })));
  }

  async function submitAll() {
    setFormError(null);
    if (!mediaTypeId || !mediaCategoryId || !commonStatusId) {
      setFormError("Select media type, category, and status before adding media.");
      return;
    }
    if (staged.length === 0) {
      setFormError("Upload at least one file.");
      return;
    }
    const missingTitle = staged.find((s) => !s.title.trim());
    if (missingTitle) {
      setFormError(`"${missingTitle.fileName}" needs a title.`);
      return;
    }
    const missingDescription = staged.find((s) => !s.description.trim());
    if (missingDescription) {
      setFormError(`"${missingDescription.fileName}" needs a description.`);
      return;
    }
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    setSubmitting(true);
    try {
      for (let i = 0; i < staged.length; i++) {
        const item = staged[i]!;
        await createServiceProductMedia({
          serviceProductId: product.serviceProductId,
          mediaTypeId,
          mediaCategoryId,
          mediaUrl: item.mediaUrl,
          mediaTitle: item.title.trim(),
          mediaDescription: item.description.trim(),
          altText: item.altText.trim() || null,
          fileName: item.fileName,
          fileExtension: item.fileExtension,
          mimeType: item.mimeType,
          fileSize: item.fileSize,
          isPrimary: item.isPrimary,
          displayOrder: i,
          commonStatusId,
          createdBy: userKey,
        });
      }
      toast.success(`${staged.length} media file${staged.length > 1 ? "s" : ""} added`);
      await onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof ServiceProductMediaApiError ? error.message : "Could not save media");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">Add media</h2>
          <p className="text-sm text-muted-foreground">Upload one or more files, then add a title and description for each.</p>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label required>Media type</Label>
          <Select value={mediaTypeId ? String(mediaTypeId) : ""} onValueChange={(v) => setMediaTypeId(v ? Number(v) : 0)}>
            <SelectTrigger className="h-10 w-full min-w-0">
              <SelectValue>
                {(value: string | null) => {
                  if (!value) return "Select type";
                  return mediaTypes.find((t) => String(t.mediaTypeKey) === value)?.name ?? value;
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

        <div className="space-y-1">
          <Label required>Media category</Label>
          <Select value={mediaCategoryId ? String(mediaCategoryId) : ""} onValueChange={(v) => setMediaCategoryId(v ? Number(v) : 0)}>
            <SelectTrigger className="h-10 w-full min-w-0">
              <SelectValue>
                {(value: string | null) => {
                  if (!value) return "Select category";
                  return mediaCategories.find((c) => String(c.mediaCategoryKey) === value)?.name ?? value;
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

        <div className="space-y-1">
          <Label required>Status</Label>
          <Select value={commonStatusId ? String(commonStatusId) : ""} onValueChange={(v) => setCommonStatusId(v ? Number(v) : 0)}>
            <SelectTrigger className="h-10 w-full min-w-0">
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
        </div>
      </div>

      <div className="mt-4">
        <ServiceProductMediaBulkUploadField mediaTypeName={selectedMediaTypeName} onFilesUploaded={handleFilesUploaded} disabled={!mediaTypeId} />
        {!mediaTypeId && <p className="mt-1 text-xs text-muted-foreground">Select a media type first to enable upload.</p>}
      </div>

      {staged.length > 0 && (
        <div className="mt-4 space-y-3">
          {staged.map((item) => (
            <div key={item.tempId} className="flex gap-3 rounded-lg border border-border p-3">
              <MediaThumb url={item.mediaUrl} className="h-16 w-16" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Input placeholder="Title" value={item.title} onChange={(e) => updateStaged(item.tempId, { title: e.target.value })} />
                  <Input placeholder="Alt text (optional)" value={item.altText} onChange={(e) => updateStaged(item.tempId, { altText: e.target.value })} />
                </div>
                <Textarea
                  rows={2}
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => updateStaged(item.tempId, { description: e.target.value })}
                />
                <div className="flex items-center gap-3 text-xs">
                  <label className="flex items-center gap-1.5">
                    <Checkbox checked={item.isPrimary} onCheckedChange={() => setPrimary(item.tempId)} />
                    Primary
                  </label>
                  <span className="truncate text-muted-foreground">{item.fileName}</span>
                </div>
              </div>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeStaged(item.tempId)} aria-label="Remove">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {formError && <p className="mt-3 text-sm text-destructive">{formError}</p>}

      <div className="mt-4 flex items-center gap-2">
        <Button type="button" onClick={submitAll} disabled={submitting || staged.length === 0}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Add {staged.length > 0 ? staged.length : ""} media
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}

/* ---------------------------------- Edit / view (single record) ---------------------------------- */

function useMediaSchema(rows: ServiceProductMedia[], currentId?: number) {
  return z
    .object({
      mediaTypeId: z.number().int().positive("Media type is required"),
      mediaCategoryId: z.number().int().positive("Media category is required"),
      mediaUrl: z.string().trim().min(1, "Upload a file"),
      mediaTitle: z.string().trim().min(1, "Title is required").max(250),
      mediaDescription: z.string().trim().min(1, "Description is required").max(1000),
      altText: z.string().trim().max(500).optional().or(z.literal("")),
      fileName: z.string().trim().max(250).optional().or(z.literal("")),
      fileExtension: z.string().trim().max(20).optional().or(z.literal("")),
      mimeType: z.string().trim().max(100).optional().or(z.literal("")),
      fileSize: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().nonnegative().nullable()),
      isPrimary: z.boolean(),
      displayOrder: z.preprocess((v) => (v === "" || v == null ? 0 : Number(v)), z.number().int().min(0)),
      commonStatusId: z.number().int().positive("Status is required"),
    })
    .superRefine((values, ctx) => {
      const duplicate = rows.some(
        (r) => r.serviceProductMediaId !== currentId && r.mediaUrl.trim().toLowerCase() === values.mediaUrl.trim().toLowerCase()
      );
      if (duplicate) {
        ctx.addIssue({ code: "custom", path: ["mediaUrl"], message: "This file is already added for this product" });
      }
    });
}

type EditFormValues = z.infer<ReturnType<typeof useMediaSchema>>;

function MediaEditViewPanel({
  mode,
  row,
  rows,
  product,
  mediaTypes,
  mediaCategories,
  statuses,
  userKey,
  onClose,
  onSaved,
}: {
  mode: "edit" | "view";
  row: ServiceProductMedia;
  rows: ServiceProductMedia[];
  product: ServiceProduct;
  mediaTypes: MediaType[];
  mediaCategories: MediaCategory[];
  statuses: CommonStatus[];
  userKey: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const schema = useMediaSchema(rows, row.serviceProductMediaId);
  const isReadOnly = mode === "view";

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EditFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    values: {
      mediaTypeId: row.mediaTypeId,
      mediaCategoryId: row.mediaCategoryId,
      mediaUrl: row.mediaUrl,
      mediaTitle: row.mediaTitle ?? "",
      mediaDescription: row.mediaDescription ?? "",
      altText: row.altText ?? "",
      fileName: row.fileName ?? "",
      fileExtension: row.fileExtension ?? "",
      mimeType: row.mimeType ?? "",
      fileSize: row.fileSize ?? null,
      isPrimary: row.isPrimary,
      displayOrder: row.displayOrder,
      commonStatusId: row.commonStatusId,
    },
  });

  const mediaTypeIdWatch = useWatch({ control, name: "mediaTypeId" });
  const mediaUrlWatch = useWatch({ control, name: "mediaUrl" });
  const fileNameWatch = useWatch({ control, name: "fileName" });
  const selectedMediaTypeName = mediaTypes.find((t) => t.mediaTypeKey === mediaTypeIdWatch)?.name;

  function handleUpload(info: UploadedFileInfo | null) {
    if (info) {
      setValue("mediaUrl", info.mediaUrl, { shouldValidate: true });
      setValue("fileName", info.fileName);
      setValue("fileExtension", info.fileExtension);
      setValue("mimeType", info.mimeType);
      setValue("fileSize", info.fileSize);
    } else {
      setValue("mediaUrl", "", { shouldValidate: true });
      setValue("fileName", "");
      setValue("fileExtension", "");
      setValue("mimeType", "");
      setValue("fileSize", null);
    }
  }

  async function submit(values: EditFormValues) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    const payload = {
      serviceProductId: product.serviceProductId,
      mediaTypeId: values.mediaTypeId,
      mediaCategoryId: values.mediaCategoryId,
      mediaUrl: values.mediaUrl.trim(),
      mediaTitle: values.mediaTitle.trim(),
      mediaDescription: values.mediaDescription.trim(),
      altText: values.altText?.trim() || null,
      fileName: values.fileName?.trim() || null,
      fileExtension: values.fileExtension?.trim() || null,
      mimeType: values.mimeType?.trim() || null,
      fileSize: values.fileSize,
      isPrimary: values.isPrimary,
      displayOrder: values.displayOrder,
      commonStatusId: values.commonStatusId,
    };
    try {
      await updateServiceProductMedia(row.serviceProductMediaId, { ...payload, isActive: row.isActive, modifiedBy: userKey });
      toast.success("Media updated");
      await onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof ServiceProductMediaApiError ? error.message : "Could not save media");
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <h2 className="text-base font-semibold">{mode === "edit" ? "Edit media" : "Media details"}</h2>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit(submit)} className="grid grid-cols-2 gap-3 sm:grid-cols-4" noValidate>
        <div className="sm:col-span-4">
          {isReadOnly ? (
            <div className="flex items-center gap-3">
              <MediaThumb url={mediaUrlWatch} className="h-20 w-20" />
              <p className="text-sm text-muted-foreground">{fileNameWatch || "Uploaded media"}</p>
            </div>
          ) : (
            <ServiceProductMediaUploadField
              id="mediaUpload"
              label="Replace file"
              mediaTypeName={selectedMediaTypeName}
              mediaUrl={mediaUrlWatch || null}
              fileName={fileNameWatch || null}
              onChange={handleUpload}
              error={errors.mediaUrl?.message}
            />
          )}
        </div>

        <div className="space-y-1 sm:col-span-2">
          <Label required>Media type</Label>
          <Controller
            control={control}
            name="mediaTypeId"
            render={({ field }) => (
              <Select value={field.value ? String(field.value) : ""} onValueChange={(v) => field.onChange(Number(v))} disabled={isReadOnly}>
                <SelectTrigger className="h-10 w-full min-w-0" aria-invalid={!!errors.mediaTypeId}>
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value) return "Select type";
                      return mediaTypes.find((t) => String(t.mediaTypeKey) === value)?.name ?? value;
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

        <div className="space-y-1 sm:col-span-2">
          <Label required>Media category</Label>
          <Controller
            control={control}
            name="mediaCategoryId"
            render={({ field }) => (
              <Select value={field.value ? String(field.value) : ""} onValueChange={(v) => field.onChange(Number(v))} disabled={isReadOnly}>
                <SelectTrigger className="h-10 w-full min-w-0" aria-invalid={!!errors.mediaCategoryId}>
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value) return "Select category";
                      return mediaCategories.find((c) => String(c.mediaCategoryKey) === value)?.name ?? value;
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

        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="mediaTitle" required>
            Title
          </Label>
          <Input id="mediaTitle" disabled={isReadOnly} aria-invalid={!!errors.mediaTitle} {...register("mediaTitle")} />
          {errors.mediaTitle && <p className="text-sm text-destructive">{errors.mediaTitle.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="displayOrder">Display order</Label>
          <Input id="displayOrder" type="number" min={0} disabled={isReadOnly} {...register("displayOrder")} />
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
            name="isPrimary"
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} disabled={isReadOnly} />
                Primary media
              </label>
            )}
          />
        </div>

        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="altText">Alt text</Label>
          <Input id="altText" disabled={isReadOnly} {...register("altText")} />
        </div>

        <div className="space-y-1 sm:col-span-4">
          <Label htmlFor="mediaDescription" required>
            Description
          </Label>
          <Textarea id="mediaDescription" rows={3} disabled={isReadOnly} aria-invalid={!!errors.mediaDescription} {...register("mediaDescription")} />
          {errors.mediaDescription && <p className="text-sm text-destructive">{errors.mediaDescription.message}</p>}
        </div>

        {mode === "view" && (
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
              Save
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

/* ---------------------------------- Tab ---------------------------------- */

export function ProductMediaTab({ product, roleDef }: { product: ServiceProduct; roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const [mediaTypes, setMediaTypes] = useState<MediaType[]>([]);
  const [mediaCategories, setMediaCategories] = useState<MediaCategory[]>([]);
  const [statuses, setStatuses] = useState<CommonStatus[]>([]);
  const [rows, setRows] = useState<ServiceProductMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<ServiceProductMedia | undefined>();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const canEdit = can(roleDef, "serviceProductMedia", "edit");
  const canCreate = can(roleDef, "serviceProductMedia", "create");
  const canDelete = can(roleDef, "serviceProductMedia", "delete");
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      listMediaTypes({ activeOnly: true }),
      listMediaCategories({ activeOnly: true }),
      listCommonStatusTypes({ tenantId: product.tenantId, activeOnly: true }),
    ]).then(async ([mediaTypeRows, mediaCategoryRows, statusTypeRows]) => {
      if (cancelled) return;
      setMediaTypes(mediaTypeRows);
      setMediaCategories(mediaCategoryRows);
      const productStatusType = statusTypeRows.find((t) => t.statusTypeCode === "SERVICE_PRODUCT");
      if (productStatusType) {
        const statusRows = await listCommonStatuses({ tenantId: product.tenantId, commonStatusTypeId: productStatusType.commonStatusTypeId, activeOnly: true });
        if (!cancelled) setStatuses(statusRows);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [product.tenantId]);

  async function refreshRows() {
    setLoading(true);
    try {
      const rowsResult = await listServiceProductMedia({ serviceProductId: product.serviceProductId });
      setRows(rowsResult);
    } catch (error) {
      toast.error(error instanceof ServiceProductMediaApiError ? error.message : "Failed to load media");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.serviceProductId]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    let result = rows;
    if (term) {
      result = result.filter(
        (r) => (r.mediaTitle ?? "").toLowerCase().includes(term) || (r.mediaDescription ?? "").toLowerCase().includes(term)
      );
    }
    if (statusFilter === "active") result = result.filter((r) => r.isActive);
    if (statusFilter === "inactive") result = result.filter((r) => !r.isActive);
    return result;
  }, [rows, search, statusFilter]);

  async function toggleActive(row: ServiceProductMedia) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      await setServiceProductMediaActive(row.serviceProductMediaId, !row.isActive, userKey);
      await refreshRows();
      toast.success(row.isActive ? "Media deactivated" : "Media activated");
    } catch (error) {
      toast.error(error instanceof ServiceProductMediaApiError ? error.message : "Could not update status");
    }
  }

  async function removeRow(row: ServiceProductMedia) {
    try {
      await deleteServiceProductMedia(row.serviceProductMediaId);
      await refreshRows();
      toast.success("Media deleted");
    } catch (error) {
      toast.error(error instanceof ServiceProductMediaApiError ? error.message : "Could not delete media");
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Media"
        description="Photos, videos, and documents for this product — Cover, Gallery, Map, Location, …"
        actions={
          canCreate && panelMode === "closed" && mediaTypes.length > 0 && mediaCategories.length > 0 && statuses.length > 0 ? (
            <Button onClick={() => { setTarget(undefined); setPanelMode("create"); }}>
              <Plus className="h-4 w-4" />
              Add media
            </Button>
          ) : undefined
        }
      />

      {panelMode === "create" && (
        <MediaBulkCreatePanel
          product={product}
          mediaTypes={mediaTypes}
          mediaCategories={mediaCategories}
          statuses={statuses}
          userKey={userKey}
          onSaved={refreshRows}
          onClose={() => setPanelMode("closed")}
        />
      )}

      {(panelMode === "edit" || panelMode === "view") && target && (
        <MediaEditViewPanel
          mode={panelMode}
          row={target}
          rows={rows}
          product={product}
          mediaTypes={mediaTypes}
          mediaCategories={mediaCategories}
          statuses={statuses}
          userKey={userKey}
          onSaved={refreshRows}
          onClose={() => { setPanelMode("closed"); setTarget(undefined); }}
        />
      )}

      {rows.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search title or description…" value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9" />
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
        {loading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading media…</p>
        ) : rows.length === 0 ? (
          <EmptyState icon={ImageIcon} tone="primary" heading="No media yet" description="Add media for this product." size="compact" />
        ) : visible.length === 0 ? (
          <EmptyState icon={Search} tone="muted" heading="No matching media" description="Try a different search or status filter." size="compact" />
        ) : (
          <Table className="table-fixed border-collapse text-xs [&_th]:h-auto [&_th]:whitespace-normal [&_td]:whitespace-normal">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[10%] px-2 py-1.5">Preview</TableHead>
                <TableHead className="w-[24%] px-2 py-1.5">Title</TableHead>
                <TableHead className="w-[14%] px-2 py-1.5">Type</TableHead>
                <TableHead className="w-[14%] px-2 py-1.5">Category</TableHead>
                <TableHead className="w-[8%] px-2 py-1.5">Order</TableHead>
                <TableHead className="w-[10%] px-2 py-1.5">Status</TableHead>
                <TableHead className="w-[20%] px-2 py-1.5 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row) => (
                <TableRow key={row.serviceProductMediaId}>
                  <TableCell className="px-2 py-1.5">
                    <MediaThumb url={row.mediaUrl} className="h-10 w-10" />
                  </TableCell>
                  <TableCell className="px-2 py-1.5 font-medium leading-tight">
                    <span className="flex items-center gap-1.5">
                      {row.isPrimary && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
                      <span className="truncate">{row.mediaTitle ?? "Untitled"}</span>
                    </span>
                  </TableCell>
                  <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">{row.mediaTypeName ?? "—"}</TableCell>
                  <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">{row.mediaCategoryName ?? "—"}</TableCell>
                  <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">{row.displayOrder}</TableCell>
                  <TableCell className="px-2 py-1.5">
                    <Badge variant={row.isActive ? "default" : "secondary"} className="px-1.5 py-0 text-[11px]">
                      {row.isActive ? "active" : "inactive"}
                    </Badge>
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
