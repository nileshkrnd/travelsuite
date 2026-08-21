"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Info, Pencil, Trash2, X, Search, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useSessionStore } from "@/lib/store/session.store";
import { useUsersStore } from "@/lib/store/users.store";
import { listServiceProductOptions } from "@/lib/services/service-product-options.service";
import { listServiceProductVariants } from "@/lib/services/service-product-variants.service";
import { listAdditionalInfoTypes, AdditionalInfoTypesApiError } from "@/lib/services/additional-info-types.service";
import {
  listServiceProductAdditionalInfo,
  createServiceProductAdditionalInfo,
  updateServiceProductAdditionalInfo,
  deleteServiceProductAdditionalInfo,
  ServiceProductAdditionalInfoApiError,
} from "@/lib/services/service-product-additional-info.service";
import { can } from "@/config/permissions";
import type {
  AdditionalInfoType,
  RoleDef,
  ServiceProduct,
  ServiceProductAdditionalInfo,
  ServiceProductOption,
  ServiceProductVariant,
} from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";
const NONE = "none";

const schema = z.object({
  serviceProductOptionId: z.number().int().positive().nullable(),
  serviceProductVariantId: z.number().int().positive().nullable(),
  additionalInfoTypeId: z.number().int().positive("Choose an info type"),
  valueBoolean: z.boolean(),
  valueText: z.string().trim(),
  valueNumber: z.string().trim(),
  valueDate: z.string().trim(),
  valueTime: z.string().trim(),
  valueDateTime: z.string().trim(),
});

type FormValues = z.infer<typeof schema>;

function blankValues(): FormValues {
  return {
    serviceProductOptionId: null,
    serviceProductVariantId: null,
    additionalInfoTypeId: 0,
    valueBoolean: false,
    valueText: "",
    valueNumber: "",
    valueDate: "",
    valueTime: "",
    valueDateTime: "",
  };
}

function valueSummary(row: ServiceProductAdditionalInfo): string {
  switch (row.valueTypeCode) {
    case "BOOLEAN":
      return row.valueBoolean ? "Yes" : "No";
    case "NUMBER":
      return row.valueNumber != null ? String(row.valueNumber) : "—";
    case "DATE":
      return row.valueDate ?? "—";
    case "TIME":
      return row.valueTime ?? "—";
    case "DATETIME":
      return row.valueDateTime ?? "—";
    default:
      return row.valueText ?? "—";
  }
}

function InfoPanel({
  mode,
  row,
  options,
  infoTypes,
  userKey,
  serviceProductId,
  tenantId,
  companyId,
  onClose,
  onSaved,
}: {
  mode: Exclude<PanelMode, "closed">;
  row?: ServiceProductAdditionalInfo;
  options: ServiceProductOption[];
  infoTypes: AdditionalInfoType[];
  userKey: number;
  serviceProductId: number;
  tenantId: number;
  companyId: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const isReadOnly = mode === "view";
  const [variants, setVariants] = useState<ServiceProductVariant[]>([]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    values: row
      ? {
          serviceProductOptionId: row.serviceProductOptionId,
          serviceProductVariantId: row.serviceProductVariantId,
          additionalInfoTypeId: row.additionalInfoTypeId,
          valueBoolean: row.valueBoolean ?? false,
          valueText: row.valueText ?? "",
          valueNumber: row.valueNumber != null ? String(row.valueNumber) : "",
          valueDate: row.valueDate ?? "",
          valueTime: row.valueTime ?? "",
          valueDateTime: row.valueDateTime ?? "",
        }
      : blankValues(),
  });

  const selectedOptionId = watch("serviceProductOptionId");
  const selectedTypeId = watch("additionalInfoTypeId");
  const selectedType = infoTypes.find((t) => t.additionalInfoTypeId === selectedTypeId);

  useEffect(() => {
    if (!selectedOptionId) {
      setVariants([]);
      return;
    }
    listServiceProductVariants({ serviceProductOptionId: selectedOptionId }).then(setVariants).catch(() => setVariants([]));
  }, [selectedOptionId]);

  async function submit(values: FormValues) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    if (!selectedType) {
      toast.error("Choose an info type");
      return;
    }
    const payload = {
      serviceProductOptionId: values.serviceProductOptionId,
      serviceProductVariantId: values.serviceProductVariantId,
      additionalInfoTypeId: values.additionalInfoTypeId,
      valueBoolean: selectedType.valueTypeCode === "BOOLEAN" ? values.valueBoolean : null,
      valueText: selectedType.valueTypeCode === "TEXT" ? values.valueText.trim() || null : null,
      valueNumber: selectedType.valueTypeCode === "NUMBER" && values.valueNumber.trim() !== "" ? Number(values.valueNumber) : null,
      valueDate: selectedType.valueTypeCode === "DATE" ? values.valueDate.trim() || null : null,
      valueTime: selectedType.valueTypeCode === "TIME" ? values.valueTime.trim() || null : null,
      valueDateTime: selectedType.valueTypeCode === "DATETIME" && values.valueDateTime.trim() ? new Date(values.valueDateTime).toISOString() : null,
    };
    try {
      if (mode === "edit" && row) {
        await updateServiceProductAdditionalInfo(row.serviceProductAdditionalInfoId, { ...payload, modifiedBy: userKey });
        toast.success("Additional info updated");
      } else if (mode === "create") {
        await createServiceProductAdditionalInfo({ ...payload, tenantId, companyId, serviceProductId, createdBy: userKey });
        toast.success("Additional info created");
      }
      await onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof ServiceProductAdditionalInfoApiError ? error.message : "Could not save additional info");
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <h2 className="text-base font-semibold">
          {mode === "create" ? "Add additional info" : mode === "edit" ? "Edit additional info" : "Additional info details"}
        </h2>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit(submit)} className="space-y-5" noValidate>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="space-y-1 sm:col-span-2">
            <Label required>Info type</Label>
            <Controller
              control={control}
              name="additionalInfoTypeId"
              render={({ field }) => (
                <Select value={field.value > 0 ? String(field.value) : ""} onValueChange={(v) => field.onChange(Number(v))} disabled={isReadOnly}>
                  <SelectTrigger className="h-10 w-full min-w-0">
                    <SelectValue placeholder="Select type">
                      {(value: string | null) => infoTypes.find((t) => String(t.additionalInfoTypeId) === value)?.infoTypeName ?? "Select type"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {infoTypes.map((t) => (
                      <SelectItem key={t.additionalInfoTypeId} value={String(t.additionalInfoTypeId)}>
                        {t.infoTypeName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.additionalInfoTypeId && <p className="text-sm text-destructive">{errors.additionalInfoTypeId.message}</p>}
          </div>

          <div className="space-y-1">
            <Label>Option scope</Label>
            <Controller
              control={control}
              name="serviceProductOptionId"
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : NONE}
                  onValueChange={(v) => {
                    field.onChange(!v || v === NONE ? null : Number(v));
                    setValue("serviceProductVariantId", null);
                  }}
                  disabled={isReadOnly}
                >
                  <SelectTrigger className="h-10 w-full min-w-0">
                    <SelectValue>
                      {(value: string | null) => {
                        if (!value || value === NONE) return "Whole product";
                        return options.find((o) => String(o.serviceProductOptionId) === value)?.optionName ?? value;
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Whole product</SelectItem>
                    {options.map((o) => (
                      <SelectItem key={o.serviceProductOptionId} value={String(o.serviceProductOptionId)}>
                        {o.optionName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1">
            <Label>Variant scope</Label>
            <Controller
              control={control}
              name="serviceProductVariantId"
              render={({ field }) => (
                <Select value={field.value ? String(field.value) : NONE} onValueChange={(v) => field.onChange(!v || v === NONE ? null : Number(v))} disabled={isReadOnly || !selectedOptionId}>
                  <SelectTrigger className="h-10 w-full min-w-0">
                    <SelectValue>
                      {(value: string | null) => {
                        if (!value || value === NONE) return "All variants";
                        return variants.find((v) => String(v.serviceProductVariantId) === value)?.variantName ?? value;
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>All variants</SelectItem>
                    {variants.map((v) => (
                      <SelectItem key={v.serviceProductVariantId} value={String(v.serviceProductVariantId)}>
                        {v.variantName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1 sm:col-span-4">
            <Label>Value {selectedType && <span className="text-xs text-muted-foreground">({selectedType.valueTypeCode})</span>}</Label>
            {!selectedType ? (
              <p className="text-sm text-muted-foreground">Choose an info type first.</p>
            ) : selectedType.valueTypeCode === "BOOLEAN" ? (
              <Controller
                control={control}
                name="valueBoolean"
                render={({ field }) => (
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} disabled={isReadOnly} />
                    Yes
                  </label>
                )}
              />
            ) : selectedType.valueTypeCode === "NUMBER" ? (
              <Input type="number" disabled={isReadOnly} {...register("valueNumber")} />
            ) : selectedType.valueTypeCode === "DATE" ? (
              <Input type="date" disabled={isReadOnly} {...register("valueDate")} />
            ) : selectedType.valueTypeCode === "TIME" ? (
              <Input type="time" disabled={isReadOnly} {...register("valueTime")} />
            ) : selectedType.valueTypeCode === "DATETIME" ? (
              <Input type="datetime-local" disabled={isReadOnly} {...register("valueDateTime")} />
            ) : (
              <Input disabled={isReadOnly} {...register("valueText")} />
            )}
          </div>
        </div>

        {!isReadOnly && (
          <div className="flex items-center gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "edit" ? "Save" : "Create"}
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

export function ProductAdditionalInfoTab({ product, roleDef }: { product: ServiceProduct; roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const [options, setOptions] = useState<ServiceProductOption[]>([]);
  const [infoTypes, setInfoTypes] = useState<AdditionalInfoType[]>([]);
  const [rows, setRows] = useState<ServiceProductAdditionalInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<ServiceProductAdditionalInfo | undefined>();
  const [search, setSearch] = useState("");

  const canEdit = can(roleDef, "serviceProductAdditionalInfo", "edit");
  const canCreate = can(roleDef, "serviceProductAdditionalInfo", "create");
  const canDelete = can(roleDef, "serviceProductAdditionalInfo", "delete");
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  useEffect(() => {
    listServiceProductOptions({ serviceProductId: product.serviceProductId }).then(setOptions);
    listAdditionalInfoTypes({ tenantId: product.tenantId, companyId: product.companyId, activeOnly: true })
      .then(setInfoTypes)
      .catch((error) => {
        toast.error(error instanceof AdditionalInfoTypesApiError ? error.message : "Failed to load additional info types");
      });
  }, [product.serviceProductId, product.tenantId, product.companyId]);

  async function refreshRows() {
    setLoading(true);
    try {
      const rowsResult = await listServiceProductAdditionalInfo({ serviceProductId: product.serviceProductId });
      setRows(rowsResult);
    } catch (error) {
      toast.error(error instanceof ServiceProductAdditionalInfoApiError ? error.message : "Failed to load additional info");
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
    if (!term) return rows;
    return rows.filter((r) => (r.infoTypeName ?? "").toLowerCase().includes(term));
  }, [rows, search]);

  async function removeRow(row: ServiceProductAdditionalInfo) {
    try {
      await deleteServiceProductAdditionalInfo(row.serviceProductAdditionalInfoId);
      await refreshRows();
      toast.success("Additional info deleted");
    } catch (error) {
      toast.error(error instanceof ServiceProductAdditionalInfoApiError ? error.message : "Could not delete additional info");
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Additional Info"
        description="Structured yes/no and value facts about this product — accessibility, group size limits, age limits, …"
        actions={
          canCreate && panelMode === "closed" && infoTypes.length > 0 ? (
            <Button onClick={() => { setTarget(undefined); setPanelMode("create"); }}>
              <Plus className="h-4 w-4" />
              Add info
            </Button>
          ) : undefined
        }
      />

      {panelMode !== "closed" && (
        <InfoPanel
          mode={panelMode}
          row={target}
          options={options}
          infoTypes={infoTypes}
          userKey={userKey}
          serviceProductId={product.serviceProductId}
          tenantId={product.tenantId}
          companyId={product.companyId}
          onSaved={refreshRows}
          onClose={() => { setPanelMode("closed"); setTarget(undefined); }}
        />
      )}

      {rows.length > 0 && (
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search info type…" value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9" />
        </div>
      )}

      <Card>
        {loading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading additional info…</p>
        ) : rows.length === 0 ? (
          <EmptyState icon={Info} tone="primary" heading="No additional info yet" description="Add a structured fact for this product." size="compact" />
        ) : visible.length === 0 ? (
          <EmptyState icon={Search} tone="muted" heading="No matching entries" description="Try a different search." size="compact" />
        ) : (
          <Table className="table-fixed border-collapse text-xs [&_th]:h-auto [&_th]:whitespace-normal [&_td]:whitespace-normal">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[28%] px-2 py-1.5">Info type</TableHead>
                <TableHead className="w-[20%] px-2 py-1.5">Value</TableHead>
                <TableHead className="w-[26%] px-2 py-1.5">Scope</TableHead>
                <TableHead className="w-[26%] px-2 py-1.5 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row) => (
                <TableRow key={row.serviceProductAdditionalInfoId}>
                  <TableCell className="px-2 py-1.5 font-medium leading-tight">{row.infoTypeName ?? "—"}</TableCell>
                  <TableCell className="px-2 py-1.5 leading-tight">
                    <Badge variant="outline" className="text-[11px]">{valueSummary(row)}</Badge>
                  </TableCell>
                  <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">
                    {row.variantName ?? row.optionName ?? "Whole product"}
                  </TableCell>
                  <TableCell className="px-2 py-1.5 text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      <Tooltip>
                        <TooltipTrigger render={<Button variant="ghost" size="icon-sm" aria-label="View" onClick={() => { setTarget(row); setPanelMode("view"); }} />}>
                          <Search className="h-3.5 w-3.5" />
                        </TooltipTrigger>
                        <TooltipContent>View</TooltipContent>
                      </Tooltip>
                      {canEdit && (
                        <Tooltip>
                          <TooltipTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Edit" onClick={() => { setTarget(row); setPanelMode("edit"); }} />}>
                            <Pencil className="h-3.5 w-3.5" />
                          </TooltipTrigger>
                          <TooltipContent>Edit</TooltipContent>
                        </Tooltip>
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
