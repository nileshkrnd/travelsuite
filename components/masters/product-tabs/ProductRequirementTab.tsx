"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, ClipboardCheck, Pencil, Trash2, X, Search, Loader2 } from "lucide-react";
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
import { listRequirementTypes, RequirementTypesApiError } from "@/lib/services/requirement-types.service";
import {
  listServiceProductRequirements,
  createServiceProductRequirement,
  updateServiceProductRequirement,
  deleteServiceProductRequirement,
  ServiceProductRequirementsApiError,
} from "@/lib/services/service-product-requirements.service";
import { can } from "@/config/permissions";
import type { RequirementType, RoleDef, ServiceProduct, ServiceProductOption, ServiceProductRequirement, ServiceProductVariant } from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";
const NONE = "none";

const schema = z.object({
  serviceProductOptionId: z.number().int().positive().nullable(),
  serviceProductVariantId: z.number().int().positive().nullable(),
  requirementTypeId: z.number().int().positive("Choose a requirement type"),
  requirementName: z.string().trim().min(1, "Requirement name is required").max(250),
  description: z.string().trim().max(2000).nullable(),
  isMandatory: z.boolean(),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

function blankValues(): FormValues {
  return {
    serviceProductOptionId: null,
    serviceProductVariantId: null,
    requirementTypeId: 0,
    requirementName: "",
    description: "",
    isMandatory: false,
    isActive: true,
  };
}

function RequirementPanel({
  mode,
  row,
  options,
  requirementTypes,
  userKey,
  serviceProductId,
  onClose,
  onSaved,
}: {
  mode: Exclude<PanelMode, "closed">;
  row?: ServiceProductRequirement;
  options: ServiceProductOption[];
  requirementTypes: RequirementType[];
  userKey: number;
  serviceProductId: number;
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
          requirementTypeId: row.requirementTypeId,
          requirementName: row.requirementName,
          description: row.description,
          isMandatory: row.isMandatory,
          isActive: row.isActive,
        }
      : blankValues(),
  });

  const selectedOptionId = watch("serviceProductOptionId");

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
    const payload = {
      serviceProductOptionId: values.serviceProductOptionId,
      serviceProductVariantId: values.serviceProductVariantId,
      requirementTypeId: values.requirementTypeId,
      requirementName: values.requirementName.trim(),
      description: values.description?.trim() || null,
      isMandatory: values.isMandatory,
      isActive: values.isActive,
    };
    try {
      if (mode === "edit" && row) {
        await updateServiceProductRequirement(row.serviceProductRequirementId, { ...payload, modifiedBy: userKey });
        toast.success("Requirement updated");
      } else if (mode === "create") {
        await createServiceProductRequirement({ ...payload, serviceProductId, createdBy: userKey });
        toast.success("Requirement created");
      }
      await onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof ServiceProductRequirementsApiError ? error.message : "Could not save requirement");
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <h2 className="text-base font-semibold">
          {mode === "create" ? "Add requirement" : mode === "edit" ? "Edit requirement" : "Requirement details"}
        </h2>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit(submit)} className="space-y-5" noValidate>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="requirementName" required>
              Requirement name
            </Label>
            <Input id="requirementName" disabled={isReadOnly} aria-invalid={!!errors.requirementName} {...register("requirementName")} />
            {errors.requirementName && <p className="text-sm text-destructive">{errors.requirementName.message}</p>}
          </div>

          <div className="space-y-1 sm:col-span-2">
            <Label required>Requirement type</Label>
            <Controller
              control={control}
              name="requirementTypeId"
              render={({ field }) => (
                <Select value={field.value > 0 ? String(field.value) : ""} onValueChange={(v) => field.onChange(Number(v))} disabled={isReadOnly}>
                  <SelectTrigger className="h-10 w-full min-w-0">
                    <SelectValue placeholder="Select type">
                      {(value: string | null) => requirementTypes.find((t) => String(t.requirementTypeId) === value)?.requirementTypeName ?? "Select type"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {requirementTypes.map((t) => (
                      <SelectItem key={t.requirementTypeId} value={String(t.requirementTypeId)}>
                        {t.requirementTypeName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.requirementTypeId && <p className="text-sm text-destructive">{errors.requirementTypeId.message}</p>}
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
            <Label htmlFor="description">Description</Label>
            <Input id="description" disabled={isReadOnly} {...register("description")} />
          </div>

          <div className="flex items-end gap-4 pb-2">
            <Controller
              control={control}
              name="isMandatory"
              render={({ field }) => (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} disabled={isReadOnly} />
                  Mandatory
                </label>
              )}
            />
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

export function ProductRequirementTab({ product, roleDef }: { product: ServiceProduct; roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const [options, setOptions] = useState<ServiceProductOption[]>([]);
  const [requirementTypes, setRequirementTypes] = useState<RequirementType[]>([]);
  const [rows, setRows] = useState<ServiceProductRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<ServiceProductRequirement | undefined>();
  const [search, setSearch] = useState("");

  const canEdit = can(roleDef, "serviceProductRequirement", "edit");
  const canCreate = can(roleDef, "serviceProductRequirement", "create");
  const canDelete = can(roleDef, "serviceProductRequirement", "delete");
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  useEffect(() => {
    listServiceProductOptions({ serviceProductId: product.serviceProductId }).then(setOptions);
    listRequirementTypes({ tenantId: product.tenantId, companyId: product.companyId, activeOnly: true })
      .then(setRequirementTypes)
      .catch((error) => {
        toast.error(error instanceof RequirementTypesApiError ? error.message : "Failed to load requirement types");
      });
  }, [product.serviceProductId, product.tenantId, product.companyId]);

  async function refreshRows() {
    setLoading(true);
    try {
      const rowsResult = await listServiceProductRequirements({ serviceProductId: product.serviceProductId });
      setRows(rowsResult);
    } catch (error) {
      toast.error(error instanceof ServiceProductRequirementsApiError ? error.message : "Failed to load requirements");
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
    return rows.filter((r) => r.requirementName.toLowerCase().includes(term));
  }, [rows, search]);

  async function removeRow(row: ServiceProductRequirement) {
    try {
      await deleteServiceProductRequirement(row.serviceProductRequirementId);
      await refreshRows();
      toast.success("Requirement deleted");
    } catch (error) {
      toast.error(error instanceof ServiceProductRequirementsApiError ? error.message : "Could not delete requirement");
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Requirements"
        description="Traveler requirements for this product — passport, visa, age, waiver, …"
        actions={
          canCreate && panelMode === "closed" && requirementTypes.length > 0 ? (
            <Button onClick={() => { setTarget(undefined); setPanelMode("create"); }}>
              <Plus className="h-4 w-4" />
              Add requirement
            </Button>
          ) : undefined
        }
      />

      {panelMode !== "closed" && (
        <RequirementPanel
          mode={panelMode}
          row={target}
          options={options}
          requirementTypes={requirementTypes}
          userKey={userKey}
          serviceProductId={product.serviceProductId}
          onSaved={refreshRows}
          onClose={() => { setPanelMode("closed"); setTarget(undefined); }}
        />
      )}

      {rows.length > 0 && (
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search requirement…" value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9" />
        </div>
      )}

      <Card>
        {loading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading requirements…</p>
        ) : rows.length === 0 ? (
          <EmptyState icon={ClipboardCheck} tone="primary" heading="No requirements yet" description="Add a traveler requirement for this product." size="compact" />
        ) : visible.length === 0 ? (
          <EmptyState icon={Search} tone="muted" heading="No matching requirements" description="Try a different search." size="compact" />
        ) : (
          <Table className="table-fixed border-collapse text-xs [&_th]:h-auto [&_th]:whitespace-normal [&_td]:whitespace-normal">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[26%] px-2 py-1.5">Requirement</TableHead>
                <TableHead className="w-[18%] px-2 py-1.5">Type</TableHead>
                <TableHead className="w-[18%] px-2 py-1.5">Scope</TableHead>
                <TableHead className="w-[12%] px-2 py-1.5">Mandatory</TableHead>
                <TableHead className="w-[26%] px-2 py-1.5 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row) => (
                <TableRow key={row.serviceProductRequirementId}>
                  <TableCell className="px-2 py-1.5 font-medium leading-tight">{row.requirementName}</TableCell>
                  <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">{row.requirementTypeName ?? "—"}</TableCell>
                  <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">
                    {row.variantName ?? row.optionName ?? "Whole product"}
                  </TableCell>
                  <TableCell className="px-2 py-1.5">
                    <Badge variant={row.isMandatory ? "default" : "secondary"} className="px-1.5 py-0 text-[11px]">
                      {row.isMandatory ? "mandatory" : "optional"}
                    </Badge>
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
