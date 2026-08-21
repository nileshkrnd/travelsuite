"use client";

import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Package, MapPin, Info, Save, X, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { HelpdeskRichComposer } from "@/components/helpdesk/HelpdeskRichComposer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Section } from "@/components/masters/PropertyFormSection";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore, isPlatformMode } from "@/lib/store/tenant.store";
import { useUsersStore } from "@/lib/store/users.store";
import { SUPER_ADMIN_ROLE_ID } from "@/mock/data/roles";
import { listServiceTypes } from "@/lib/services/service-types.service";
import { listServiceProductClassifications } from "@/lib/services/service-product-classifications.service";
import { listServiceProductCategories } from "@/lib/services/service-product-categories.service";
import { listCommonStatusTypes } from "@/lib/services/common-status-types.service";
import { listCommonStatuses } from "@/lib/services/common-statuses.service";
import { listSuppliers } from "@/lib/services/suppliers.service";
import { listCountries } from "@/lib/services/countries.service";
import { listCities } from "@/lib/services/cities.service";
import { listRegions } from "@/lib/services/regions.service";
import { listServiceProducts, createServiceProduct, updateServiceProduct, ServiceProductsApiError } from "@/lib/services/service-products.service";
import type {
  City,
  CommonStatus,
  Country,
  Region,
  RoleDef,
  ServiceProduct,
  ServiceProductCategory,
  ServiceProductClassification,
  ServiceType,
  Supplier,
} from "@/types";

const NONE_OPTION = "__none__";

/** HelpdeskRichComposer's "empty" content is "<p></p>", not "" — normalize both to blank before saving. */
function isBlankHtml(html: string | undefined): boolean {
  if (!html) return true;
  return html.replace(/<[^>]*>/g, "").trim().length === 0;
}

function useProductSchema(rows: ServiceProduct[], currentId?: number) {
  return z.object({
    serviceTypeId: z.number().int().positive("Service type is required"),
    serviceProductCode: z.string().trim().min(1, "Code is required").max(50),
    serviceProductName: z.string().trim().min(1, "Name is required").max(250),
    serviceProductClassificationId: z.number().int().positive("Classification is required"),
    serviceProductCategoryId: z.number().int().positive().nullable(),
    supplierId: z.number().int().positive().nullable(),
    countryId: z.number().int().positive().nullable(),
    regionId: z.number().int().positive().nullable(),
    cityId: z.number().int().positive().nullable(),
    shortDescription: z.string().trim().max(20000).optional().or(z.literal("")),
    description: z.string().trim().max(20000).optional().or(z.literal("")),
    isOnlineSellable: z.boolean(),
    isFeatured: z.boolean(),
    displayOrder: z.preprocess((v) => (v === "" || v == null ? 0 : Number(v)), z.number().int().min(0)),
    commonStatusId: z.number().int().positive("Status is required"),
    statusChangeRemarks: z.string().trim().max(1000).optional().or(z.literal("")),
  }).superRefine((values, ctx) => {
    const duplicate = rows.some(
      (r) =>
        r.serviceProductId !== currentId &&
        r.serviceProductCode.toLowerCase() === values.serviceProductCode.trim().toLowerCase()
    );
    if (duplicate) {
      ctx.addIssue({ code: "custom", path: ["serviceProductCode"], message: "This product code already exists" });
    }
  });
}

type FormValues = z.infer<ReturnType<typeof useProductSchema>>;

export function ServiceProductForm({ serviceProduct, roleDef }: { serviceProduct?: ServiceProduct; roleDef?: RoleDef }) {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();
  const isEdit = !!serviceProduct;

  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const activeTenantId = useTenantStore((s) => s.tenantId);
  const activeTenant = useTenantStore((s) => s.tenant);
  const isSuperAdmin = roleDef?.id === SUPER_ADMIN_ROLE_ID;
  const platformMode = isSuperAdmin && isPlatformMode(activeTenantId);
  const tenantId = platformMode ? (serviceProduct?.tenantId ?? 0) : (user?.tenantKey ?? activeTenant.tenantKey ?? 0);
  const companyId = serviceProduct?.companyId ?? user?.companyKey ?? 0;
  const actorKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  const [bootLoading, setBootLoading] = useState(true);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [statuses, setStatuses] = useState<CommonStatus[]>([]);
  const [classifications, setClassifications] = useState<ServiceProductClassification[]>([]);
  const [categories, setCategories] = useState<ServiceProductCategory[]>([]);
  const [existingRows, setExistingRows] = useState<ServiceProduct[]>([]);

  const schema = useProductSchema(existingRows, serviceProduct?.serviceProductId);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    values: {
      serviceTypeId: serviceProduct?.serviceTypeId ?? 0,
      serviceProductCode: serviceProduct?.serviceProductCode ?? "",
      serviceProductName: serviceProduct?.serviceProductName ?? "",
      serviceProductClassificationId: serviceProduct?.serviceProductClassificationId ?? 0,
      serviceProductCategoryId: serviceProduct?.serviceProductCategoryId ?? null,
      supplierId: serviceProduct?.supplierId ?? null,
      countryId: serviceProduct?.countryId ?? null,
      regionId: serviceProduct?.regionId ?? null,
      cityId: serviceProduct?.cityId ?? null,
      shortDescription: serviceProduct?.shortDescription ?? "",
      description: serviceProduct?.description ?? "",
      isOnlineSellable: serviceProduct?.isOnlineSellable ?? false,
      isFeatured: serviceProduct?.isFeatured ?? false,
      displayOrder: serviceProduct?.displayOrder ?? 0,
      commonStatusId: serviceProduct?.commonStatusId ?? 0,
      statusChangeRemarks: "",
    },
  });

  const serviceTypeIdWatch = useWatch({ control, name: "serviceTypeId" });
  const countryIdWatch = useWatch({ control, name: "countryId" });

  useEffect(() => {
    if (tenantId <= 0) {
      setBootLoading(false);
      return;
    }
    let cancelled = false;
    setBootLoading(true);
    Promise.all([
      listServiceTypes({ tenantId, activeOnly: true }),
      listSuppliers({ tenantId, activeOnly: true }),
      listCountries({ activeOnly: true }),
      listRegions({ activeOnly: true }),
      listCommonStatusTypes({ tenantId, activeOnly: true }),
    ])
      .then(async ([typeRows, supplierRows, countryRows, regionRows, statusTypeRows]) => {
        if (cancelled) return;
        setServiceTypes(typeRows);
        setSuppliers(supplierRows);
        setCountries(countryRows);
        setRegions(regionRows);
        const productStatusType = statusTypeRows.find((t) => t.statusTypeCode === "SERVICE_PRODUCT");
        if (productStatusType) {
          const statusRows = await listCommonStatuses({ tenantId, commonStatusTypeId: productStatusType.commonStatusTypeId, activeOnly: true });
          if (!cancelled) {
            setStatuses(statusRows);
            if (!isEdit) {
              setValue("commonStatusId", statusRows.find((s) => s.isInitial)?.commonStatusId ?? statusRows[0]?.commonStatusId ?? 0);
            }
          }
        }
      })
      .finally(() => {
        if (!cancelled) setBootLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  useEffect(() => {
    if (!serviceTypeIdWatch || tenantId <= 0) {
      setClassifications([]);
      setCategories([]);
      setExistingRows([]);
      return;
    }
    let cancelled = false;
    Promise.all([
      listServiceProductClassifications({ tenantId, serviceTypeId: serviceTypeIdWatch, activeOnly: true }),
      listServiceProductCategories({ tenantId, serviceTypeId: serviceTypeIdWatch, activeOnly: true }),
      listServiceProducts({ tenantId, serviceTypeId: serviceTypeIdWatch }),
    ]).then(([classificationRows, categoryRows, productRows]) => {
      if (cancelled) return;
      setClassifications(classificationRows);
      setCategories(categoryRows);
      setExistingRows(productRows);
    });
    return () => {
      cancelled = true;
    };
  }, [serviceTypeIdWatch, tenantId]);

  useEffect(() => {
    if (!countryIdWatch) {
      setCities([]);
      return;
    }
    let cancelled = false;
    listCities({ countryId: countryIdWatch, activeOnly: true }).then((rows) => {
      if (!cancelled) setCities(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [countryIdWatch]);

  async function onSubmit(values: FormValues) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    if (!tenantId || !companyId) {
      toast.error("Missing tenant/company scope — sign in again.");
      return;
    }
    const payload = {
      serviceProductCode: values.serviceProductCode.trim(),
      serviceProductName: values.serviceProductName.trim(),
      serviceTypeId: values.serviceTypeId,
      serviceProductClassificationId: values.serviceProductClassificationId,
      serviceProductCategoryId: values.serviceProductCategoryId,
      supplierId: values.supplierId,
      countryId: values.countryId,
      regionId: values.regionId,
      cityId: values.cityId,
      shortDescription: isBlankHtml(values.shortDescription) ? undefined : values.shortDescription,
      description: isBlankHtml(values.description) ? undefined : values.description,
      isOnlineSellable: values.isOnlineSellable,
      isFeatured: values.isFeatured,
      displayOrder: values.displayOrder,
      commonStatusId: values.commonStatusId,
      tenantId,
      companyId,
    };
    try {
      if (isEdit && serviceProduct) {
        const saved = await updateServiceProduct(serviceProduct.serviceProductId, {
          ...payload,
          statusChangeRemarks: values.statusChangeRemarks || undefined,
          isActive: serviceProduct.isActive,
          modifiedBy: actorKey,
        });
        toast.success("Product updated");
        router.push(`/${role}/masters/service-product/${saved.serviceProductId}`);
      } else {
        const saved = await createServiceProduct({ ...payload, createdBy: actorKey });
        toast.success("Product created");
        router.push(`/${role}/masters/service-product/${saved.serviceProductId}`);
      }
    } catch (error) {
      toast.error(error instanceof ServiceProductsApiError ? error.message : "Could not save product");
    }
  }

  if (bootLoading) {
    return (
      <Card className="max-w-xl">
        <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Preparing product form…
        </CardContent>
      </Card>
    );
  }

  if (tenantId <= 0) {
    return (
      <Card className="max-w-xl">
        <CardContent className="space-y-3 py-6">
          <p className="font-medium">Tenant scope required</p>
          <p className="text-sm text-muted-foreground">Select a tenant workspace before creating products.</p>
          <Button variant="outline" nativeButton={false} render={<Link href={`/${role}/masters/service-product`} />}>
            Back to list
          </Button>
        </CardContent>
      </Card>
    );
  }

  const cancelHref =
    isEdit && serviceProduct
      ? `/${role}/masters/service-product/${serviceProduct.serviceProductId}`
      : `/${role}/masters/service-product`;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="min-w-0 max-w-3xl space-y-5" noValidate>
      <Section icon={Package} title="Identity" description="Core identifiers, classification, and commercial flags.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label required>Service type</Label>
            <Controller
              control={control}
              name="serviceTypeId"
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : ""}
                  onValueChange={(v) => {
                    field.onChange(Number(v));
                    setValue("serviceProductClassificationId", 0);
                    setValue("serviceProductCategoryId", null);
                  }}
                  disabled={isEdit}
                >
                  <SelectTrigger className="h-10 w-full min-w-0" aria-invalid={!!errors.serviceTypeId}>
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
              )}
            />
            {errors.serviceTypeId && <p className="text-sm text-destructive">{errors.serviceTypeId.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="serviceProductCode" required>
              Code
            </Label>
            <Input
              id="serviceProductCode"
              placeholder="e.g. DOHA_DESERT_SAFARI"
              aria-invalid={!!errors.serviceProductCode}
              {...register("serviceProductCode")}
            />
            {errors.serviceProductCode && <p className="text-sm text-destructive">{errors.serviceProductCode.message}</p>}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="serviceProductName" required>
              Name
            </Label>
            <Input
              id="serviceProductName"
              placeholder="e.g. Doha Desert Safari"
              aria-invalid={!!errors.serviceProductName}
              {...register("serviceProductName")}
            />
            {errors.serviceProductName && <p className="text-sm text-destructive">{errors.serviceProductName.message}</p>}
          </div>

          <div className="space-y-2">
            <Label required>Classification</Label>
            <Controller
              control={control}
              name="serviceProductClassificationId"
              render={({ field }) => (
                <Select value={field.value ? String(field.value) : ""} onValueChange={(v) => field.onChange(Number(v))} disabled={!serviceTypeIdWatch}>
                  <SelectTrigger className="h-10 w-full min-w-0" aria-invalid={!!errors.serviceProductClassificationId}>
                    <SelectValue>
                      {(value: string | null) => {
                        if (!serviceTypeIdWatch) return "Select service type first";
                        if (!value) return "Select classification";
                        return classifications.find((c) => String(c.serviceProductClassificationId) === value)?.classificationName ?? value;
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {classifications.map((c) => (
                      <SelectItem key={c.serviceProductClassificationId} value={String(c.serviceProductClassificationId)}>
                        {c.classificationName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.serviceProductClassificationId && (
              <p className="text-sm text-destructive">{errors.serviceProductClassificationId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Controller
              control={control}
              name="serviceProductCategoryId"
              render={({ field }) => (
                <Select
                  value={field.value == null ? NONE_OPTION : String(field.value)}
                  onValueChange={(v) => field.onChange(!v || v === NONE_OPTION ? null : Number(v))}
                  disabled={!serviceTypeIdWatch}
                >
                  <SelectTrigger className="h-10 w-full min-w-0">
                    <SelectValue>
                      {(value: string | null) => {
                        if (!value || value === NONE_OPTION) return "None";
                        return categories.find((c) => String(c.serviceProductCategoryId) === value)?.categoryName ?? "None";
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_OPTION}>None</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.serviceProductCategoryId} value={String(c.serviceProductCategoryId)}>
                        {c.categoryName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label>Primary supplier</Label>
            <Controller
              control={control}
              name="supplierId"
              render={({ field }) => (
                <Select
                  value={field.value == null ? NONE_OPTION : String(field.value)}
                  onValueChange={(v) => field.onChange(!v || v === NONE_OPTION ? null : Number(v))}
                >
                  <SelectTrigger className="h-10 w-full min-w-0">
                    <SelectValue>
                      {(value: string | null) => {
                        if (!value || value === NONE_OPTION) return "None";
                        return suppliers.find((s) => String(s.supplierKey) === value)?.name ?? "None";
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_OPTION}>None</SelectItem>
                    {suppliers.map((s) => (
                      <SelectItem key={s.supplierKey} value={String(s.supplierKey)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label required>Status</Label>
            <Controller
              control={control}
              name="commonStatusId"
              render={({ field }) => (
                <Select value={field.value ? String(field.value) : ""} onValueChange={(v) => field.onChange(Number(v))}>
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

          {isEdit && (
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="statusChangeRemarks">Status change remarks (optional)</Label>
              <Input id="statusChangeRemarks" placeholder="Only recorded if the status changes" {...register("statusChangeRemarks")} />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="displayOrder">Display order</Label>
            <Input id="displayOrder" type="number" min={0} {...register("displayOrder")} />
          </div>

          <div className="flex items-center gap-4 pb-2">
            <Controller
              control={control}
              name="isOnlineSellable"
              render={({ field }) => (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} />
                  Online sellable
                </label>
              )}
            />
            <Controller
              control={control}
              name="isFeatured"
              render={({ field }) => (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} />
                  Featured
                </label>
              )}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="shortDescription">Short description</Label>
            <Controller
              control={control}
              name="shortDescription"
              render={({ field }) => (
                <HelpdeskRichComposer
                  html={field.value ?? ""}
                  onChange={({ html }) => field.onChange(html)}
                  placeholder="A brief summary shown in listings and cards…"
                  className="min-h-[100px]"
                />
              )}
            />
            {errors.shortDescription && <p className="text-sm text-destructive">{errors.shortDescription.message}</p>}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">Full description</Label>
            <Controller
              control={control}
              name="description"
              render={({ field }) => (
                <HelpdeskRichComposer
                  html={field.value ?? ""}
                  onChange={({ html }) => field.onChange(html)}
                  placeholder="Full product description shown on the product page…"
                />
              )}
            />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>
        </div>
      </Section>

      <Section icon={MapPin} title="Location" description="Where this product is primarily offered (optional).">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Country</Label>
            <Controller
              control={control}
              name="countryId"
              render={({ field }) => (
                <Select
                  value={field.value == null ? NONE_OPTION : String(field.value)}
                  onValueChange={(v) => {
                    field.onChange(!v || v === NONE_OPTION ? null : Number(v));
                    setValue("cityId", null);
                  }}
                >
                  <SelectTrigger className="h-10 w-full min-w-0">
                    <SelectValue>
                      {(value: string | null) => {
                        if (!value || value === NONE_OPTION) return "None";
                        return countries.find((c) => String(c.countryKey) === value)?.name ?? "None";
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_OPTION}>None</SelectItem>
                    {countries.map((c) => (
                      <SelectItem key={c.countryKey} value={String(c.countryKey)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label>City</Label>
            <Controller
              control={control}
              name="cityId"
              render={({ field }) => (
                <Select
                  value={field.value == null ? NONE_OPTION : String(field.value)}
                  onValueChange={(v) => field.onChange(!v || v === NONE_OPTION ? null : Number(v))}
                  disabled={!countryIdWatch}
                >
                  <SelectTrigger className="h-10 w-full min-w-0">
                    <SelectValue>
                      {(value: string | null) => {
                        if (!countryIdWatch) return "Select country first";
                        if (!value || value === NONE_OPTION) return "None";
                        return cities.find((c) => String(c.cityKey) === value)?.name ?? "None";
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_OPTION}>None</SelectItem>
                    {cities.map((c) => (
                      <SelectItem key={c.cityKey} value={String(c.cityKey)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label>Region</Label>
            <Controller
              control={control}
              name="regionId"
              render={({ field }) => (
                <Select
                  value={field.value == null ? NONE_OPTION : String(field.value)}
                  onValueChange={(v) => field.onChange(!v || v === NONE_OPTION ? null : Number(v))}
                >
                  <SelectTrigger className="h-10 w-full min-w-0">
                    <SelectValue>
                      {(value: string | null) => {
                        if (!value || value === NONE_OPTION) return "None";
                        return regions.find((r) => String(r.regionId) === value)?.regionName ?? "None";
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_OPTION}>None</SelectItem>
                    {regions.map((r) => (
                      <SelectItem key={r.regionId} value={String(r.regionId)}>
                        {r.regionName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
      </Section>

      {!isEdit && (
        <div className="flex items-start gap-2 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p>
            Save the product first — Options, Variants, Suppliers, Availability, Schedules, Rates, Locations, Media, and
            Itinerary are managed from their own masters once the product exists.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isEdit ? "Save changes" : "Create product"}
        </Button>
        <Button type="button" variant="outline" nativeButton={false} render={<Link href={cancelHref} />}>
          <X className="h-4 w-4" />
          Cancel
        </Button>
      </div>
    </form>
  );
}
