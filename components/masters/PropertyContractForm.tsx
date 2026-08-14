"use client";

import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Building2, FileSignature, Loader2, Save, ScrollText, UserCheck, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Section } from "@/components/masters/PropertyFormSection";
import { SearchableCombobox } from "@/components/shared/SearchableCombobox";
import { ExtranetPropertyPicker } from "@/components/shared/ExtranetPropertyPicker";
import { ContractFileUploadField } from "@/components/masters/ContractFileUploadField";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { useExtranetPropertyScopeStore } from "@/lib/store/extranet-property-scope.store";
import { resolveSessionCompanyKey } from "@/lib/session-company";
import { listSuppliers } from "@/lib/services/suppliers.service";
import { listSupplierUsers } from "@/lib/services/supplier-users.service";
import { listEmployees } from "@/lib/services/employees.service";
import { listContractTypes } from "@/lib/services/contract-types.service";
import { listContractStatuses } from "@/lib/services/contract-statuses.service";
import { listCurrencies } from "@/lib/services/currencies.service";
import {
  createPropertyContract,
  updatePropertyContract,
  PropertyContractsApiError,
} from "@/lib/services/property-contracts.service";
import type {
  ContractStatus,
  ContractType,
  Currency,
  Employee,
  PropertyContract,
  Supplier,
  SupplierUser,
} from "@/types";

const schema = z
  .object({
    propertyId: z.number().int().positive("Property is required"),
    supplierId: z.number().int().positive("Supplier is required"),
    contractNumber: z.string().trim().min(1, "Contract number is required").max(100),
    contractName: z.string().trim().min(1, "Contract name is required").max(200),
    contractTypeId: z.number().int().positive("Contract type is required"),
    contractStatusId: z.number().int().positive("Contract status is required"),
    contractCurrencyId: z.number().int().positive("Currency is required"),
    contractVersion: z.number().int().positive(),
    startDate: z.string().trim().min(1, "Start date is required"),
    endDate: z.string().trim().min(1, "End date is required"),
    signedDate: z.string().trim().optional().or(z.literal("")),
    signedByEmployeeId: z.number().int().positive().nullable(),
    supplierContactId: z.number().int().positive().nullable(),
    paymentTerms: z.string().trim().max(4000).optional().or(z.literal("")),
    generalTerms: z.string().trim().max(4000).optional().or(z.literal("")),
    remarks: z.string().trim().max(4000).optional().or(z.literal("")),
    contractFileUrl: z.string().nullable(),
    contractFileName: z.string().nullable(),
    isActive: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (values.endDate && values.startDate && values.endDate < values.startDate) {
      ctx.addIssue({ code: "custom", path: ["endDate"], message: "End date must be on or after start date" });
    }
  });
type FormValues = z.infer<typeof schema>;

function emptyValues(propertyId = 0): FormValues {
  return {
    propertyId,
    supplierId: 0,
    contractNumber: "",
    contractName: "",
    contractTypeId: 0,
    contractStatusId: 0,
    contractCurrencyId: 0,
    contractVersion: 1,
    startDate: "",
    endDate: "",
    signedDate: "",
    signedByEmployeeId: null,
    supplierContactId: null,
    paymentTerms: "",
    generalTerms: "",
    remarks: "",
    contractFileUrl: null,
    contractFileName: null,
    isActive: true,
  };
}

function valuesFromEntry(entry: PropertyContract): FormValues {
  return {
    propertyId: entry.propertyId,
    supplierId: entry.supplierId,
    contractNumber: entry.contractNumber,
    contractName: entry.contractName,
    contractTypeId: entry.contractTypeId,
    contractStatusId: entry.contractStatusId,
    contractCurrencyId: entry.contractCurrencyId,
    contractVersion: entry.contractVersion,
    startDate: entry.startDate,
    endDate: entry.endDate,
    signedDate: entry.signedDate ?? "",
    signedByEmployeeId: entry.signedByEmployeeId,
    supplierContactId: entry.supplierContactId,
    paymentTerms: entry.paymentTerms ?? "",
    generalTerms: entry.generalTerms ?? "",
    remarks: entry.remarks ?? "",
    contractFileUrl: entry.contractFileUrl,
    contractFileName: entry.contractFileName,
    isActive: entry.isActive,
  };
}

/** Shared Create / Modify form for a Property's supplier contract. */
export function PropertyContractForm({ entry }: { entry?: PropertyContract }) {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionUser = useSessionStore((s) => s.user);
  const activeTenant = useTenantStore((s) => s.tenant);
  const tenantKey = sessionUser?.tenantKey ?? activeTenant.tenantKey ?? 0;
  const companyKey = resolveSessionCompanyKey(sessionUser) ?? 0;
  const actorKey = sessionUser?.userKey ?? 0;
  const isEdit = !!entry;
  const scope = useExtranetPropertyScopeStore();
  const urlPropertyId = Number(searchParams.get("propertyId") ?? 0);
  const presetPropertyId =
    Number.isFinite(urlPropertyId) && urlPropertyId > 0 ? urlPropertyId : (scope.propertyId ?? 0);
  const presetPropertyLabel =
    !isEdit && presetPropertyId > 0 && scope.propertyId === presetPropertyId ? scope.propertyLabel : null;

  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [supplierUsers, setSupplierUsers] = useState<SupplierUser[]>([]);
  const [contractTypes, setContractTypes] = useState<ContractType[]>([]);
  const [contractStatuses, setContractStatuses] = useState<ContractStatus[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [selectedPropertyLabel, setSelectedPropertyLabel] = useState<string | null>(
    entry ? entry.propertyName || entry.propertyCode || `Property #${entry.propertyId}` : presetPropertyLabel
  );
  const [propertyLocked, setPropertyLocked] = useState(!isEdit && !!presetPropertyLabel);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: entry
      ? valuesFromEntry(entry)
      : emptyValues(Number.isFinite(presetPropertyId) && presetPropertyId > 0 ? presetPropertyId : 0),
  });

  useEffect(() => {
    if (tenantKey <= 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      listSuppliers({ tenantId: tenantKey, activeOnly: true }),
      listEmployees({ tenantId: tenantKey, activeOnly: true }),
      listSupplierUsers({ tenantId: tenantKey }),
      listContractTypes({ activeOnly: true }),
      listContractStatuses({ activeOnly: true }),
      listCurrencies({ activeOnly: true }),
    ])
      .then(([supplierRows, employeeRows, supplierUserRows, typeRows, statusRows, currencyRows]) => {
        if (cancelled) return;
        setSuppliers(supplierRows);
        setEmployees(employeeRows);
        setSupplierUsers(supplierUserRows);
        setContractTypes(typeRows);
        setContractStatuses(statusRows);
        setCurrencies(currencyRows);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load contract reference data");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantKey]);

  const supplierId = useWatch({ control, name: "supplierId" });
  const contractFileUrl = useWatch({ control, name: "contractFileUrl" });
  const contractFileName = useWatch({ control, name: "contractFileName" });
  const isActive = useWatch({ control, name: "isActive" });
  const selectedSupplier = suppliers.find((s) => s.supplierKey === supplierId);
  const eligibleContacts = selectedSupplier
    ? supplierUsers.filter((u) => u.supplierId === selectedSupplier.supplierKey)
    : [];

  async function onSubmit(values: FormValues) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    const payload = {
      tenantId: tenantKey,
      companyId: companyKey,
      propertyId: values.propertyId,
      supplierId: values.supplierId,
      contractNumber: values.contractNumber.trim(),
      contractName: values.contractName.trim(),
      contractTypeId: values.contractTypeId,
      startDate: values.startDate,
      endDate: values.endDate,
      contractCurrencyId: values.contractCurrencyId,
      contractStatusId: values.contractStatusId,
      contractVersion: values.contractVersion,
      signedDate: values.signedDate || null,
      signedByEmployeeId: values.signedByEmployeeId,
      supplierContactId: values.supplierContactId,
      paymentTerms: values.paymentTerms || null,
      generalTerms: values.generalTerms || null,
      remarks: values.remarks || null,
      contractFileUrl: values.contractFileUrl,
      contractFileName: values.contractFileName,
      isActive: values.isActive,
    };
    try {
      if (isEdit && entry) {
        const saved = await updatePropertyContract(entry.propertyContractKey, { ...payload, modifiedBy: actorKey });
        toast.success("Contract updated");
        router.push(`/${role}/extranet/contracts/${saved.propertyContractKey}`);
      } else {
        const saved = await createPropertyContract({ ...payload, createdBy: actorKey });
        toast.success("Contract created");
        router.push(`/${role}/extranet/contracts/${saved.propertyContractKey}`);
      }
    } catch (error) {
      toast.error(error instanceof PropertyContractsApiError ? error.message : "Could not save contract");
    }
  }

  if (loading) {
    return (
      <Card className="max-w-xl">
        <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </CardContent>
      </Card>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,280px)] lg:items-start"
      noValidate
    >
      <div className="min-w-0 space-y-5">
        <Section
          icon={Building2}
          title="Property"
          description="Filter by location to find the property this contract covers."
        >
          <Controller
            control={control}
            name="propertyId"
            render={({ field }) => (
              <>
                <ExtranetPropertyPicker
                  tenantId={tenantKey}
                  value={field.value > 0 ? field.value : null}
                  onChange={(id, property) => {
                    field.onChange(id ?? 0);
                    const label = property
                      ? property.propertyDisplayName || property.propertyName || property.propertyCode
                      : null;
                    setSelectedPropertyLabel(label);
                    if (!isEdit) {
                      scope.setProperty({
                        propertyId: id,
                        propertyLabel: label,
                        countryId: property?.countryId ?? null,
                        stateId: property?.stateId ?? null,
                        cityId: property?.cityId ?? null,
                        areaId: property?.areaId ?? null,
                      });
                    }
                  }}
                  disabled={isEdit || propertyLocked}
                  selectedLabel={selectedPropertyLabel}
                  initialCountryId={scope.countryId}
                  initialStateId={scope.stateId}
                  initialCityId={scope.cityId}
                  initialAreaId={scope.areaId}
                  error={errors.propertyId?.message}
                />
                {!isEdit && propertyLocked && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setPropertyLocked(false)}>
                    Change property
                  </Button>
                )}
              </>
            )}
          />
        </Section>

        <Section icon={FileSignature} title="Contract" description="Supplier, identifiers, and validity window.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label required>Supplier</Label>
              <Controller
                control={control}
                name="supplierId"
                render={({ field }) => (
                  <SearchableCombobox
                    value={field.value || null}
                    onChange={(v) => field.onChange(v)}
                    options={suppliers.map((s) => ({ value: s.supplierKey, label: s.name, sublabel: s.code }))}
                    placeholder="Search supplier by name or code…"
                    emptyLabel="No suppliers found."
                    disabled={isEdit}
                    ariaInvalid={!!errors.supplierId}
                  />
                )}
              />
              {errors.supplierId && <p className="text-sm text-destructive">{errors.supplierId.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contractNumber" required>
                Contract number
              </Label>
              <Input id="contractNumber" aria-invalid={!!errors.contractNumber} {...register("contractNumber")} />
              {errors.contractNumber && (
                <p className="text-sm text-destructive">{errors.contractNumber.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="contractName" required>
                Contract name
              </Label>
              <Input id="contractName" aria-invalid={!!errors.contractName} {...register("contractName")} />
              {errors.contractName && <p className="text-sm text-destructive">{errors.contractName.message}</p>}
            </div>

            <div className="space-y-2">
              <Label required>Contract type</Label>
              <Controller
                control={control}
                name="contractTypeId"
                render={({ field }) => (
                  <Select value={field.value ? String(field.value) : ""} onValueChange={(v) => field.onChange(Number(v))}>
                    <SelectTrigger className="h-10 w-full" aria-invalid={!!errors.contractTypeId}>
                      <SelectValue>
                        {(value: string | null) => {
                          if (!value) return "Select contract type";
                          return contractTypes.find((t) => String(t.contractTypeKey) === value)?.name ?? "Select contract type";
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {contractTypes.map((t) => (
                        <SelectItem key={t.contractTypeKey} value={String(t.contractTypeKey)}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.contractTypeId && <p className="text-sm text-destructive">{errors.contractTypeId.message}</p>}
            </div>

            <div className="space-y-2">
              <Label required>Contract status</Label>
              <Controller
                control={control}
                name="contractStatusId"
                render={({ field }) => (
                  <Select value={field.value ? String(field.value) : ""} onValueChange={(v) => field.onChange(Number(v))}>
                    <SelectTrigger className="h-10 w-full" aria-invalid={!!errors.contractStatusId}>
                      <SelectValue>
                        {(value: string | null) => {
                          if (!value) return "Select status";
                          return (
                            contractStatuses.find((t) => String(t.contractStatusKey) === value)?.name ?? "Select status"
                          );
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {contractStatuses.map((t) => (
                        <SelectItem key={t.contractStatusKey} value={String(t.contractStatusKey)}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.contractStatusId && (
                <p className="text-sm text-destructive">{errors.contractStatusId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label required>Currency</Label>
              <Controller
                control={control}
                name="contractCurrencyId"
                render={({ field }) => (
                  <SearchableCombobox
                    value={field.value || null}
                    onChange={(v) => field.onChange(v)}
                    options={currencies.map((c) => ({ value: c.currencyKey, label: c.name, sublabel: c.code }))}
                    placeholder="Search currency…"
                    emptyLabel="No currencies found."
                    ariaInvalid={!!errors.contractCurrencyId}
                  />
                )}
              />
              {errors.contractCurrencyId && (
                <p className="text-sm text-destructive">{errors.contractCurrencyId.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="contractVersion">Version</Label>
              <Input
                id="contractVersion"
                type="number"
                min={1}
                {...register("contractVersion", { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate" required>
                Start date
              </Label>
              <Input id="startDate" type="date" aria-invalid={!!errors.startDate} {...register("startDate")} />
              {errors.startDate && <p className="text-sm text-destructive">{errors.startDate.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate" required>
                End date
              </Label>
              <Input id="endDate" type="date" aria-invalid={!!errors.endDate} {...register("endDate")} />
              {errors.endDate && <p className="text-sm text-destructive">{errors.endDate.message}</p>}
            </div>

            {isEdit && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Controller
                  control={control}
                  name="isActive"
                  render={({ field }) => (
                    <Select
                      value={field.value ? "active" : "inactive"}
                      onValueChange={(v) => field.onChange(v === "active")}
                    >
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue>
                          {(value: string | null) => (value === "active" ? "Active" : "Inactive")}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            )}
          </div>
        </Section>

        <Section icon={UserCheck} title="Signing" description="Who signed, and the supplier's point of contact.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="signedDate">Signed date</Label>
              <Input id="signedDate" type="date" {...register("signedDate")} />
            </div>
            <div />

            <div className="space-y-2">
              <Label>Signed by (internal employee)</Label>
              <Controller
                control={control}
                name="signedByEmployeeId"
                render={({ field }) => (
                  <SearchableCombobox
                    value={field.value}
                    onChange={(v) => field.onChange(v)}
                    options={employees.map((e) => ({
                      value: e.employeeId,
                      label: `${e.title} ${e.firstName} ${e.lastName}`.replace(/\s+/g, " ").trim(),
                      sublabel: e.employeeNumber,
                    }))}
                    placeholder="Search employee…"
                    emptyLabel="No employees found."
                  />
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Supplier contact</Label>
              <Controller
                control={control}
                name="supplierContactId"
                render={({ field }) => (
                  <SearchableCombobox
                    value={field.value}
                    onChange={(v) => field.onChange(v)}
                    options={eligibleContacts.map((u) => ({
                      value: u.supplierUserKey,
                      label: `${u.firstName} ${u.lastName}`.trim(),
                      sublabel: u.email,
                    }))}
                    placeholder={selectedSupplier ? "Search supplier contact…" : "Select a supplier first"}
                    emptyLabel="No portal contacts for this supplier yet."
                    disabled={!selectedSupplier}
                  />
                )}
              />
            </div>
          </div>
        </Section>

        <Section icon={ScrollText} title="Terms & document" description="Payment/general terms, notes, and the signed contract file.">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="paymentTerms">Payment terms</Label>
              <Textarea id="paymentTerms" rows={3} {...register("paymentTerms")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="generalTerms">General terms</Label>
              <Textarea id="generalTerms" rows={3} {...register("generalTerms")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea id="remarks" rows={2} {...register("remarks")} />
            </div>
            <ContractFileUploadField
              id="contractFile"
              label="Contract document"
              fileUrl={contractFileUrl}
              fileName={contractFileName}
              onChange={(url, name) => {
                setValue("contractFileUrl", url, { shouldValidate: true });
                setValue("contractFileName", name, { shouldValidate: true });
              }}
            />
          </div>
        </Section>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEdit ? "Save changes" : "Create contract"}
          </Button>
          <Button
            type="button"
            variant="outline"
            nativeButton={false}
            render={
              <Link
                href={isEdit ? `/${role}/extranet/contracts/${entry.propertyContractKey}` : `/${role}/extranet/contracts`}
              />
            }
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
        </div>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6">
        <Card className="overflow-hidden p-0">
          <div className="flex h-24 items-end bg-gradient-to-br from-[#001C35] via-[#0a3558] to-[#1a5a7a] p-4 text-white">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{selectedPropertyLabel || "Select a property"}</p>
              <p className="truncate text-xs text-white/75">{selectedSupplier?.name ?? "Select a supplier"}</p>
            </div>
          </div>
          <CardContent className="space-y-3 pt-4">
            <Badge variant={isActive ? "default" : "secondary"}>{isActive ? "active" : "inactive"}</Badge>
            <p className="text-xs text-muted-foreground">
              One row per supplier↔property contract — filter by location to find the property fast.
            </p>
          </CardContent>
        </Card>
      </aside>
    </form>
  );
}
