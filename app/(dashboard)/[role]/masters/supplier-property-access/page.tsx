"use client";

import { useEffect, useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, ShieldCheck, MoreHorizontal } from "lucide-react";
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
import { listSuppliers } from "@/lib/services/suppliers.service";
import { listPropertySuppliers } from "@/lib/services/property-suppliers.service";
import { listSupplierUsers } from "@/lib/services/supplier-users.service";
import {
  listSupplierPropertyAccess,
  createSupplierPropertyAccess,
  updateSupplierPropertyAccess,
  setSupplierPropertyAccessActive,
  deleteSupplierPropertyAccess,
  SupplierPropertyAccessApiError,
} from "@/lib/services/supplier-property-access.service";
import { can } from "@/config/permissions";
import type { PropertySupplier, RoleDef, Supplier, SupplierPropertyAccess, SupplierUser } from "@/types";

const FLAGS = [
  { key: "canView", label: "View" },
  { key: "canCreateRate", label: "Create rate" },
  { key: "canEditRate", label: "Edit rate" },
  { key: "canSubmitRate", label: "Submit rate" },
  { key: "canApproveRate", label: "Approve rate" },
] as const;

const schema = z
  .object({
    propertySupplierId: z.number().int().positive("Property/Supplier link is required"),
    userId: z.number().int().positive("User is required"),
    canView: z.boolean(),
    canCreateRate: z.boolean(),
    canEditRate: z.boolean(),
    canSubmitRate: z.boolean(),
    canApproveRate: z.boolean(),
    validFrom: z.string().trim().optional().or(z.literal("")),
    validTo: z.string().trim().optional().or(z.literal("")),
  })
  .superRefine((values, ctx) => {
    if (values.validFrom && values.validTo && values.validTo < values.validFrom) {
      ctx.addIssue({ code: "custom", path: ["validTo"], message: "Valid to must be on or after valid from" });
    }
  });
type FormValues = z.infer<typeof schema>;

function AccessDialog({
  open,
  onOpenChange,
  grant,
  links,
  supplierUsers,
  tenantKey,
  companyKey,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grant?: SupplierPropertyAccess;
  links: PropertySupplier[];
  supplierUsers: SupplierUser[];
  tenantKey: number;
  companyKey: number;
  onSaved: (row: SupplierPropertyAccess) => void;
}) {
  const sessionUser = useSessionStore((s) => s.user);
  const actorKey = sessionUser?.userKey ?? 0;
  const isEdit = !!grant;

  const {
    handleSubmit,
    control,
    register,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      propertySupplierId: grant?.propertySupplierId ?? 0,
      userId: grant?.userKey ?? 0,
      canView: grant?.canView ?? true,
      canCreateRate: grant?.canCreateRate ?? false,
      canEditRate: grant?.canEditRate ?? false,
      canSubmitRate: grant?.canSubmitRate ?? false,
      canApproveRate: grant?.canApproveRate ?? false,
      validFrom: grant?.validFrom ?? "",
      validTo: grant?.validTo ?? "",
    },
  });

  const propertySupplierId = useWatch({ control, name: "propertySupplierId" });
  const selectedLink = links.find((l) => l.propertySupplierKey === propertySupplierId);
  const eligibleUsers = selectedLink
    ? supplierUsers.filter((u) => u.supplierId === selectedLink.supplierId)
    : [];

  async function onSubmit(values: FormValues) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    const payload = {
      tenantId: tenantKey,
      companyId: companyKey,
      propertySupplierId: values.propertySupplierId,
      userId: values.userId,
      canView: values.canView,
      canCreateRate: values.canCreateRate,
      canEditRate: values.canEditRate,
      canSubmitRate: values.canSubmitRate,
      canApproveRate: values.canApproveRate,
      validFrom: values.validFrom || null,
      validTo: values.validTo || null,
    };
    try {
      if (isEdit && grant) {
        const saved = await updateSupplierPropertyAccess(grant.supplierPropertyAccessKey, {
          ...payload,
          isActive: grant.isActive,
        });
        onSaved(saved);
        toast.success("Access updated");
      } else {
        const saved = await createSupplierPropertyAccess({ ...payload, createdBy: actorKey });
        onSaved(saved);
        toast.success("Access granted");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof SupplierPropertyAccessApiError ? error.message : "Could not save access grant");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit rate access" : "Grant rate access"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label required>Property / Supplier link</Label>
            <Controller
              control={control}
              name="propertySupplierId"
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : ""}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <SelectTrigger className="w-full" aria-invalid={!!errors.propertySupplierId}>
                    <SelectValue placeholder="Select property / supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {links.map((l) => (
                      <SelectItem key={l.propertySupplierKey} value={String(l.propertySupplierKey)}>
                        {(l.propertyName ?? `Property ${l.propertyId}`) + " — " + (l.supplierName ?? `Supplier ${l.supplierId}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.propertySupplierId && (
              <p className="text-sm text-destructive">{errors.propertySupplierId.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label required>Supplier user</Label>
            <Controller
              control={control}
              name="userId"
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : ""}
                  onValueChange={(v) => field.onChange(Number(v))}
                  disabled={!selectedLink}
                >
                  <SelectTrigger className="w-full" aria-invalid={!!errors.userId}>
                    <SelectValue placeholder={selectedLink ? "Select supplier user" : "Select a link first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleUsers.map((u) => (
                      <SelectItem key={u.userKey} value={String(u.userKey)}>
                        {u.firstName} {u.lastName} — {u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.userId && <p className="text-sm text-destructive">{errors.userId.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Permissions</Label>
            <div className="grid grid-cols-2 gap-2">
              {FLAGS.map((flag) => (
                <Controller
                  key={flag.key}
                  control={control}
                  name={flag.key}
                  render={({ field }) => (
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} />
                      {flag.label}
                    </label>
                  )}
                />
              ))}
            </div>
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
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isEdit ? "Save" : "Grant access"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SupplierPropertyAccessList({ roleDef }: { roleDef: RoleDef }) {
  const sessionUser = useSessionStore((s) => s.user);
  const activeTenant = useTenantStore((s) => s.tenant);
  const tenantKey = sessionUser?.tenantKey ?? activeTenant.tenantKey ?? 0;
  const companyKey = sessionUser?.companyKey ?? sessionUser?.employeeCompanyKey ?? 0;
  const [grants, setGrants] = useState<SupplierPropertyAccess[]>([]);
  const [links, setLinks] = useState<PropertySupplier[]>([]);
  const [supplierUsers, setSupplierUsers] = useState<SupplierUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierPropertyAccess | undefined>();
  const canEdit = can(roleDef, "supplierPropertyAccess", "edit");
  const canCreate = can(roleDef, "supplierPropertyAccess", "create");

  useEffect(() => {
    if (tenantKey <= 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([listSupplierPropertyAccess({ tenantId: tenantKey }), listPropertySuppliers({}), listSuppliers({ tenantId: tenantKey })])
      .then(async ([grantRows, linkRows, supplierRows]) => {
        if (cancelled) return;
        setGrants(grantRows);
        setLinks(linkRows);
        const userLists = await Promise.all(
          supplierRows.map((s: Supplier) => listSupplierUsers({ supplierId: s.supplierKey }))
        );
        if (!cancelled) setSupplierUsers(userLists.flat());
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load rate access grants");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantKey]);

  function upsertLocal(row: SupplierPropertyAccess) {
    setGrants((prev) => {
      const idx = prev.findIndex((r) => r.id === row.id);
      return idx === -1 ? [row, ...prev] : prev.map((r, i) => (i === idx ? row : r));
    });
  }

  async function toggleActive(grant: SupplierPropertyAccess) {
    try {
      const saved = await setSupplierPropertyAccessActive(grant.supplierPropertyAccessKey, !grant.isActive);
      upsertLocal(saved);
      toast.success(saved.isActive ? "Activated" : "Deactivated");
    } catch (error) {
      toast.error(error instanceof SupplierPropertyAccessApiError ? error.message : "Could not update status");
    }
  }

  async function removeGrant(grant: SupplierPropertyAccess) {
    try {
      await deleteSupplierPropertyAccess(grant.supplierPropertyAccessKey);
      setGrants((prev) => prev.filter((r) => r.id !== grant.id));
      toast.success("Access grant removed");
    } catch (error) {
      toast.error(error instanceof SupplierPropertyAccessApiError ? error.message : "Could not remove grant");
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Supplier Property Access"
        description="Grant a supplier's portal user rate management access to one of their linked properties."
        actions={
          canCreate ? (
            <Button
              onClick={() => {
                setEditing(undefined);
                setDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Grant access
            </Button>
          ) : undefined
        }
      />
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      <Card>
        {!loading && grants.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            tone="primary"
            heading="No access grants yet"
            description="Grant a supplier user rate access to get started."
            size="compact"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Property — Supplier</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {grants.map((grant) => (
                <TableRow key={grant.id}>
                  <TableCell className="font-medium">
                    {(grant.propertyName ?? "Property") + " — " + (grant.supplierName ?? "Supplier")}
                  </TableCell>
                  <TableCell>{grant.userName ?? `User ${grant.userKey}`}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {FLAGS.filter((f) => grant[f.key]).map((f) => (
                        <Badge key={f.key} variant="outline">
                          {f.label}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={grant.isActive ? "default" : "secondary"}>
                      {grant.isActive ? "active" : "inactive"}
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
                              setEditing(grant);
                              setDialogOpen(true);
                            }}
                          >
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => void toggleActive(grant)}>
                            {grant.isActive ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => void removeGrant(grant)}>Remove</DropdownMenuItem>
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
      <AccessDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        grant={editing}
        links={links}
        supplierUsers={supplierUsers}
        tenantKey={tenantKey}
        companyKey={companyKey}
        onSaved={upsertLocal}
      />
    </div>
  );
}

export default function SupplierPropertyAccessPage() {
  return (
    <AccessGate module="supplierPropertyAccess">
      {(roleDef) => <SupplierPropertyAccessList roleDef={roleDef} />}
    </AccessGate>
  );
}
