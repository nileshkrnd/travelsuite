"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Link2, MoreHorizontal, Star } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { listProperties } from "@/lib/services/properties.service";
import { listSuppliers } from "@/lib/services/suppliers.service";
import {
  listPropertySuppliers,
  createPropertySupplier,
  updatePropertySupplier,
  setPropertySupplierActive,
  deletePropertySupplier,
  PropertySuppliersApiError,
} from "@/lib/services/property-suppliers.service";
import { can } from "@/config/permissions";
import type { Property, PropertySupplier, RoleDef, Supplier } from "@/types";

const schema = z
  .object({
    propertyId: z.number().int().positive("Property is required"),
    supplierId: z.number().int().positive("Supplier is required"),
    isPrimary: z.boolean(),
    validFrom: z.string().trim().optional().or(z.literal("")),
    validTo: z.string().trim().optional().or(z.literal("")),
  })
  .superRefine((values, ctx) => {
    if (values.validFrom && values.validTo && values.validTo < values.validFrom) {
      ctx.addIssue({ code: "custom", path: ["validTo"], message: "Valid to must be on or after valid from" });
    }
  });
type FormValues = z.infer<typeof schema>;

function LinkDialog({
  open,
  onOpenChange,
  link,
  properties,
  suppliers,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  link?: PropertySupplier;
  properties: Property[];
  suppliers: Supplier[];
  onSaved: (row: PropertySupplier) => void;
}) {
  const sessionUser = useSessionStore((s) => s.user);
  const actorKey = sessionUser?.userKey ?? 0;
  const isEdit = !!link;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      propertyId: link?.propertyId ?? 0,
      supplierId: link?.supplierId ?? 0,
      isPrimary: link?.isPrimary ?? false,
      validFrom: link?.validFrom ?? "",
      validTo: link?.validTo ?? "",
    },
  });

  async function onSubmit(values: FormValues) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    const payload = {
      propertyId: values.propertyId,
      supplierId: values.supplierId,
      isPrimary: values.isPrimary,
      validFrom: values.validFrom || null,
      validTo: values.validTo || null,
    };
    try {
      if (isEdit && link) {
        const saved = await updatePropertySupplier(link.propertySupplierKey, { ...payload, isActive: link.isActive });
        onSaved(saved);
        toast.success("Link updated");
      } else {
        const saved = await createPropertySupplier({ ...payload, createdBy: actorKey });
        onSaved(saved);
        toast.success("Supplier linked to property");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof PropertySuppliersApiError ? error.message : "Could not save link");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit link" : "Link supplier to property"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label required>Property</Label>
            <Controller
              control={control}
              name="propertyId"
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : ""}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <SelectTrigger className="w-full" aria-invalid={!!errors.propertyId}>
                    <SelectValue placeholder="Select property" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((p) => (
                      <SelectItem key={p.propertyId} value={String(p.propertyId)}>
                        {p.propertyDisplayName || p.propertyName || p.propertyCode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.propertyId && <p className="text-sm text-destructive">{errors.propertyId.message}</p>}
          </div>
          <div className="space-y-2">
            <Label required>Supplier</Label>
            <Controller
              control={control}
              name="supplierId"
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : ""}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <SelectTrigger className="w-full" aria-invalid={!!errors.supplierId}>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.supplierKey} value={String(s.supplierKey)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.supplierId && <p className="text-sm text-destructive">{errors.supplierId.message}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="validFrom">Valid from</Label>
              <Input id="validFrom" type="date" {...register("validFrom")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="validTo">Valid to</Label>
              <Input id="validTo" type="date" {...register("validTo")} />
              {errors.validTo && <p className="text-sm text-destructive">{errors.validTo.message}</p>}
            </div>
          </div>
          <Controller
            control={control}
            name="isPrimary"
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} />
                Primary supplier for this property
              </label>
            )}
          />
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isEdit ? "Save" : "Link"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PropertySupplierList({ roleDef }: { roleDef: RoleDef }) {
  const sessionUser = useSessionStore((s) => s.user);
  const activeTenant = useTenantStore((s) => s.tenant);
  const tenantKey = sessionUser?.tenantKey ?? activeTenant.tenantKey ?? 0;
  const [links, setLinks] = useState<PropertySupplier[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PropertySupplier | undefined>();
  const canEdit = can(roleDef, "propertySupplier", "edit");
  const canCreate = can(roleDef, "propertySupplier", "create");

  useEffect(() => {
    if (tenantKey <= 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      listPropertySuppliers({}),
      listProperties({ tenantId: tenantKey, includeGlobal: true }),
      listSuppliers({ tenantId: tenantKey, activeOnly: true }),
    ])
      .then(([linkRows, propertyRows, supplierRows]) => {
        if (cancelled) return;
        setLinks(linkRows);
        setProperties(propertyRows);
        setSuppliers(supplierRows);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load property/supplier links");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantKey]);

  function upsertLocal(row: PropertySupplier) {
    setLinks((prev) => {
      const idx = prev.findIndex((r) => r.id === row.id);
      return idx === -1 ? [row, ...prev] : prev.map((r, i) => (i === idx ? row : r));
    });
  }

  async function toggleActive(link: PropertySupplier) {
    try {
      const saved = await setPropertySupplierActive(link.propertySupplierKey, !link.isActive);
      upsertLocal(saved);
      toast.success(saved.isActive ? "Activated" : "Deactivated");
    } catch (error) {
      toast.error(error instanceof PropertySuppliersApiError ? error.message : "Could not update status");
    }
  }

  async function removeLink(link: PropertySupplier) {
    try {
      await deletePropertySupplier(link.propertySupplierKey);
      setLinks((prev) => prev.filter((r) => r.id !== link.id));
      toast.success("Link removed");
    } catch (error) {
      toast.error(error instanceof PropertySuppliersApiError ? error.message : "Could not remove link");
    }
  }

  const propertyName = (id: number) => {
    const p = properties.find((p) => p.propertyId === id);
    return p ? p.propertyDisplayName || p.propertyName || p.propertyCode : `Property ${id}`;
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Property Supplier"
        description="Which supplier(s) service each property — one may be marked primary."
        actions={
          canCreate ? (
            <Button
              onClick={() => {
                setEditing(undefined);
                setDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Link supplier
            </Button>
          ) : undefined
        }
      />
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      <Card>
        {!loading && links.length === 0 ? (
          <EmptyState
            icon={Link2}
            tone="primary"
            heading="No links yet"
            description="Link a supplier to a property to get started."
            size="compact"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Property</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Primary</TableHead>
                <TableHead>Valid</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.map((link) => (
                <TableRow key={link.id}>
                  <TableCell className="font-medium">{link.propertyName ?? propertyName(link.propertyId)}</TableCell>
                  <TableCell>{link.supplierName ?? `Supplier ${link.supplierId}`}</TableCell>
                  <TableCell>
                    {link.isPrimary ? <Star className="h-4 w-4 fill-primary text-primary" /> : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {[link.validFrom, link.validTo].filter(Boolean).join(" → ") || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={link.isActive ? "default" : "secondary"}>
                      {link.isActive ? "active" : "inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {canEdit && (
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditing(link);
                              setDialogOpen(true);
                            }}
                          >
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => void toggleActive(link)}>
                            {link.isActive ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => void removeLink(link)}>Remove</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
      <LinkDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        link={editing}
        properties={properties}
        suppliers={suppliers}
        onSaved={upsertLocal}
      />
    </div>
  );
}

export default function PropertySupplierPage() {
  return <AccessGate module="propertySupplier">{(roleDef) => <PropertySupplierList roleDef={roleDef} />}</AccessGate>;
}
