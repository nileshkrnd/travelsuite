"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Image as ImageIcon, Package, Eye, Pencil, Power, PowerOff, Trash2, X, Search, Loader2, Star } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
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
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore, isPlatformMode } from "@/lib/store/tenant.store";
import { useUsersStore } from "@/lib/store/users.store";
import { listServiceTypes, ServiceTypesApiError } from "@/lib/services/service-types.service";
import { listServiceProducts, ServiceProductsApiError } from "@/lib/services/service-products.service";
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
import { SUPER_ADMIN_ROLE_ID } from "@/mock/data/roles";
import type {
  CommonStatus,
  MediaCategory,
  MediaType,
  RoleDef,
  ServiceProduct,
  ServiceProductMedia,
  ServiceType,
} from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";
type StatusFilter = "all" | "active" | "inactive";

function useMediaSchema(rows: ServiceProductMedia[], currentId?: number) {
  return z.object({
    mediaTypeId: z.number().int().positive("Media type is required"),
    mediaCategoryId: z.number().int().positive("Media category is required"),
    mediaUrl: z.string().trim().min(1, "Media URL is required").max(1000),
    thumbnailUrl: z.string().trim().max(1000).optional().or(z.literal("")),
    mediaTitle: z.string().trim().max(250).optional().or(z.literal("")),
    mediaDescription: z.string().trim().max(1000).optional().or(z.literal("")),
    altText: z.string().trim().max(500).optional().or(z.literal("")),
    fileName: z.string().trim().max(250).optional().or(z.literal("")),
    fileExtension: z.string().trim().max(20).optional().or(z.literal("")),
    mimeType: z.string().trim().max(100).optional().or(z.literal("")),
    width: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().nonnegative().nullable()),
    height: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().nonnegative().nullable()),
    durationSeconds: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().nonnegative().nullable()),
    fileSize: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().nonnegative().nullable()),
    isPrimary: z.boolean(),
    displayOrder: z.preprocess((v) => (v === "" || v == null ? 0 : Number(v)), z.number().int().min(0)),
    commonStatusId: z.number().int().positive("Status is required"),
  }).superRefine((values, ctx) => {
    const duplicate = rows.some(
      (r) => r.serviceProductMediaId !== currentId && r.mediaUrl.trim().toLowerCase() === values.mediaUrl.trim().toLowerCase()
    );
    if (duplicate) {
      ctx.addIssue({ code: "custom", path: ["mediaUrl"], message: "This media URL is already added for this product" });
    }
  });
}

type FormValues = z.infer<ReturnType<typeof useMediaSchema>>;

function blankValues(statuses: CommonStatus[]): FormValues {
  return {
    mediaTypeId: 0,
    mediaCategoryId: 0,
    mediaUrl: "",
    thumbnailUrl: "",
    mediaTitle: "",
    mediaDescription: "",
    altText: "",
    fileName: "",
    fileExtension: "",
    mimeType: "",
    width: null,
    height: null,
    durationSeconds: null,
    fileSize: null,
    isPrimary: false,
    displayOrder: 0,
    commonStatusId: statuses.find((s) => s.isInitial)?.commonStatusId ?? statuses[0]?.commonStatusId ?? 0,
  };
}

function MediaPanel({
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
  mode: Exclude<PanelMode, "closed">;
  row?: ServiceProductMedia;
  rows: ServiceProductMedia[];
  product: ServiceProduct;
  mediaTypes: MediaType[];
  mediaCategories: MediaCategory[];
  statuses: CommonStatus[];
  userKey: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const schema = useMediaSchema(rows, row?.serviceProductMediaId);
  const isReadOnly = mode === "view";

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    values: {
      mediaTypeId: row?.mediaTypeId ?? 0,
      mediaCategoryId: row?.mediaCategoryId ?? 0,
      mediaUrl: row?.mediaUrl ?? "",
      thumbnailUrl: row?.thumbnailUrl ?? "",
      mediaTitle: row?.mediaTitle ?? "",
      mediaDescription: row?.mediaDescription ?? "",
      altText: row?.altText ?? "",
      fileName: row?.fileName ?? "",
      fileExtension: row?.fileExtension ?? "",
      mimeType: row?.mimeType ?? "",
      width: row?.width ?? null,
      height: row?.height ?? null,
      durationSeconds: row?.durationSeconds ?? null,
      fileSize: row?.fileSize ?? null,
      isPrimary: row?.isPrimary ?? false,
      displayOrder: row?.displayOrder ?? 0,
      commonStatusId: row?.commonStatusId ?? statuses.find((s) => s.isInitial)?.commonStatusId ?? statuses[0]?.commonStatusId ?? 0,
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

  async function submit(values: FormValues, keepOpenForMore: boolean) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    const payload = {
      serviceProductId: product.serviceProductId,
      mediaTypeId: values.mediaTypeId,
      mediaCategoryId: values.mediaCategoryId,
      mediaUrl: values.mediaUrl.trim(),
      thumbnailUrl: values.thumbnailUrl?.trim() || null,
      mediaTitle: values.mediaTitle?.trim() || null,
      mediaDescription: values.mediaDescription?.trim() || null,
      altText: values.altText?.trim() || null,
      fileName: values.fileName?.trim() || null,
      fileExtension: values.fileExtension?.trim() || null,
      mimeType: values.mimeType?.trim() || null,
      width: values.width,
      height: values.height,
      durationSeconds: values.durationSeconds,
      fileSize: values.fileSize,
      isPrimary: values.isPrimary,
      displayOrder: values.displayOrder,
      commonStatusId: values.commonStatusId,
    };
    try {
      if (mode === "edit" && row) {
        await updateServiceProductMedia(row.serviceProductMediaId, { ...payload, isActive: row.isActive, modifiedBy: userKey });
        toast.success("Media updated");
      } else if (mode === "create") {
        await createServiceProductMedia({ ...payload, createdBy: userKey });
        toast.success("Media added");
      }
      await onSaved();
      if (mode === "create" && keepOpenForMore) {
        reset(blankValues(statuses));
      } else {
        onClose();
      }
    } catch (error) {
      toast.error(error instanceof ServiceProductMediaApiError ? error.message : "Could not save media");
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">
            {mode === "create" ? "Add media" : mode === "edit" ? "Edit media" : "Media details"}
          </h2>
          <p className="text-sm text-muted-foreground">Under {product.serviceProductName}</p>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit((values) => submit(values, false))} className="grid grid-cols-2 gap-3 sm:grid-cols-4" noValidate>
        <div className="sm:col-span-4">
          {!isReadOnly && (
            <ServiceProductMediaUploadField
              id="mediaUpload"
              label="Upload media"
              mediaTypeName={selectedMediaTypeName}
              mediaUrl={mediaUrlWatch || null}
              fileName={fileNameWatch || null}
              onChange={handleUpload}
            />
          )}
        </div>

        <div className="space-y-1 sm:col-span-4">
          <Label htmlFor="mediaUrl" required>
            Media URL
          </Label>
          <Input
            id="mediaUrl"
            disabled={isReadOnly}
            placeholder="Uploaded automatically, or paste an external URL (e.g. a virtual tour link)"
            aria-invalid={!!errors.mediaUrl}
            {...register("mediaUrl")}
          />
          {errors.mediaUrl && <p className="text-sm text-destructive">{errors.mediaUrl.message}</p>}
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
          <Label htmlFor="mediaTitle">Title</Label>
          <Input id="mediaTitle" disabled={isReadOnly} {...register("mediaTitle")} />
        </div>

        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="thumbnailUrl">Thumbnail URL</Label>
          <Input id="thumbnailUrl" disabled={isReadOnly} {...register("thumbnailUrl")} />
        </div>

        <div className="space-y-1">
          <Label htmlFor="fileName">File name</Label>
          <Input id="fileName" disabled={isReadOnly} {...register("fileName")} />
        </div>

        <div className="space-y-1">
          <Label htmlFor="fileExtension">Extension</Label>
          <Input id="fileExtension" disabled={isReadOnly} placeholder="jpg, mp4, pdf" {...register("fileExtension")} />
        </div>

        <div className="space-y-1">
          <Label htmlFor="mimeType">MIME type</Label>
          <Input id="mimeType" disabled={isReadOnly} {...register("mimeType")} />
        </div>

        <div className="space-y-1">
          <Label htmlFor="displayOrder">Display order</Label>
          <Input id="displayOrder" type="number" min={0} disabled={isReadOnly} {...register("displayOrder")} />
        </div>

        <div className="space-y-1">
          <Label htmlFor="width">Width (px)</Label>
          <Input id="width" type="number" min={0} disabled={isReadOnly} {...register("width")} />
        </div>

        <div className="space-y-1">
          <Label htmlFor="height">Height (px)</Label>
          <Input id="height" type="number" min={0} disabled={isReadOnly} {...register("height")} />
        </div>

        <div className="space-y-1">
          <Label htmlFor="durationSeconds">Duration (sec)</Label>
          <Input id="durationSeconds" type="number" min={0} disabled={isReadOnly} {...register("durationSeconds")} />
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
          <Label htmlFor="mediaDescription">Description / caption</Label>
          <Textarea id="mediaDescription" rows={2} disabled={isReadOnly} {...register("mediaDescription")} />
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

function MediaList({ roleDef }: { roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const activeTenantId = useTenantStore((s) => s.tenantId);
  const activeTenant = useTenantStore((s) => s.tenant);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [products, setProducts] = useState<ServiceProduct[]>([]);
  const [mediaTypes, setMediaTypes] = useState<MediaType[]>([]);
  const [mediaCategories, setMediaCategories] = useState<MediaCategory[]>([]);
  const [statuses, setStatuses] = useState<CommonStatus[]>([]);
  const [productCounts, setProductCounts] = useState<Map<number, number>>(new Map());
  const [rows, setRows] = useState<ServiceProductMedia[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingRows, setLoadingRows] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<ServiceProductMedia | undefined>();
  const [serviceTypeFilter, setServiceTypeFilter] = useState<number | null>(null);
  const [productFilter, setProductFilter] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const isSuperAdmin = roleDef.id === SUPER_ADMIN_ROLE_ID;
  const platformMode = isSuperAdmin && isPlatformMode(activeTenantId);
  const scopeTenantId = platformMode ? 0 : (user?.tenantKey ?? activeTenant.tenantKey ?? 0);

  const canEdit = can(roleDef, "serviceProductMedia", "edit");
  const canCreate = can(roleDef, "serviceProductMedia", "create");
  const canDelete = can(roleDef, "serviceProductMedia", "delete");
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  const selectedProduct = products.find((p) => p.serviceProductId === productFilter);

  async function loadServiceTypes() {
    if (scopeTenantId <= 0) {
      setServiceTypes([]);
      setLoadingTypes(false);
      setLoadError(platformMode ? "Select a tenant workspace to manage media." : "Missing tenant scope.");
      return;
    }
    setLoadingTypes(true);
    setLoadError(null);
    try {
      const [typeRows, allProducts, mediaTypeRows, mediaCategoryRows, statusTypeRows] = await Promise.all([
        listServiceTypes({ tenantId: scopeTenantId, activeOnly: true }),
        listServiceProducts({ tenantId: scopeTenantId }),
        listMediaTypes({ activeOnly: true }),
        listMediaCategories({ activeOnly: true }),
        listCommonStatusTypes({ tenantId: scopeTenantId, activeOnly: true }),
      ]);
      setServiceTypes(typeRows);
      setMediaTypes(mediaTypeRows);
      setMediaCategories(mediaCategoryRows);
      const typeProductCounts = new Map<number, number>();
      for (const p of allProducts) {
        typeProductCounts.set(p.serviceTypeId, (typeProductCounts.get(p.serviceTypeId) ?? 0) + 1);
      }
      setServiceTypeFilter((current) => {
        if (current && typeRows.some((t) => t.serviceTypeId === current)) return current;
        const withData = typeRows.find((t) => (typeProductCounts.get(t.serviceTypeId) ?? 0) > 0);
        return withData?.serviceTypeId ?? typeRows[0]?.serviceTypeId ?? null;
      });

      const productStatusType = statusTypeRows.find((t) => t.statusTypeCode === "SERVICE_PRODUCT");
      if (productStatusType) {
        const statusRows = await listCommonStatuses({ tenantId: scopeTenantId, commonStatusTypeId: productStatusType.commonStatusTypeId, activeOnly: true });
        setStatuses(statusRows);
      }
    } catch (error) {
      setLoadError(error instanceof ServiceTypesApiError ? error.message : "Failed to load service types");
      setServiceTypes([]);
    } finally {
      setLoadingTypes(false);
    }
  }

  useEffect(() => {
    void loadServiceTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeTenantId]);

  useEffect(() => {
    if (!serviceTypeFilter || scopeTenantId <= 0) {
      setProducts([]);
      setProductFilter(null);
      return;
    }
    let cancelled = false;
    setLoadingProducts(true);
    listServiceProducts({ tenantId: scopeTenantId, serviceTypeId: serviceTypeFilter, activeOnly: true })
      .then((productRows) => {
        if (cancelled) return;
        setProducts(productRows);
        setProductFilter((current) =>
          current && productRows.some((p) => p.serviceProductId === current) ? current : (productRows[0]?.serviceProductId ?? null)
        );
      })
      .catch((error) => {
        if (!cancelled) toast.error(error instanceof ServiceProductsApiError ? error.message : "Failed to load products");
      })
      .finally(() => {
        if (!cancelled) setLoadingProducts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [serviceTypeFilter, scopeTenantId]);

  async function refreshRows() {
    if (!productFilter) {
      setRows([]);
      return;
    }
    setLoadingRows(true);
    try {
      const rowsResult = await listServiceProductMedia({ serviceProductId: productFilter });
      setRows(rowsResult);
      setProductCounts((prev) => {
        const next = new Map(prev);
        next.set(productFilter, rowsResult.length);
        return next;
      });
    } catch (error) {
      toast.error(error instanceof ServiceProductMediaApiError ? error.message : "Failed to load media");
      setRows([]);
    } finally {
      setLoadingRows(false);
    }
  }

  useEffect(() => {
    void refreshRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productFilter]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    let result = rows;
    if (term) {
      result = result.filter(
        (r) => (r.mediaTitle ?? "").toLowerCase().includes(term) || r.mediaUrl.toLowerCase().includes(term)
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
    <div className="space-y-6 p-6">
      <PageHeader
        title="Service Product Media"
        description="Photos, videos, and documents for a Service Product — Cover, Gallery, Map, Location, …"
        actions={
          canCreate && panelMode === "closed" && selectedProduct && mediaTypes.length > 0 && mediaCategories.length > 0 && statuses.length > 0 ? (
            <Button
              onClick={() => {
                setTarget(undefined);
                setPanelMode("create");
              }}
            >
              <Plus className="h-4 w-4" />
              Add media
            </Button>
          ) : undefined
        }
      />

      {loadError && <p className="text-sm text-destructive">{loadError}</p>}
      {loadingTypes && <p className="text-sm text-muted-foreground">Loading service types…</p>}

      {!loadingTypes && serviceTypes.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select value={serviceTypeFilter ? String(serviceTypeFilter) : ""} onValueChange={(v) => setServiceTypeFilter(v ? Number(v) : null)}>
            <SelectTrigger className="w-56">
              <SelectValue>
                {(value: string | null) => {
                  if (!value) return "Select service type";
                  return serviceTypes.find((t) => String(t.serviceTypeId) === value)?.serviceTypeName ?? value;
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {serviceTypes.map((t) => (
                <SelectItem key={t.serviceTypeId} value={String(t.serviceTypeId)}>
                  {t.serviceTypeName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {loadingProducts ? (
            <p className="text-sm text-muted-foreground">Loading products…</p>
          ) : products.length === 0 ? (
            <p className="text-sm text-muted-foreground">No products under this service type yet.</p>
          ) : (
            <Select value={productFilter ? String(productFilter) : ""} onValueChange={(v) => setProductFilter(v ? Number(v) : null)}>
              <SelectTrigger className="w-64">
                <SelectValue>
                  {(value: string | null) => {
                    if (!value) return "Select product";
                    const p = products.find((p) => String(p.serviceProductId) === value);
                    return p ? `${p.serviceProductName} (${productCounts.get(p.serviceProductId) ?? 0})` : value;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.serviceProductId} value={String(p.serviceProductId)}>
                    {p.serviceProductName} ({productCounts.get(p.serviceProductId) ?? 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {panelMode !== "closed" && selectedProduct && (
        <MediaPanel
          mode={panelMode}
          row={target}
          rows={rows}
          product={selectedProduct}
          mediaTypes={mediaTypes}
          mediaCategories={mediaCategories}
          statuses={statuses}
          userKey={userKey}
          onSaved={refreshRows}
          onClose={() => {
            setPanelMode("closed");
            setTarget(undefined);
          }}
        />
      )}

      {selectedProduct && rows.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search title or URL…" value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9" />
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

      {selectedProduct && (
        <Card>
          {loadingRows ? (
            <p className="p-6 text-sm text-muted-foreground">Loading media…</p>
          ) : rows.length === 0 ? (
            <EmptyState icon={ImageIcon} tone="primary" heading="No media yet" description={`Add media under ${selectedProduct.serviceProductName}.`} size="compact" />
          ) : visible.length === 0 ? (
            <EmptyState icon={Search} tone="muted" heading="No matching media" description="Try a different search or status filter." size="compact" />
          ) : (
            <Table className="table-fixed border-collapse text-xs [&_th]:h-auto [&_th]:whitespace-normal [&_td]:whitespace-normal">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[26%] px-2 py-1.5">Title / URL</TableHead>
                  <TableHead className="w-[16%] px-2 py-1.5">Type</TableHead>
                  <TableHead className="w-[16%] px-2 py-1.5">Category</TableHead>
                  <TableHead className="w-[10%] px-2 py-1.5">Order</TableHead>
                  <TableHead className="w-[12%] px-2 py-1.5">Status</TableHead>
                  <TableHead className="w-[20%] px-2 py-1.5 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((row) => (
                  <TableRow key={row.serviceProductMediaId}>
                    <TableCell className="px-2 py-1.5 font-medium leading-tight">
                      <span className="flex items-center gap-1.5">
                        {row.isPrimary && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
                        <span className="truncate">{row.mediaTitle ?? row.mediaUrl}</span>
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
      )}

      {!selectedProduct && !loadingTypes && serviceTypes.length > 0 && (
        <EmptyState icon={Package} tone="muted" heading="Select a product" description="Choose a service type and product above to manage its media." size="compact" />
      )}
    </div>
  );
}

export default function ServiceProductMediaMasterPage() {
  return <AccessGate module="serviceProductMedia">{(roleDef) => <MediaList roleDef={roleDef} />}</AccessGate>;
}
