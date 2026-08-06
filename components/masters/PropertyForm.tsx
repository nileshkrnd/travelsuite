"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import {
  Building2,
  Hotel,
  MapPin,
  Save,
  X,
  Loader2,
  Globe2,
  Info,
  Tags,
  Navigation,
  Lock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Section } from "@/components/masters/PropertyFormSection";
import {
  MediaTab,
  AmenitiesTab,
  FacilitiesTab,
  SupportedCardPaymentTab,
  NearByAreaTab,
  NearByActivitiesTab,
  PoliciesTab,
  FrequentlyAskedQuestionsTab,
} from "@/components/masters/PropertyExtrasTabs";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { useUsersStore } from "@/lib/store/users.store";
import { listCompanies } from "@/lib/services/db-companies.service";
import { listCountries } from "@/lib/services/countries.service";
import { listCities } from "@/lib/services/cities.service";
import { listPropertyTypes } from "@/lib/services/property-types.service";
import { listPropertyCategories } from "@/lib/services/property-categories.service";
import { listPropertyUsages } from "@/lib/services/property-usages.service";
import { listOwnershipTypes } from "@/lib/services/ownership-types.service";
import { listPropertyBrands } from "@/lib/services/property-brands.service";
import {
  createProperty,
  updateProperty,
  listProperties,
  PropertiesApiError,
} from "@/lib/services/properties.service";
import { resolveSessionCompanyKey, shouldLockSessionCompany } from "@/lib/session-company";
import { cn } from "@/lib/utils";
import type {
  City,
  Country,
  OwnershipType,
  Property,
  PropertyBrand,
  PropertyCategory,
  PropertyType,
  PropertyUsage,
} from "@/types";

const NONE = "__none__";

function optionalId() {
  return z.preprocess(
    (v) => (v === "" || v === NONE || v === 0 || v == null ? null : Number(v)),
    z.number().int().positive().nullable()
  );
}

function optionalNumber() {
  return z.preprocess(
    (v) => (v === "" || v == null ? null : Number(v)),
    z.number().nullable()
  );
}

const schema = z
  .object({
    companyId: z.number().int().positive(),
    propertyCode: z.string().trim().min(1, "Property code is required").max(50),
    propertyName: z.string().trim().max(250).optional().or(z.literal("")),
    propertyDisplayName: z.string().trim().max(250).optional().or(z.literal("")),
    shortDescription: z.string().trim().max(2000).optional().or(z.literal("")),
    description: z.string().trim().max(20000).optional().or(z.literal("")),
    internalRemarks: z.string().trim().max(20000).optional().or(z.literal("")),
    propertyTypeIds: z.array(z.number().int().positive()).min(1, "Select at least one property type"),
    propertyCategoryIds: z.array(z.number().int().positive()),
    propertyUsageId: optionalId(),
    ownershipTypeId: optionalId(),
    propertyBrandId: optionalId(),
    addressLine1: z.string().trim().max(255).optional().or(z.literal("")),
    addressLine2: z.string().trim().max(255).optional().or(z.literal("")),
    buildingName: z.string().trim().max(150).optional().or(z.literal("")),
    buildingNumber: z.string().trim().max(50).optional().or(z.literal("")),
    streetName: z.string().trim().max(150).optional().or(z.literal("")),
    streetNumber: z.string().trim().max(20).optional().or(z.literal("")),
    zoneNumber: z.string().trim().max(20).optional().or(z.literal("")),
    countryId: z.number().int().positive("Country is required"),
    stateId: optionalId(),
    cityId: optionalId(),
    areaId: optionalId(),
    locationId: optionalId(),
    postalCode: z.string().trim().max(20).optional().or(z.literal("")),
    poBox: z.string().trim().max(50).optional().or(z.literal("")),
    landmark: z.string().trim().max(255).optional().or(z.literal("")),
    latitude: z.preprocess(
      (v) => (v === "" || v == null ? null : Number(v)),
      z.number().min(-90).max(90).nullable()
    ),
    longitude: z.preprocess(
      (v) => (v === "" || v == null ? null : Number(v)),
      z.number().min(-180).max(180).nullable()
    ),
    googlePlaceId: z.string().trim().max(255).optional().or(z.literal("")),
    googleMapUrl: z.string().trim().max(20000).optional().or(z.literal("")),
    plusCode: z.string().trim().max(50).optional().or(z.literal("")),
    timeZoneId: optionalId(),
    openingDate: z.string().optional().or(z.literal("")),
    closingDate: z.string().optional().or(z.literal("")),
    rating: optionalNumber().pipe(z.number().min(0).max(9.99).nullable()),
    starRating: z.preprocess(
      (v) => (v === "" || v == null ? null : Number(v)),
      z.number().int().min(0).max(7).nullable()
    ),
    isFeatured: z.boolean(),
    isPublished: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (values.openingDate && values.closingDate && values.closingDate < values.openingDate) {
      ctx.addIssue({
        code: "custom",
        path: ["closingDate"],
        message: "Closing date must be on or after opening date",
      });
    }
  });

type FormValues = z.infer<typeof schema>;

function emptyValues(companyId: number): FormValues {
  return {
    companyId,
    propertyCode: "",
    propertyName: "",
    propertyDisplayName: "",
    shortDescription: "",
    description: "",
    internalRemarks: "",
    propertyTypeIds: [],
    propertyCategoryIds: [],
    propertyUsageId: null,
    ownershipTypeId: null,
    propertyBrandId: null,
    addressLine1: "",
    addressLine2: "",
    buildingName: "",
    buildingNumber: "",
    streetName: "",
    streetNumber: "",
    zoneNumber: "",
    countryId: 0,
    stateId: null,
    cityId: null,
    areaId: null,
    locationId: null,
    postalCode: "",
    poBox: "",
    landmark: "",
    latitude: null,
    longitude: null,
    googlePlaceId: "",
    googleMapUrl: "",
    plusCode: "",
    timeZoneId: null,
    openingDate: "",
    closingDate: "",
    rating: null,
    starRating: null,
    isFeatured: false,
    isPublished: false,
  };
}

function valuesFromProperty(p: Property): FormValues {
  return {
    companyId: p.companyId,
    propertyCode: p.propertyCode,
    propertyName: p.propertyName ?? "",
    propertyDisplayName: p.propertyDisplayName ?? "",
    shortDescription: p.shortDescription ?? "",
    description: p.description ?? "",
    internalRemarks: p.internalRemarks ?? "",
    propertyTypeIds: p.propertyTypeIds,
    propertyCategoryIds: p.propertyCategoryIds,
    propertyUsageId: p.propertyUsageId,
    ownershipTypeId: p.ownershipTypeId,
    propertyBrandId: p.propertyBrandId,
    addressLine1: p.addressLine1 ?? "",
    addressLine2: p.addressLine2 ?? "",
    buildingName: p.buildingName ?? "",
    buildingNumber: p.buildingNumber ?? "",
    streetName: p.streetName ?? "",
    streetNumber: p.streetNumber ?? "",
    zoneNumber: p.zoneNumber ?? "",
    countryId: p.countryId,
    stateId: p.stateId,
    cityId: p.cityId,
    areaId: p.areaId,
    locationId: p.locationId,
    postalCode: p.postalCode ?? "",
    poBox: p.poBox ?? "",
    landmark: p.landmark ?? "",
    latitude: p.latitude,
    longitude: p.longitude,
    googlePlaceId: p.googlePlaceId ?? "",
    googleMapUrl: p.googleMapUrl ?? "",
    plusCode: p.plusCode ?? "",
    timeZoneId: p.timeZoneId,
    openingDate: p.openingDate ?? "",
    closingDate: p.closingDate ?? "",
    rating: p.rating,
    starRating: p.starRating,
    isFeatured: p.isFeatured,
    isPublished: p.isPublished,
  };
}

function MultiCheckGroup({
  label,
  required,
  options,
  value,
  onChange,
  error,
}: {
  label: string;
  required?: boolean;
  options: { id: number; name: string }[];
  value: number[];
  onChange: (next: number[]) => void;
  error?: string;
}) {
  function toggle(id: number) {
    if (value.includes(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
  }
  return (
    <div className="space-y-2">
      <Label required={required}>{label}</Label>
      <div className="flex flex-wrap gap-2 rounded-lg border border-input p-3">
        {options.length === 0 ? (
          <p className="text-sm text-muted-foreground">No options available.</p>
        ) : (
          options.map((opt) => {
            const checked = value.includes(opt.id);
            return (
              <label
                key={opt.id}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
                  checked
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground hover:bg-muted/50"
                )}
              >
                <Checkbox checked={checked} onCheckedChange={() => toggle(opt.id)} />
                {opt.name}
              </label>
            );
          })
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

/** Shared Create / Modify form for Property — heart of the product inventory. */
export function PropertyForm({ property }: { property?: Property }) {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();
  const sessionUser = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const activeTenant = useTenantStore((s) => s.tenant);
  const isEdit = !!property;
  const actorKey = sessionUser
    ? (users.find((u) => u.id === sessionUser.id)?.userKey ?? sessionUser.userKey ?? 0)
    : 0;
  const tenantKey = sessionUser?.tenantKey ?? activeTenant.tenantKey ?? 0;

  const [countries, setCountries] = useState<Country[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [types, setTypes] = useState<PropertyType[]>([]);
  const [categories, setCategories] = useState<PropertyCategory[]>([]);
  const [usages, setUsages] = useState<PropertyUsage[]>([]);
  const [ownerships, setOwnerships] = useState<OwnershipType[]>([]);
  const [brands, setBrands] = useState<PropertyBrand[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [bootLoading, setBootLoading] = useState(true);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [companyIdResolved, setCompanyIdResolved] = useState(0);
  const [activeTab, setActiveTab] = useState("details");

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    mode: "onBlur",
    defaultValues: property ? valuesFromProperty(property) : emptyValues(0),
  });

  const countryId = useWatch({ control, name: "countryId" });
  const nameWatch = useWatch({ control, name: "propertyName" });
  const codeWatch = useWatch({ control, name: "propertyCode" });
  const displayWatch = useWatch({ control, name: "propertyDisplayName" });
  const typeIdsWatch = useWatch({ control, name: "propertyTypeIds" });

  useEffect(() => {
    if (property) reset(valuesFromProperty(property));
  }, [property?.propertyId, property, reset]);

  useEffect(() => {
    if (tenantKey <= 0) {
      setBootLoading(false);
      return;
    }
    let cancelled = false;
    setBootLoading(true);
    void (async () => {
      try {
        const [companyRows, countryRows, propertyRows] = await Promise.all([
          listCompanies({ tenantId: tenantKey, activeOnly: true }),
          listCountries({ activeOnly: true }),
          listProperties({ tenantId: tenantKey }),
        ]);
        if (cancelled) return;
        setCountries(countryRows);
        setProperties(propertyRows);
        const scoped = companyRows.filter((c) => c.companyKey > 0);
        const { companyId: locked } = shouldLockSessionCompany(sessionUser, scoped);
        const companyId =
          property?.companyId ||
          resolveSessionCompanyKey(sessionUser) ||
          locked ||
          (scoped.length === 1 ? scoped[0]!.companyKey : 0);
        setCompanyIdResolved(companyId);
        if (companyId > 0) setValue("companyId", companyId, { shouldValidate: true });
        if (!property && countryRows.length) {
          const qa = countryRows.find((c) => c.code === "QA");
          if (qa) setValue("countryId", qa.countryKey, { shouldValidate: false });
        }
      } finally {
        if (!cancelled) setBootLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantKey, sessionUser, property, setValue]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [typeRows, catRows, usageRows, ownRows, brandRows] = await Promise.all([
          listPropertyTypes({ activeOnly: true }),
          listPropertyCategories({ activeOnly: true }),
          listPropertyUsages({ activeOnly: true }),
          listOwnershipTypes({ activeOnly: true }),
          listPropertyBrands({ activeOnly: true }),
        ]);
        if (cancelled) return;
        setTypes(typeRows);
        setCategories(catRows);
        setUsages(usageRows);
        setOwnerships(ownRows);
        setBrands(brandRows);
      } catch {
        if (!cancelled) toast.error("Failed to load property lookups");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!countryId) {
      setCities([]);
      return;
    }
    let cancelled = false;
    setCitiesLoading(true);
    listCities({ countryId, activeOnly: true })
      .then((rows) => {
        if (cancelled) return;
        setCities(rows);
        const current = getValues("cityId");
        if (current && !rows.some((c) => c.cityKey === current)) {
          setValue("cityId", null, { shouldValidate: false });
        }
      })
      .catch(() => {
        if (!cancelled) setCities([]);
      })
      .finally(() => {
        if (!cancelled) setCitiesLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryId]);

  const previewTitle = useMemo(
    () => displayWatch?.trim() || nameWatch?.trim() || codeWatch?.trim() || "New property",
    [displayWatch, nameWatch, codeWatch]
  );
  const previewTypes = useMemo(
    () => types.filter((t) => (typeIdsWatch ?? []).includes(t.key)).map((t) => t.name),
    [types, typeIdsWatch]
  );

  async function onSubmit(values: FormValues) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    if (!values.companyId) {
      toast.error("Your user must be assigned to a company.");
      return;
    }
    const duplicate = properties.some(
      (p) =>
        p.companyId === values.companyId &&
        p.propertyCode.toLowerCase() === values.propertyCode.trim().toLowerCase() &&
        (!isEdit || p.propertyId !== property?.propertyId)
    );
    if (duplicate) {
      toast.error("This property code already exists for the company");
      return;
    }

    const payload = {
      tenantId: tenantKey,
      companyId: values.companyId,
      propertyCode: values.propertyCode.trim(),
      propertyName: values.propertyName?.trim() || null,
      propertyDisplayName: values.propertyDisplayName?.trim() || null,
      shortDescription: values.shortDescription?.trim() || null,
      description: values.description?.trim() || null,
      internalRemarks: values.internalRemarks?.trim() || null,
      propertyTypeIds: values.propertyTypeIds,
      propertyCategoryIds: values.propertyCategoryIds,
      propertyUsageId: values.propertyUsageId,
      ownershipTypeId: values.ownershipTypeId,
      propertyBrandId: values.propertyBrandId,
      addressLine1: values.addressLine1?.trim() || null,
      addressLine2: values.addressLine2?.trim() || null,
      buildingName: values.buildingName?.trim() || null,
      buildingNumber: values.buildingNumber?.trim() || null,
      streetName: values.streetName?.trim() || null,
      streetNumber: values.streetNumber?.trim() || null,
      zoneNumber: values.zoneNumber?.trim() || null,
      countryId: values.countryId,
      stateId: values.stateId,
      cityId: values.cityId,
      areaId: values.areaId,
      locationId: values.locationId,
      postalCode: values.postalCode?.trim() || null,
      poBox: values.poBox?.trim() || null,
      landmark: values.landmark?.trim() || null,
      latitude: values.latitude,
      longitude: values.longitude,
      googlePlaceId: values.googlePlaceId?.trim() || null,
      googleMapUrl: values.googleMapUrl?.trim() || null,
      plusCode: values.plusCode?.trim() || null,
      timeZoneId: values.timeZoneId,
      openingDate: values.openingDate || null,
      closingDate: values.closingDate || null,
      rating: values.rating,
      starRating: values.starRating,
      isFeatured: values.isFeatured,
      isPublished: values.isPublished,
    };

    try {
      if (isEdit && property) {
        const saved = await updateProperty(property.propertyId, {
          ...payload,
          isActive: property.isActive,
          modifiedBy: actorKey,
        });
        toast.success("Property updated");
        router.push(`/${role}/masters/property/${saved.propertyId}`);
      } else {
        const saved = await createProperty({ ...payload, createdBy: actorKey });
        toast.success("Property created — add media, amenities, and other optional details next");
        router.push(`/${role}/masters/property/${saved.propertyId}/edit`);
      }
    } catch (error) {
      toast.error(error instanceof PropertiesApiError ? error.message : "Could not save property");
    }
  }

  if (bootLoading) {
    return (
      <Card className="max-w-xl">
        <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Preparing property form…
        </CardContent>
      </Card>
    );
  }

  if (!companyIdResolved && !isEdit) {
    return (
      <Card className="max-w-xl">
        <CardContent className="space-y-3 py-6">
          <p className="font-medium">Company required</p>
          <p className="text-sm text-muted-foreground">
            Assign a company to your user session before creating properties.
          </p>
          <Button variant="outline" nativeButton={false} render={<Link href={`/${role}/masters/property`} />}>
            Back to list
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,280px)] lg:items-start" noValidate>
      <div className="min-w-0 space-y-5">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v ?? "details")}>
          <div className="overflow-x-auto">
            <TabsList variant="line" className="w-max">
              <TabsTrigger value="details">Property Details</TabsTrigger>
              <TabsTrigger value="media" disabled={!isEdit}>
                {!isEdit && <Lock className="h-3 w-3" />}
                Media
              </TabsTrigger>
              <TabsTrigger value="amenities" disabled={!isEdit}>
                {!isEdit && <Lock className="h-3 w-3" />}
                Amenities
              </TabsTrigger>
              <TabsTrigger value="facilities" disabled={!isEdit}>
                {!isEdit && <Lock className="h-3 w-3" />}
                Facilities
              </TabsTrigger>
              <TabsTrigger value="payment" disabled={!isEdit}>
                {!isEdit && <Lock className="h-3 w-3" />}
                Card Payment
              </TabsTrigger>
              <TabsTrigger value="nearbyArea" disabled={!isEdit}>
                {!isEdit && <Lock className="h-3 w-3" />}
                Near By Area
              </TabsTrigger>
              <TabsTrigger value="nearbyActivities" disabled={!isEdit}>
                {!isEdit && <Lock className="h-3 w-3" />}
                Near By Activities
              </TabsTrigger>
              <TabsTrigger value="policies" disabled={!isEdit}>
                {!isEdit && <Lock className="h-3 w-3" />}
                Policies
              </TabsTrigger>
              <TabsTrigger value="faq" disabled={!isEdit}>
                {!isEdit && <Lock className="h-3 w-3" />}
                FAQs
              </TabsTrigger>
            </TabsList>
          </div>
          {!isEdit && (
            <p className="mt-2 text-xs text-muted-foreground">
              Save the property details below to unlock Media, Amenities, and the other optional sections.
            </p>
          )}

          <TabsContent value="details" className="mt-4 space-y-5">
        <Section icon={Hotel} title="Identity" description="Core property identifiers and publishing flags.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="propertyCode" required>
                Property code
              </Label>
              <Input id="propertyCode" className="h-10" aria-invalid={!!errors.propertyCode} {...register("propertyCode")} />
              {errors.propertyCode && <p className="text-sm text-destructive">{errors.propertyCode.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="propertyDisplayName">Display name</Label>
              <Input id="propertyDisplayName" className="h-10" {...register("propertyDisplayName")} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="propertyName">Property name</Label>
              <Input id="propertyName" className="h-10" {...register("propertyName")} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="shortDescription">Short description</Label>
              <Textarea id="shortDescription" rows={2} {...register("shortDescription")} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={4} {...register("description")} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="internalRemarks">Internal remarks</Label>
              <Textarea id="internalRemarks" rows={2} {...register("internalRemarks")} />
            </div>
            <div className="flex flex-wrap gap-6 sm:col-span-2">
              <Controller
                control={control}
                name="isFeatured"
                render={({ field }) => (
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={field.value} onCheckedChange={(c) => field.onChange(c === true)} />
                    Featured
                  </label>
                )}
              />
              <Controller
                control={control}
                name="isPublished"
                render={({ field }) => (
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={field.value} onCheckedChange={(c) => field.onChange(c === true)} />
                    Published
                  </label>
                )}
              />
            </div>
          </div>
        </Section>

        <Section icon={Tags} title="Classification" description="Types, categories, brand and commercial attributes.">
          <div className="space-y-4">
            <Controller
              control={control}
              name="propertyTypeIds"
              render={({ field }) => (
                <MultiCheckGroup
                  label="Property types"
                  required
                  options={types.map((t) => ({ id: t.key, name: t.name }))}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.propertyTypeIds?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="propertyCategoryIds"
              render={({ field }) => (
                <MultiCheckGroup
                  label="Categories"
                  options={categories.map((c) => ({ id: c.key, name: c.name }))}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Usage</Label>
                <Controller
                  control={control}
                  name="propertyUsageId"
                  render={({ field }) => (
                    <Select
                      value={field.value ? String(field.value) : NONE}
                      onValueChange={(v) => field.onChange(v === NONE ? null : Number(v))}
                    >
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue>
                          {(value: string | null) => {
                            if (!value || value === NONE) return "None";
                            const row = usages.find((u) => String(u.key) === value);
                            return row ? row.name : value;
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>None</SelectItem>
                        {usages.map((u) => (
                          <SelectItem key={u.id} value={String(u.key)}>
                            {u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Ownership</Label>
                <Controller
                  control={control}
                  name="ownershipTypeId"
                  render={({ field }) => (
                    <Select
                      value={field.value ? String(field.value) : NONE}
                      onValueChange={(v) => field.onChange(v === NONE ? null : Number(v))}
                    >
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue>
                          {(value: string | null) => {
                            if (!value || value === NONE) return "None";
                            const row = ownerships.find((o) => String(o.key) === value);
                            return row ? row.name : value;
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>None</SelectItem>
                        {ownerships.map((o) => (
                          <SelectItem key={o.id} value={String(o.key)}>
                            {o.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Brand</Label>
                <Controller
                  control={control}
                  name="propertyBrandId"
                  render={({ field }) => (
                    <Select
                      value={field.value ? String(field.value) : NONE}
                      onValueChange={(v) => field.onChange(v === NONE ? null : Number(v))}
                    >
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue>
                          {(value: string | null) => {
                            if (!value || value === NONE) return "None";
                            const row = brands.find((b) => String(b.key) === value);
                            return row ? row.name : value;
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>None</SelectItem>
                        {brands.map((b) => (
                          <SelectItem key={b.id} value={String(b.key)}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="starRating">Star rating</Label>
                <Input id="starRating" type="number" min={0} max={7} className="h-10" {...register("starRating")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rating">Guest rating</Label>
                <Input id="rating" type="number" step="0.01" min={0} max={9.99} className="h-10" {...register("rating")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="openingDate">Opening date</Label>
                <Input id="openingDate" type="date" className="h-10" {...register("openingDate")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="closingDate">Closing date</Label>
                <Input id="closingDate" type="date" className="h-10" {...register("closingDate")} />
                {errors.closingDate && <p className="text-sm text-destructive">{errors.closingDate.message}</p>}
              </div>
            </div>
          </div>
        </Section>

        <Section icon={MapPin} title="Address" description="Physical address used for booking, maps and operations.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="addressLine1">Address line 1</Label>
              <Input id="addressLine1" className="h-10" {...register("addressLine1")} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="addressLine2">Address line 2</Label>
              <Input id="addressLine2" className="h-10" {...register("addressLine2")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="buildingName">Building name</Label>
              <Input id="buildingName" className="h-10" {...register("buildingName")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="buildingNumber">Building number</Label>
              <Input id="buildingNumber" className="h-10" {...register("buildingNumber")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="streetName">Street name</Label>
              <Input id="streetName" className="h-10" {...register("streetName")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="streetNumber">Street number</Label>
              <Input id="streetNumber" className="h-10" {...register("streetNumber")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zoneNumber">Zone number</Label>
              <Input id="zoneNumber" className="h-10" {...register("zoneNumber")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postalCode">Postal code</Label>
              <Input id="postalCode" className="h-10" {...register("postalCode")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="poBox">PO Box</Label>
              <Input id="poBox" className="h-10" {...register("poBox")} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="landmark">Landmark</Label>
              <Input id="landmark" className="h-10" {...register("landmark")} />
            </div>
            <div className="space-y-2">
              <Label required>Country</Label>
              <Controller
                control={control}
                name="countryId"
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(v) => {
                      field.onChange(Number(v));
                      setValue("cityId", null, { shouldValidate: false });
                    }}
                  >
                    <SelectTrigger className="h-10 w-full" aria-invalid={!!errors.countryId}>
                      <Globe2 className="h-4 w-4 text-muted-foreground" />
                      <SelectValue>
                        {(value: string | null) => {
                          if (!value) return "Select country";
                          return countries.find((c) => String(c.countryKey) === value)?.name ?? value;
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((c) => (
                        <SelectItem key={c.id} value={String(c.countryKey)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.countryId && <p className="text-sm text-destructive">{errors.countryId.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Controller
                control={control}
                name="cityId"
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : NONE}
                    onValueChange={(v) => field.onChange(v === NONE ? null : Number(v))}
                    disabled={!countryId || citiesLoading}
                  >
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue>
                        {(value: string | null) => {
                          if (!value || value === NONE) return citiesLoading ? "Loading…" : "Optional";
                          return cities.find((c) => String(c.cityKey) === value)?.name ?? value;
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>None</SelectItem>
                      {cities.map((c) => (
                        <SelectItem key={c.id} value={String(c.cityKey)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stateId">State ID</Label>
              <Input id="stateId" type="number" className="h-10" placeholder="Optional" {...register("stateId")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="areaId">Area ID</Label>
              <Input id="areaId" type="number" className="h-10" placeholder="Optional" {...register("areaId")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="locationId">Location ID</Label>
              <Input id="locationId" type="number" className="h-10" placeholder="Optional" {...register("locationId")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeZoneId">Time zone ID</Label>
              <Input id="timeZoneId" type="number" className="h-10" placeholder="Optional" {...register("timeZoneId")} />
            </div>
          </div>
        </Section>

        <Section icon={Navigation} title="Map & coordinates" description="Geo references for maps, channels and distance search.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="latitude">Latitude</Label>
              <Input id="latitude" type="number" step="0.000001" className="h-10" {...register("latitude")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="longitude">Longitude</Label>
              <Input id="longitude" type="number" step="0.000001" className="h-10" {...register("longitude")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plusCode">Plus code</Label>
              <Input id="plusCode" className="h-10" {...register("plusCode")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="googlePlaceId">Google Place ID</Label>
              <Input id="googlePlaceId" className="h-10" {...register("googlePlaceId")} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="googleMapUrl">Google Map URL</Label>
              <Input id="googleMapUrl" className="h-10" {...register("googleMapUrl")} />
            </div>
          </div>
        </Section>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEdit ? "Save changes" : "Create property"}
          </Button>
          <Button
            type="button"
            variant="outline"
            nativeButton={false}
            render={
              <Link
                href={
                  isEdit && property
                    ? `/${role}/masters/property/${property.propertyId}`
                    : `/${role}/masters/property`
                }
              />
            }
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
        </div>
          </TabsContent>

          <TabsContent value="media" className="mt-4">
            <MediaTab />
          </TabsContent>
          <TabsContent value="amenities" className="mt-4">
            <AmenitiesTab />
          </TabsContent>
          <TabsContent value="facilities" className="mt-4">
            <FacilitiesTab />
          </TabsContent>
          <TabsContent value="payment" className="mt-4">
            <SupportedCardPaymentTab />
          </TabsContent>
          <TabsContent value="nearbyArea" className="mt-4">
            <NearByAreaTab />
          </TabsContent>
          <TabsContent value="nearbyActivities" className="mt-4">
            <NearByActivitiesTab />
          </TabsContent>
          <TabsContent value="policies" className="mt-4">
            <PoliciesTab />
          </TabsContent>
          <TabsContent value="faq" className="mt-4">
            <FrequentlyAskedQuestionsTab />
          </TabsContent>
        </Tabs>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6">
        <Card className="overflow-hidden p-0">
          <div className="flex h-28 items-end bg-gradient-to-br from-[#001C35] via-[#0a3558] to-[#1a5a7a] p-4 text-white">
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold">{previewTitle}</p>
              <p className="truncate text-sm text-white/75">{codeWatch?.trim() || "Code"}</p>
            </div>
          </div>
          <CardContent className="space-y-3 pt-4">
            <div className="flex flex-wrap gap-1.5">
              {previewTypes.length ? (
                previewTypes.map((n) => (
                  <Badge key={n} variant="secondary">
                    {n}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">Select property types</span>
              )}
            </div>
            <div className="flex items-start gap-2 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p>
                Property is the core inventory master. Keep the code stable — channels and bookings will key off it.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              Session company scoped
            </div>
          </CardContent>
        </Card>
      </aside>
    </form>
  );
}
