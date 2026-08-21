"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useFieldArray, useForm, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, FileText, Pencil, Trash2, X, Search, Loader2, ChevronRight } from "lucide-react";
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
import { listContentSectionTypes, ContentSectionTypesApiError } from "@/lib/services/content-section-types.service";
import {
  listServiceProductContentSections,
  createServiceProductContentSection,
  updateServiceProductContentSection,
  deleteServiceProductContentSection,
  ServiceProductContentSectionsApiError,
} from "@/lib/services/service-product-content-sections.service";
import { can } from "@/config/permissions";
import type { ContentSectionType, RoleDef, ServiceProduct, ServiceProductContentSection } from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";

const pointSchema = z.object({ pointText: z.string().trim().min(1, "Point text is required").max(2000) });
const itemSchema = z.object({
  itemTitle: z.string().trim().min(1, "Item title is required").max(250),
  itemDescription: z.string().trim().max(10000),
  points: z.array(pointSchema),
});
const schema = z.object({
  contentSectionTypeId: z.number().int().positive("Choose a section type"),
  sectionTitle: z.string().trim().min(1, "Section title is required").max(250),
  sectionDescription: z.string().trim().max(10000),
  isActive: z.boolean(),
  items: z.array(itemSchema),
});

type FormValues = z.infer<typeof schema>;

function blankValues(): FormValues {
  return { contentSectionTypeId: 0, sectionTitle: "", sectionDescription: "", isActive: true, items: [] };
}

function ItemPoints({ control, itemIndex, isReadOnly }: { control: Control<FormValues>; itemIndex: number; isReadOnly: boolean }) {
  const pointsArray = useFieldArray({ control, name: `items.${itemIndex}.points` });
  return (
    <div className="space-y-2 ps-4">
      {pointsArray.fields.map((field, pointIndex) => (
        <div key={field.id} className="flex items-center gap-2">
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <Controller
            control={control}
            name={`items.${itemIndex}.points.${pointIndex}.pointText`}
            render={({ field: f }) => <Input {...f} disabled={isReadOnly} placeholder="Bullet point text" />}
          />
          {!isReadOnly && (
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => pointsArray.remove(pointIndex)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ))}
      {!isReadOnly && (
        <Button type="button" variant="ghost" size="sm" onClick={() => pointsArray.append({ pointText: "" })}>
          <Plus className="h-3.5 w-3.5" />
          Add point
        </Button>
      )}
    </div>
  );
}

function SectionPanel({
  mode,
  row,
  sectionTypes,
  userKey,
  serviceProductId,
  onClose,
  onSaved,
}: {
  mode: Exclude<PanelMode, "closed">;
  row?: ServiceProductContentSection;
  sectionTypes: ContentSectionType[];
  userKey: number;
  serviceProductId: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const isReadOnly = mode === "view";

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    values: row
      ? {
          contentSectionTypeId: row.contentSectionTypeId,
          sectionTitle: row.sectionTitle,
          sectionDescription: row.sectionDescription ?? "",
          isActive: row.isActive,
          items: row.items.map((i) => ({
            itemTitle: i.itemTitle,
            itemDescription: i.itemDescription ?? "",
            points: i.points.map((p) => ({ pointText: p.pointText })),
          })),
        }
      : blankValues(),
  });

  const itemsArray = useFieldArray({ control, name: "items" });

  async function submit(values: FormValues) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    const payload = {
      contentSectionTypeId: values.contentSectionTypeId,
      sectionTitle: values.sectionTitle.trim(),
      sectionDescription: values.sectionDescription.trim() || null,
      isActive: values.isActive,
      items: values.items.map((item) => ({
        itemTitle: item.itemTitle.trim(),
        itemDescription: item.itemDescription.trim() || null,
        points: item.points.map((p) => ({ pointText: p.pointText.trim() })),
      })),
    };
    try {
      if (mode === "edit" && row) {
        await updateServiceProductContentSection(row.serviceProductContentSectionId, { ...payload, modifiedBy: userKey });
        toast.success("Content section updated");
      } else if (mode === "create") {
        await createServiceProductContentSection({ ...payload, serviceProductId, createdBy: userKey });
        toast.success("Content section created");
      }
      await onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof ServiceProductContentSectionsApiError ? error.message : "Could not save content section");
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <h2 className="text-base font-semibold">
          {mode === "create" ? "Add content section" : mode === "edit" ? "Edit content section" : "Content section details"}
        </h2>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit(submit)} className="space-y-5" noValidate>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="space-y-1">
            <Label required>Section type</Label>
            <Controller
              control={control}
              name="contentSectionTypeId"
              render={({ field }) => (
                <Select value={field.value > 0 ? String(field.value) : ""} onValueChange={(v) => field.onChange(Number(v))} disabled={isReadOnly}>
                  <SelectTrigger className="h-10 w-full min-w-0">
                    <SelectValue placeholder="Select type">
                      {(value: string | null) => sectionTypes.find((t) => String(t.contentSectionTypeId) === value)?.sectionTypeName ?? "Select type"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {sectionTypes.map((t) => (
                      <SelectItem key={t.contentSectionTypeId} value={String(t.contentSectionTypeId)}>
                        {t.sectionTypeName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.contentSectionTypeId && <p className="text-sm text-destructive">{errors.contentSectionTypeId.message}</p>}
          </div>

          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="sectionTitle" required>
              Section title
            </Label>
            <Input id="sectionTitle" disabled={isReadOnly} aria-invalid={!!errors.sectionTitle} {...register("sectionTitle")} />
            {errors.sectionTitle && <p className="text-sm text-destructive">{errors.sectionTitle.message}</p>}
          </div>

          <div className="flex items-end gap-4 pb-2">
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} disabled={isReadOnly} />
                  Active
                </label>
              )}
            />
          </div>

          <div className="space-y-1 sm:col-span-4">
            <Label htmlFor="sectionDescription">Section description</Label>
            <Input id="sectionDescription" disabled={isReadOnly} {...register("sectionDescription")} />
          </div>
        </div>

        <div className="space-y-3 rounded-lg border border-border p-3">
          <h3 className="text-sm font-medium">Items</h3>
          {itemsArray.fields.length === 0 ? (
            <p className="text-sm text-muted-foreground">No items yet — add a step or item below.</p>
          ) : (
            itemsArray.fields.map((field, itemIndex) => (
              <div key={field.id} className="space-y-2 rounded-lg border bg-muted/20 p-3">
                <div className="flex items-center gap-2">
                  <Controller
                    control={control}
                    name={`items.${itemIndex}.itemTitle`}
                    render={({ field: f }) => <Input {...f} disabled={isReadOnly} placeholder="Item title" className="font-medium" />}
                  />
                  {!isReadOnly && (
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => itemsArray.remove(itemIndex)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <Controller
                  control={control}
                  name={`items.${itemIndex}.itemDescription`}
                  render={({ field: f }) => <Input {...f} disabled={isReadOnly} placeholder="Item description (optional)" />}
                />
                <ItemPoints control={control} itemIndex={itemIndex} isReadOnly={isReadOnly} />
              </div>
            ))
          )}
          {!isReadOnly && (
            <Button type="button" variant="outline" size="sm" onClick={() => itemsArray.append({ itemTitle: "", itemDescription: "", points: [] })}>
              <Plus className="h-4 w-4" />
              Add item
            </Button>
          )}
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

export function ProductContentSectionTab({ product, roleDef }: { product: ServiceProduct; roleDef: RoleDef }) {
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const [sectionTypes, setSectionTypes] = useState<ContentSectionType[]>([]);
  const [rows, setRows] = useState<ServiceProductContentSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<ServiceProductContentSection | undefined>();
  const [search, setSearch] = useState("");

  const canEdit = can(roleDef, "serviceProductContentSection", "edit");
  const canCreate = can(roleDef, "serviceProductContentSection", "create");
  const canDelete = can(roleDef, "serviceProductContentSection", "delete");
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  useEffect(() => {
    listContentSectionTypes({ tenantId: product.tenantId, companyId: product.companyId, activeOnly: true })
      .then(setSectionTypes)
      .catch((error) => {
        toast.error(error instanceof ContentSectionTypesApiError ? error.message : "Failed to load content section types");
      });
  }, [product.tenantId, product.companyId]);

  async function refreshRows() {
    setLoading(true);
    try {
      const rowsResult = await listServiceProductContentSections({ serviceProductId: product.serviceProductId });
      setRows(rowsResult);
    } catch (error) {
      toast.error(error instanceof ServiceProductContentSectionsApiError ? error.message : "Failed to load content sections");
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
    return rows.filter((r) => r.sectionTitle.toLowerCase().includes(term));
  }, [rows, search]);

  async function removeRow(row: ServiceProductContentSection) {
    try {
      await deleteServiceProductContentSection(row.serviceProductContentSectionId);
      await refreshRows();
      toast.success("Content section deleted");
    } catch (error) {
      toast.error(error instanceof ServiceProductContentSectionsApiError ? error.message : "Could not delete content section");
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Content Sections"
        description="What to Expect, Additional Info, Know Before You Go, Important Information, What to Bring — as many typed sections as the product needs."
        actions={
          canCreate && panelMode === "closed" && sectionTypes.length > 0 ? (
            <Button onClick={() => { setTarget(undefined); setPanelMode("create"); }}>
              <Plus className="h-4 w-4" />
              Add section
            </Button>
          ) : undefined
        }
      />

      {panelMode !== "closed" && (
        <SectionPanel
          mode={panelMode}
          row={target}
          sectionTypes={sectionTypes}
          userKey={userKey}
          serviceProductId={product.serviceProductId}
          onSaved={refreshRows}
          onClose={() => { setPanelMode("closed"); setTarget(undefined); }}
        />
      )}

      {rows.length > 0 && (
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search section title…" value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9" />
        </div>
      )}

      <Card>
        {loading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading content sections…</p>
        ) : rows.length === 0 ? (
          <EmptyState icon={FileText} tone="primary" heading="No content sections yet" description="Add a What to Expect / Additional Info / Know Before You Go block." size="compact" />
        ) : visible.length === 0 ? (
          <EmptyState icon={Search} tone="muted" heading="No matching sections" description="Try a different search." size="compact" />
        ) : (
          <Table className="table-fixed border-collapse text-xs [&_th]:h-auto [&_th]:whitespace-normal [&_td]:whitespace-normal">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[22%] px-2 py-1.5">Type</TableHead>
                <TableHead className="w-[32%] px-2 py-1.5">Title</TableHead>
                <TableHead className="w-[12%] px-2 py-1.5">Items</TableHead>
                <TableHead className="w-[10%] px-2 py-1.5">Status</TableHead>
                <TableHead className="w-[24%] px-2 py-1.5 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row) => (
                <TableRow key={row.serviceProductContentSectionId}>
                  <TableCell className="px-2 py-1.5 leading-tight">
                    <Badge variant="outline" className="text-[11px]">{row.sectionTypeName ?? "—"}</Badge>
                  </TableCell>
                  <TableCell className="px-2 py-1.5 font-medium leading-tight">{row.sectionTitle}</TableCell>
                  <TableCell className="px-2 py-1.5 leading-tight text-muted-foreground">{row.items.length}</TableCell>
                  <TableCell className="px-2 py-1.5">
                    <Badge variant={row.isActive ? "default" : "secondary"} className="px-1.5 py-0 text-[11px]">
                      {row.isActive ? "active" : "inactive"}
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
