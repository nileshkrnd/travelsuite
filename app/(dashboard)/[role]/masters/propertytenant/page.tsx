"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Plus,
  UserSquare2,
  Eye,
  Pencil,
  Power,
  PowerOff,
  Trash2,
  X,
  Search,
  Loader2,
  FileCheck2,
  MapPinned,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore, isPlatformMode } from "@/lib/store/tenant.store";
import { useUsersStore } from "@/lib/store/users.store";
import { resolveSessionCompanyKey } from "@/lib/session-company";
import { listPropertyTenantTypes, PropertyTenantTypesApiError } from "@/lib/services/property-tenant-types.service";
import { listCountries } from "@/lib/services/countries.service";
import { listCities } from "@/lib/services/cities.service";
import { listStates } from "@/lib/services/states.service";
import { listCommonStatusTypes } from "@/lib/services/common-status-types.service";
import { listCommonStatuses } from "@/lib/services/common-statuses.service";
import { listIdentityDocumentCountries } from "@/lib/services/identity-document-countries.service";
import { listPropertyTenantAddressTypes } from "@/lib/services/property-tenant-address-types.service";
import {
  listPropertyTenants,
  createPropertyTenant,
  updatePropertyTenant,
  setPropertyTenantActive,
  deletePropertyTenant,
  PropertyTenantsApiError,
} from "@/lib/services/property-tenants.service";
import {
  listPropertyTenantDocuments,
  createPropertyTenantDocument,
  deletePropertyTenantDocument,
  PropertyTenantDocumentsApiError,
} from "@/lib/services/property-tenant-documents.service";
import {
  listPropertyTenantAddresses,
  createPropertyTenantAddress,
  deletePropertyTenantAddress,
  PropertyTenantAddressesApiError,
} from "@/lib/services/property-tenant-addresses.service";
import { can } from "@/config/permissions";
import { SUPER_ADMIN_ROLE_ID } from "@/mock/data/roles";
import type {
  RoleDef,
  PropertyTenant,
  PropertyTenantType,
  Country,
  City,
  State,
  CommonStatus,
  IdentityDocumentCountry,
  PropertyTenantAddressType,
  PropertyTenantDocument,
  PropertyTenantAddress,
} from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";
type SortKey = "tenantCode" | "tenantName";
type StatusFilter = "all" | "active" | "inactive";

const NONE_OPTION = "__none__";
const TENANT_STATUS_TYPE_CODE = "PROPERTY_TENANT";
const DOCUMENT_STATUS_TYPE_CODE = "PROPERTY_TENANT_DOCUMENT";

function useTenantSchema(rows: PropertyTenant[], currentId?: number) {
  return z
    .object({
      tenantCode: z.string().trim().min(1, "Code is required").max(50, "Must be 50 characters or fewer"),
      propertyTenantTypeId: z.number().int().positive({ message: "Type is required" }),
      tenantName: z.string().trim().min(1, "Name is required").max(250, "Must be 250 characters or fewer"),
      legalName: z.string().trim().max(250).optional().or(z.literal("")),
      registrationNumber: z.string().trim().max(100).optional().or(z.literal("")),
      taxRegistrationNumber: z.string().trim().max(100).optional().or(z.literal("")),
      nationalityId: z.number().int().positive().nullable(),
      countryOfResidenceId: z.number().int().positive().nullable(),
      countryId: z.number().int().positive({ message: "Country is required" }),
      cityId: z.number().int().positive().nullable(),
      contactPersonName: z.string().trim().max(150).optional().or(z.literal("")),
      email: z.string().trim().max(200).optional().or(z.literal("")),
      mobileCountryCode: z.string().trim().max(10).optional().or(z.literal("")),
      mobileNumber: z.string().trim().max(30).optional().or(z.literal("")),
      statusId: z.number().int().positive({ message: "Status is required" }),
    })
    .superRefine((values, ctx) => {
      const duplicateCode = rows.some(
        (r) => r.propertyTenantId !== currentId && r.tenantCode.toLowerCase() === values.tenantCode.trim().toLowerCase()
      );
      if (duplicateCode) {
        ctx.addIssue({ code: "custom", path: ["tenantCode"], message: "This tenant code already exists" });
      }
    });
}

type FormValues = z.infer<ReturnType<typeof useTenantSchema>>;

/** Compact "Identity Documents" list + add-form, embedded in the tenant panel. */
function DocumentsSection({
  propertyTenantId,
  identityDocuments,
  documentStatuses,
  userKey,
  canEdit,
}: {
  propertyTenantId: number;
  identityDocuments: IdentityDocumentCountry[];
  documentStatuses: CommonStatus[];
  userKey: number;
  canEdit: boolean;
}) {
  const [rows, setRows] = useState<PropertyTenantDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [identityDocumentCountryId, setIdentityDocumentCountryId] = useState<number | null>(null);
  const [documentNumber, setDocumentNumber] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setRows(await listPropertyTenantDocuments({ propertyTenantId }));
    } catch (error) {
      toast.error(error instanceof PropertyTenantDocumentsApiError ? error.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyTenantId]);

  const pendingStatus = documentStatuses.find((s) => s.statusCode === "PENDING");

  async function addDocument() {
    if (!identityDocumentCountryId || !documentNumber.trim()) {
      toast.error("Select a document and enter a number");
      return;
    }
    if (!pendingStatus) {
      toast.error("Document status lookup not configured");
      return;
    }
    setSaving(true);
    try {
      await createPropertyTenantDocument({
        propertyTenantId,
        identityDocumentCountryId,
        documentNumber: documentNumber.trim(),
        statusId: pendingStatus.commonStatusId,
        createdBy: userKey,
      });
      setIdentityDocumentCountryId(null);
      setDocumentNumber("");
      await load();
      toast.success("Document added");
    } catch {
      toast.error("Could not add document");
    } finally {
      setSaving(false);
    }
  }

  async function removeDocument(id: number) {
    try {
      await deletePropertyTenantDocument(id);
      await load();
      toast.success("Document removed");
    } catch {
      toast.error("Could not remove document");
    }
  }

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-2">
        <FileCheck2 className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Identity Documents</h3>
      </div>

      {canEdit && (
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1">
            <Label className="text-xs text-muted-foreground">Document</Label>
            <Select
              value={identityDocumentCountryId ? String(identityDocumentCountryId) : ""}
              onValueChange={(v) => setIdentityDocumentCountryId(v ? Number(v) : null)}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue>
                  {(value: string | null) => {
                    if (!value) return "Select document";
                    const d = identityDocuments.find((x) => String(x.identityDocumentCountryId) === value);
                    return d ? `${d.documentDisplayName} (${d.countryName})` : "Select document";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {identityDocuments.map((d) => (
                  <SelectItem key={d.identityDocumentCountryId} value={String(d.identityDocumentCountryId)}>
                    {d.documentDisplayName} ({d.countryName})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 space-y-1">
            <Label className="text-xs text-muted-foreground">Document number</Label>
            <Input className="h-9" value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} />
          </div>
          <Button type="button" size="sm" onClick={addDocument} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Add
          </Button>
        </div>
      )}

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">No documents on file.</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((d) => (
            <li key={d.propertyTenantDocumentId} className="flex items-center justify-between gap-2 rounded-md border border-border px-2.5 py-1.5 text-xs">
              <span className="flex items-center gap-1.5">
                {d.isVerified ? (
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                )}
                <span className="font-medium">{d.documentShortName ?? d.documentDisplayName}</span>
                <span className="font-mono text-muted-foreground">{d.documentNumber}</span>
                <Badge variant="outline" className="text-[10px]">
                  {d.statusName ?? "—"}
                </Badge>
              </span>
              {canEdit && (
                <Button variant="ghost" size="icon-sm" onClick={() => void removeDocument(d.propertyTenantDocumentId)} aria-label="Remove">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Compact "Addresses" list + add-form, embedded in the tenant panel. */
function AddressesSection({
  propertyTenantId,
  addressTypes,
  countries,
  userKey,
  canEdit,
}: {
  propertyTenantId: number;
  addressTypes: PropertyTenantAddressType[];
  countries: Country[];
  userKey: number;
  canEdit: boolean;
}) {
  const [rows, setRows] = useState<PropertyTenantAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [addressTypeId, setAddressTypeId] = useState<number | null>(null);
  const [addressLine1, setAddressLine1] = useState("");
  const [countryId, setCountryId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setRows(await listPropertyTenantAddresses({ propertyTenantId }));
    } catch (error) {
      toast.error(error instanceof PropertyTenantAddressesApiError ? error.message : "Failed to load addresses");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyTenantId]);

  async function addAddress() {
    if (!addressTypeId || !addressLine1.trim() || !countryId) {
      toast.error("Select a type, country, and enter address line 1");
      return;
    }
    setSaving(true);
    try {
      await createPropertyTenantAddress({
        propertyTenantId,
        propertyTenantAddressTypeId: addressTypeId,
        addressLine1: addressLine1.trim(),
        countryId,
        createdBy: userKey,
      });
      setAddressTypeId(null);
      setAddressLine1("");
      setCountryId(null);
      await load();
      toast.success("Address added");
    } catch {
      toast.error("Could not add address");
    } finally {
      setSaving(false);
    }
  }

  async function removeAddress(id: number) {
    try {
      await deletePropertyTenantAddress(id);
      await load();
      toast.success("Address removed");
    } catch {
      toast.error("Could not remove address");
    }
  }

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-2">
        <MapPinned className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Addresses</h3>
      </div>

      {canEdit && (
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="w-32 space-y-1">
            <Label className="text-xs text-muted-foreground">Type</Label>
            <Select value={addressTypeId ? String(addressTypeId) : ""} onValueChange={(v) => setAddressTypeId(v ? Number(v) : null)}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue>
                  {(value: string | null) => {
                    if (!value) return "Type";
                    return addressTypes.find((t) => String(t.propertyTenantAddressTypeId) === value)?.addressTypeName ?? "Type";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {addressTypes.map((t) => (
                  <SelectItem key={t.propertyTenantAddressTypeId} value={String(t.propertyTenantAddressTypeId)}>
                    {t.addressTypeName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 space-y-1">
            <Label className="text-xs text-muted-foreground">Address line 1</Label>
            <Input className="h-9" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} />
          </div>
          <div className="w-40 space-y-1">
            <Label className="text-xs text-muted-foreground">Country</Label>
            <Select value={countryId ? String(countryId) : ""} onValueChange={(v) => setCountryId(v ? Number(v) : null)}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue>
                  {(value: string | null) => {
                    if (!value) return "Country";
                    return countries.find((c) => String(c.countryKey) === value)?.name ?? "Country";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {countries.map((c) => (
                  <SelectItem key={c.countryKey} value={String(c.countryKey)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" size="sm" onClick={addAddress} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Add
          </Button>
        </div>
      )}

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">No addresses on file.</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((a) => (
            <li key={a.propertyTenantAddressId} className="flex items-center justify-between gap-2 rounded-md border border-border px-2.5 py-1.5 text-xs">
              <span>
                <Badge variant="outline" className="me-1.5 text-[10px]">
                  {a.addressTypeName ?? "—"}
                </Badge>
                {a.addressLine1}
                {a.countryName ? `, ${a.countryName}` : ""}
              </span>
              {canEdit && (
                <Button variant="ghost" size="icon-sm" onClick={() => void removeAddress(a.propertyTenantAddressId)} aria-label="Remove">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function TenantPanel({
  mode,
  row,
  rows,
  types,
  countries,
  cities,
  states: _states,
  statuses,
  documentStatuses,
  identityDocuments,
  addressTypes,
  userKey,
  tenantId,
  companyId,
  canEdit,
  onClose,
  onSaved,
}: {
  mode: Exclude<PanelMode, "closed">;
  row?: PropertyTenant;
  rows: PropertyTenant[];
  types: PropertyTenantType[];
  countries: Country[];
  cities: City[];
  states: State[];
  statuses: CommonStatus[];
  documentStatuses: CommonStatus[];
  identityDocuments: IdentityDocumentCountry[];
  addressTypes: PropertyTenantAddressType[];
  userKey: number;
  tenantId: number;
  companyId: number;
  canEdit: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const schema = useTenantSchema(rows, row?.propertyTenantId);
  const isReadOnly = mode === "view";

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    values: {
      tenantCode: row?.tenantCode ?? "",
      propertyTenantTypeId: row?.propertyTenantTypeId ?? 0,
      tenantName: row?.tenantName ?? "",
      legalName: row?.legalName ?? "",
      registrationNumber: row?.registrationNumber ?? "",
      taxRegistrationNumber: row?.taxRegistrationNumber ?? "",
      nationalityId: row?.nationalityId ?? null,
      countryOfResidenceId: row?.countryOfResidenceId ?? null,
      countryId: row?.countryId ?? 0,
      cityId: row?.cityId ?? null,
      contactPersonName: row?.contactPersonName ?? "",
      email: row?.email ?? "",
      mobileCountryCode: row?.mobileCountryCode ?? "",
      mobileNumber: row?.mobileNumber ?? "",
      statusId: row?.statusId ?? 0,
    },
  });

  const countryIdWatch = watch("countryId");
  const cityOptions = useMemo(() => cities.filter((c) => c.countryKey === countryIdWatch), [cities, countryIdWatch]);

  function blankValues(): FormValues {
    return {
      tenantCode: "",
      propertyTenantTypeId: 0,
      tenantName: "",
      legalName: "",
      registrationNumber: "",
      taxRegistrationNumber: "",
      nationalityId: null,
      countryOfResidenceId: null,
      countryId: 0,
      cityId: null,
      contactPersonName: "",
      email: "",
      mobileCountryCode: "",
      mobileNumber: "",
      statusId: 0,
    };
  }

  async function submit(values: FormValues, keepOpenForMore: boolean) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    const payload = {
      tenantCode: values.tenantCode.trim(),
      propertyTenantTypeId: values.propertyTenantTypeId,
      tenantName: values.tenantName.trim(),
      legalName: values.legalName || undefined,
      registrationNumber: values.registrationNumber || undefined,
      taxRegistrationNumber: values.taxRegistrationNumber || undefined,
      nationalityId: values.nationalityId,
      countryOfResidenceId: values.countryOfResidenceId,
      countryId: values.countryId,
      cityId: values.cityId,
      contactPersonName: values.contactPersonName || undefined,
      email: values.email || undefined,
      mobileCountryCode: values.mobileCountryCode || undefined,
      mobileNumber: values.mobileNumber || undefined,
      statusId: values.statusId,
      tenantId,
      companyId,
    };
    try {
      if (mode === "edit" && row) {
        await updatePropertyTenant(row.propertyTenantId, { ...payload, isActive: row.isActive, modifiedBy: userKey });
        toast.success("Property tenant updated");
        await onSaved();
        onClose();
      } else if (mode === "create") {
        await createPropertyTenant({ ...payload, createdBy: userKey });
        toast.success("Property tenant created");
        await onSaved();
        if (keepOpenForMore) {
          reset(blankValues());
        } else {
          onClose();
        }
      }
    } catch (error) {
      toast.error(error instanceof PropertyTenantsApiError ? error.message : "Could not save property tenant");
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-base font-semibold">
            {mode === "create" ? "Add property tenant" : mode === "edit" ? "Edit property tenant" : "Property tenant details"}
          </h2>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit((values) => submit(values, false))} className="grid grid-cols-2 gap-3 sm:grid-cols-4" noValidate>
          <div className="space-y-1">
            <Label htmlFor="tenantCode" required>
              Code
            </Label>
            <Input id="tenantCode" autoFocus={!isReadOnly} disabled={isReadOnly} placeholder="e.g. PT-0001" aria-invalid={!!errors.tenantCode} {...register("tenantCode")} />
            {errors.tenantCode && <p className="text-sm text-destructive">{errors.tenantCode.message}</p>}
          </div>

          <div className="space-y-1">
            <Label required>Type</Label>
            <Controller
              control={control}
              name="propertyTenantTypeId"
              render={({ field }) => (
                <Select value={field.value ? String(field.value) : ""} onValueChange={(v) => field.onChange(v ? Number(v) : 0)} disabled={isReadOnly}>
                  <SelectTrigger className="h-10 w-full max-w-full min-w-0" aria-invalid={!!errors.propertyTenantTypeId}>
                    <SelectValue>
                      {(value: string | null) => {
                        if (!value) return "Select type";
                        return types.find((t) => String(t.propertyTenantTypeId) === value)?.tenantTypeName ?? "Select type";
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {types.map((t) => (
                      <SelectItem key={t.propertyTenantTypeId} value={String(t.propertyTenantTypeId)}>
                        {t.tenantTypeName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.propertyTenantTypeId && <p className="text-sm text-destructive">{errors.propertyTenantTypeId.message}</p>}
          </div>

          <div className="col-span-2 space-y-1 sm:col-span-2">
            <Label htmlFor="tenantName" required>
              Tenant name
            </Label>
            <Input id="tenantName" disabled={isReadOnly} aria-invalid={!!errors.tenantName} {...register("tenantName")} />
            {errors.tenantName && <p className="text-sm text-destructive">{errors.tenantName.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="legalName">Legal name</Label>
            <Input id="legalName" disabled={isReadOnly} {...register("legalName")} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="registrationNumber">Registration number</Label>
            <Input id="registrationNumber" disabled={isReadOnly} {...register("registrationNumber")} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="taxRegistrationNumber">Tax registration number</Label>
            <Input id="taxRegistrationNumber" disabled={isReadOnly} {...register("taxRegistrationNumber")} />
          </div>

          <div className="space-y-1">
            <Label>Nationality</Label>
            <Controller
              control={control}
              name="nationalityId"
              render={({ field }) => (
                <Select value={field.value == null ? NONE_OPTION : String(field.value)} onValueChange={(v) => field.onChange(!v || v === NONE_OPTION ? null : Number(v))} disabled={isReadOnly}>
                  <SelectTrigger className="h-10 w-full max-w-full min-w-0">
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

          <div className="space-y-1">
            <Label>Country of residence</Label>
            <Controller
              control={control}
              name="countryOfResidenceId"
              render={({ field }) => (
                <Select value={field.value == null ? NONE_OPTION : String(field.value)} onValueChange={(v) => field.onChange(!v || v === NONE_OPTION ? null : Number(v))} disabled={isReadOnly}>
                  <SelectTrigger className="h-10 w-full max-w-full min-w-0">
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

          <div className="space-y-1">
            <Label required>Country</Label>
            <Controller
              control={control}
              name="countryId"
              render={({ field }) => (
                <Select value={field.value ? String(field.value) : ""} onValueChange={(v) => field.onChange(v ? Number(v) : 0)} disabled={isReadOnly}>
                  <SelectTrigger className="h-10 w-full max-w-full min-w-0" aria-invalid={!!errors.countryId}>
                    <SelectValue>
                      {(value: string | null) => {
                        if (!value) return "Select country";
                        return countries.find((c) => String(c.countryKey) === value)?.name ?? "Select country";
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((c) => (
                      <SelectItem key={c.countryKey} value={String(c.countryKey)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.countryId && <p className="text-sm text-destructive">{errors.countryId.message}</p>}
          </div>

          <div className="space-y-1">
            <Label>City</Label>
            <Controller
              control={control}
              name="cityId"
              render={({ field }) => (
                <Select value={field.value == null ? NONE_OPTION : String(field.value)} onValueChange={(v) => field.onChange(!v || v === NONE_OPTION ? null : Number(v))} disabled={isReadOnly || !countryIdWatch}>
                  <SelectTrigger className="h-10 w-full max-w-full min-w-0">
                    <SelectValue>
                      {(value: string | null) => {
                        if (!value || value === NONE_OPTION) return "None";
                        return cityOptions.find((c) => String(c.cityKey) === value)?.name ?? "None";
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_OPTION}>None</SelectItem>
                    {cityOptions.map((c) => (
                      <SelectItem key={c.cityKey} value={String(c.cityKey)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="contactPersonName">Contact person</Label>
            <Input id="contactPersonName" disabled={isReadOnly} {...register("contactPersonName")} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" disabled={isReadOnly} {...register("email")} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="mobileCountryCode">Mobile country code</Label>
            <Input id="mobileCountryCode" disabled={isReadOnly} placeholder="e.g. +974" {...register("mobileCountryCode")} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="mobileNumber">Mobile number</Label>
            <Input id="mobileNumber" disabled={isReadOnly} {...register("mobileNumber")} />
          </div>

          <div className="space-y-1">
            <Label required>Status</Label>
            <Controller
              control={control}
              name="statusId"
              render={({ field }) => (
                <Select value={field.value ? String(field.value) : ""} onValueChange={(v) => field.onChange(v ? Number(v) : 0)} disabled={isReadOnly}>
                  <SelectTrigger className="h-10 w-full max-w-full min-w-0" aria-invalid={!!errors.statusId}>
                    <SelectValue>
                      {(value: string | null) => {
                        if (!value) return "Select status";
                        return statuses.find((s) => String(s.commonStatusId) === value)?.statusName ?? "Select status";
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
            {errors.statusId && <p className="text-sm text-destructive">{errors.statusId.message}</p>}
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
            <div className="col-span-2 flex items-center gap-2 sm:col-span-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === "edit" ? "Save" : "Create"}
              </Button>
              {mode === "create" && (
                <Button type="button" variant="secondary" disabled={isSubmitting} onClick={handleSubmit((values) => submit(values, true))}>
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create &amp; add more
                </Button>
              )}
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          )}
        </form>
      </Card>

      {row && (mode === "view" || mode === "edit") && (
        <>
          <DocumentsSection propertyTenantId={row.propertyTenantId} identityDocuments={identityDocuments} documentStatuses={documentStatuses} userKey={userKey} canEdit={canEdit} />
          <AddressesSection propertyTenantId={row.propertyTenantId} addressTypes={addressTypes} countries={countries} userKey={userKey} canEdit={canEdit} />
        </>
      )}
    </div>
  );
}

function TenantList({ roleDef }: { roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const activeTenantId = useTenantStore((s) => s.tenantId);
  const activeTenant = useTenantStore((s) => s.tenant);

  const [types, setTypes] = useState<PropertyTenantType[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [statuses, setStatuses] = useState<CommonStatus[]>([]);
  const [documentStatuses, setDocumentStatuses] = useState<CommonStatus[]>([]);
  const [identityDocuments, setIdentityDocuments] = useState<IdentityDocumentCountry[]>([]);
  const [addressTypes, setAddressTypes] = useState<PropertyTenantAddressType[]>([]);
  const [rows, setRows] = useState<PropertyTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<PropertyTenant | undefined>();
  const [typeFilter, setTypeFilter] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>("tenantName");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const isSuperAdmin = roleDef.id === SUPER_ADMIN_ROLE_ID;
  const platformMode = isSuperAdmin && isPlatformMode(activeTenantId);
  const scopeTenantId = platformMode ? 0 : (user?.tenantKey ?? activeTenant.tenantKey ?? 0);
  const scopeCompanyId = resolveSessionCompanyKey(user) ?? 0;

  const canEdit = can(roleDef, "propertyTenant", "edit");
  const canCreate = can(roleDef, "propertyTenant", "create");
  const canDelete = can(roleDef, "propertyTenant", "delete");
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  async function loadAll() {
    if (scopeTenantId <= 0) {
      setRows([]);
      setLoading(false);
      setLoadError(platformMode ? "Select a tenant workspace to manage property tenants." : "Missing tenant scope.");
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [typeRows, countryRows, cityRows, stateRows, statusTypeRows, identityDocRows, addressTypeRows, tenantRows] = await Promise.all([
        listPropertyTenantTypes({ activeOnly: true }),
        listCountries({ activeOnly: true }),
        listCities({ activeOnly: true }),
        listStates({ activeOnly: true }),
        listCommonStatusTypes({ tenantId: scopeTenantId, activeOnly: true }),
        listIdentityDocumentCountries({ activeOnly: true }),
        listPropertyTenantAddressTypes({ activeOnly: true }),
        listPropertyTenants({ tenantId: scopeTenantId }),
      ]);
      setTypes(typeRows);
      setCountries(countryRows);
      setCities(cityRows);
      setStates(stateRows);
      setIdentityDocuments(identityDocRows);
      setAddressTypes(addressTypeRows);
      setRows(tenantRows);

      const tenantStatusType = statusTypeRows.find((t) => t.statusTypeCode === TENANT_STATUS_TYPE_CODE);
      setStatuses(
        tenantStatusType
          ? await listCommonStatuses({ tenantId: scopeTenantId, commonStatusTypeId: tenantStatusType.commonStatusTypeId, activeOnly: true })
          : []
      );
      const docStatusType = statusTypeRows.find((t) => t.statusTypeCode === DOCUMENT_STATUS_TYPE_CODE);
      setDocumentStatuses(
        docStatusType
          ? await listCommonStatuses({ tenantId: scopeTenantId, commonStatusTypeId: docStatusType.commonStatusTypeId, activeOnly: true })
          : []
      );
    } catch (error) {
      setLoadError(
        error instanceof PropertyTenantTypesApiError || error instanceof PropertyTenantsApiError
          ? error.message
          : "Failed to load property tenants"
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeTenantId]);

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
    if (typeFilter) result = result.filter((r) => r.propertyTenantTypeId === typeFilter);
    if (term) {
      result = result.filter((r) => r.tenantName.toLowerCase().includes(term) || r.tenantCode.toLowerCase().includes(term));
    }
    if (statusFilter === "active") result = result.filter((r) => r.isActive);
    if (statusFilter === "inactive") result = result.filter((r) => !r.isActive);
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const cmp = String(a[sortKey]).localeCompare(String(b[sortKey]));
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [rows, search, typeFilter, statusFilter, sortKey, sortDirection]);

  async function toggleActive(row: PropertyTenant) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      await setPropertyTenantActive(row.propertyTenantId, !row.isActive, userKey);
      await loadAll();
      toast.success(row.isActive ? "Tenant deactivated" : "Tenant activated");
    } catch (error) {
      toast.error(error instanceof PropertyTenantsApiError ? error.message : "Could not update status");
    }
  }

  async function removeRow(row: PropertyTenant) {
    try {
      await deletePropertyTenant(row.propertyTenantId);
      await loadAll();
      toast.success("Tenant deleted");
    } catch (error) {
      toast.error(error instanceof PropertyTenantsApiError ? error.message : "Could not delete tenant");
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Property Tenant"
        description="Persons and organizations occupying/leasing a property — KYC profile, identity documents, and addresses."
        actions={
          canCreate ? (
            <Button
              onClick={() => {
                setTarget(undefined);
                setPanelMode("create");
              }}
            >
              <Plus className="h-4 w-4" />
              Add property tenant
            </Button>
          ) : undefined
        }
      />

      {loadError && <p className="text-sm text-destructive">{loadError}</p>}

      {!loadError && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search code or name…" value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9" />
          </div>
          <Select value={typeFilter ? String(typeFilter) : "all"} onValueChange={(v) => setTypeFilter(v === "all" ? null : Number(v))}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {types.map((t) => (
                <SelectItem key={t.propertyTenantTypeId} value={String(t.propertyTenantTypeId)}>
                  {t.tenantTypeName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

      {panelMode !== "closed" && (
        <TenantPanel
          mode={panelMode}
          row={target}
          rows={rows}
          types={types}
          countries={countries}
          cities={cities}
          states={states}
          statuses={statuses}
          documentStatuses={documentStatuses}
          identityDocuments={identityDocuments}
          addressTypes={addressTypes}
          userKey={userKey}
          tenantId={scopeTenantId}
          companyId={target?.companyId ?? scopeCompanyId}
          canEdit={canEdit}
          onSaved={loadAll}
          onClose={() => {
            setPanelMode("closed");
            setTarget(undefined);
          }}
        />
      )}

      <Card>
        {loading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading property tenants…</p>
        ) : rows.length === 0 ? (
          <EmptyState icon={UserSquare2} tone="primary" heading="No property tenants yet" description="Add your first tenant profile." size="compact" />
        ) : visible.length === 0 ? (
          <EmptyState icon={Search} tone="muted" heading="No matching tenants" description="Try a different search or filter." size="compact" />
        ) : (
          <Table className="table-fixed border-collapse text-xs [&_th]:h-auto [&_th]:whitespace-normal [&_td]:whitespace-normal [&_td]:break-words">
            <TableHeader>
              <TableRow>
                <SortableTableHead sortKey="tenantCode" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} className="w-[12%] px-2 py-1.5">
                  Code
                </SortableTableHead>
                <SortableTableHead sortKey="tenantName" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} className="w-[22%] px-2 py-1.5">
                  Name
                </SortableTableHead>
                <TableHead className="w-[12%] px-2 py-1.5">Type</TableHead>
                <TableHead className="w-[16%] px-2 py-1.5">Country</TableHead>
                <TableHead className="w-[16%] px-2 py-1.5">Contact</TableHead>
                <TableHead className="w-[12%] px-2 py-1.5">Status</TableHead>
                <TableHead className="w-[10%] px-2 py-1.5 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row) => (
                <TableRow key={row.propertyTenantId}>
                  <TableCell className="px-2 py-1.5 font-mono font-medium leading-tight">{row.tenantCode}</TableCell>
                  <TableCell className="px-2 py-1.5 font-medium leading-tight">{row.tenantName}</TableCell>
                  <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">{row.tenantTypeName ?? "—"}</TableCell>
                  <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">{row.countryName ?? "—"}</TableCell>
                  <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">
                    {row.mobileNumber ? `${row.mobileCountryCode ?? ""} ${row.mobileNumber}`.trim() : row.email ?? "—"}
                  </TableCell>
                  <TableCell className="px-2 py-1.5">
                    <Badge variant={row.isActive ? "default" : "secondary"} className="px-1.5 py-0 text-[11px]">
                      {row.statusName ?? (row.isActive ? "active" : "inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-2 py-1.5 text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="View"
                              onClick={() => {
                                setTarget(row);
                                setPanelMode("view");
                              }}
                            />
                          }
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </TooltipTrigger>
                        <TooltipContent>View</TooltipContent>
                      </Tooltip>
                      {canEdit && (
                        <>
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label="Edit"
                                  onClick={() => {
                                    setTarget(row);
                                    setPanelMode("edit");
                                  }}
                                />
                              }
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </TooltipTrigger>
                            <TooltipContent>Edit</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={row.isActive ? "Deactivate" : "Activate"}
                                  onClick={() => void toggleActive(row)}
                                />
                              }
                            >
                              {row.isActive ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                            </TooltipTrigger>
                            <TooltipContent>{row.isActive ? "Deactivate" : "Activate"}</TooltipContent>
                          </Tooltip>
                        </>
                      )}
                      {canDelete && (
                        <Tooltip>
                          <TooltipTrigger
                            render={<Button variant="ghost" size="icon-sm" aria-label="Delete" onClick={() => void removeRow(row)} />}
                          >
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

export default function PropertyTenantMasterPage() {
  return <AccessGate module="propertyTenant">{(roleDef) => <TenantList roleDef={roleDef} />}</AccessGate>;
}
