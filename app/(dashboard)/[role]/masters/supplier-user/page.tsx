"use client";

import { useEffect, useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, UserPlus, MoreHorizontal } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { listAccessRoles } from "@/lib/services/access-roles.service";
import {
  listSupplierUsers,
  createSupplierUser,
  updateSupplierUser,
  setSupplierUserActive,
  deleteSupplierUser,
  SupplierUsersApiError,
} from "@/lib/services/supplier-users.service";
import { can } from "@/config/permissions";
import type { AccessRole, RoleDef, Supplier, SupplierUser } from "@/types";

const schema = z.object({
  supplierId: z.number().int().positive("Supplier is required"),
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email").max(200),
  dialCountryCode: z.string().trim().max(10).optional().or(z.literal("")),
  mobileNumber: z.string().trim().max(30).optional().or(z.literal("")),
  accessRoleId: z.number().int().positive("Access role is required"),
  password: z.string().trim().max(200).optional().or(z.literal("")),
});
type FormValues = z.infer<typeof schema>;

function SupplierUserDialog({
  open,
  onOpenChange,
  entry,
  suppliers,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: SupplierUser;
  suppliers: Supplier[];
  onSaved: (row: SupplierUser) => void;
}) {
  const sessionUser = useSessionStore((s) => s.user);
  const actorKey = sessionUser?.userKey ?? 0;
  const isEdit = !!entry;
  const [accessRoles, setAccessRoles] = useState<AccessRole[]>([]);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      supplierId: entry?.supplierId ?? 0,
      firstName: entry?.firstName ?? "",
      lastName: entry?.lastName ?? "",
      email: entry?.email ?? "",
      dialCountryCode: entry?.dialCountryCode ?? "",
      mobileNumber: entry?.mobileNumber ?? "",
      accessRoleId: entry?.accessRoleId ?? 0,
      password: "",
    },
  });

  const supplierId = useWatch({ control, name: "supplierId" });
  const selectedSupplier = suppliers.find((s) => s.supplierKey === supplierId);

  useEffect(() => {
    if (!selectedSupplier) {
      setAccessRoles([]);
      return;
    }
    let cancelled = false;
    listAccessRoles({ tenantId: selectedSupplier.tenantKey, companyId: selectedSupplier.companyKey, activeOnly: true })
      .then((rows) => {
        if (!cancelled) setAccessRoles(rows);
      })
      .catch(() => {
        if (!cancelled) setAccessRoles([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedSupplier]);

  async function onSubmit(values: FormValues) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    if (!isEdit && !values.password.trim()) {
      toast.error("Set an initial password for this user");
      return;
    }
    const payload = {
      supplierId: values.supplierId,
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      email: values.email.trim(),
      dialCountryCode: values.dialCountryCode?.trim() || null,
      mobileNumber: values.mobileNumber?.trim() || null,
      accessRoleId: values.accessRoleId,
      ...(values.password.trim() ? { password: values.password.trim() } : {}),
    };
    try {
      if (isEdit && entry) {
        const saved = await updateSupplierUser(entry.supplierUserKey, {
          ...payload,
          isActive: entry.isActive,
          updatedBy: actorKey,
        });
        onSaved(saved);
        toast.success("Supplier user updated");
      } else {
        const saved = await createSupplierUser({ ...payload, password: values.password.trim(), createdBy: actorKey });
        onSaved(saved);
        toast.success("Supplier user registered — login account created");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof SupplierUsersApiError ? error.message : "Could not save supplier user");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit supplier user" : "Register supplier user"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label required>Supplier</Label>
            <Controller
              control={control}
              name="supplierId"
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : ""}
                  onValueChange={(v) => field.onChange(Number(v))}
                  disabled={isEdit}
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
              <Label htmlFor="firstName" required>
                First name
              </Label>
              <Input id="firstName" autoFocus aria-invalid={!!errors.firstName} {...register("firstName")} />
              {errors.firstName && <p className="text-sm text-destructive">{errors.firstName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" required>
                Last name
              </Label>
              <Input id="lastName" aria-invalid={!!errors.lastName} {...register("lastName")} />
              {errors.lastName && <p className="text-sm text-destructive">{errors.lastName.message}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" required>
              Email
            </Label>
            <Input id="email" type="email" aria-invalid={!!errors.email} {...register("email")} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-[7rem_1fr]">
            <div className="space-y-2">
              <Label htmlFor="dialCountryCode">Dial code</Label>
              <Input id="dialCountryCode" placeholder="+974" {...register("dialCountryCode")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mobileNumber">Mobile number</Label>
              <Input id="mobileNumber" {...register("mobileNumber")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label required>Access role</Label>
            <Controller
              control={control}
              name="accessRoleId"
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : ""}
                  onValueChange={(v) => field.onChange(Number(v))}
                  disabled={!selectedSupplier}
                >
                  <SelectTrigger className="w-full" aria-invalid={!!errors.accessRoleId}>
                    <SelectValue placeholder={selectedSupplier ? "Select access role" : "Select a supplier first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {accessRoles.map((r) => (
                      <SelectItem key={r.accessRoleId} value={String(r.accessRoleId)}>
                        {r.accessRoleName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.accessRoleId && <p className="text-sm text-destructive">{errors.accessRoleId.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" required={!isEdit}>
              {isEdit ? "New password" : "Password"}
            </Label>
            <Input
              id="password"
              type="password"
              placeholder={isEdit ? "Leave blank to keep current password" : undefined}
              {...register("password")}
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isEdit ? "Save" : "Register"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SupplierUserList({ roleDef }: { roleDef: RoleDef }) {
  const sessionUser = useSessionStore((s) => s.user);
  const activeTenant = useTenantStore((s) => s.tenant);
  const tenantKey = sessionUser?.tenantKey ?? activeTenant.tenantKey ?? 0;
  const actorKey = sessionUser?.userKey ?? 0;
  const [entries, setEntries] = useState<SupplierUser[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierUser | undefined>();
  const canEdit = can(roleDef, "supplierUser", "edit");
  const canCreate = can(roleDef, "supplierUser", "create");

  useEffect(() => {
    if (tenantKey <= 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    listSuppliers({ tenantId: tenantKey, activeOnly: true })
      .then(async (supplierRows) => {
        if (cancelled) return;
        setSuppliers(supplierRows);
        const results = await Promise.all(supplierRows.map((s) => listSupplierUsers({ supplierId: s.supplierKey })));
        if (!cancelled) setEntries(results.flat());
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load supplier users");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantKey]);

  function upsertLocal(row: SupplierUser) {
    setEntries((prev) => {
      const idx = prev.findIndex((r) => r.id === row.id);
      return idx === -1 ? [row, ...prev] : prev.map((r, i) => (i === idx ? row : r));
    });
  }

  async function toggleActive(entry: SupplierUser) {
    try {
      const saved = await setSupplierUserActive(entry.supplierUserKey, !entry.isActive, actorKey);
      upsertLocal(saved);
      toast.success(saved.isActive ? "Activated" : "Deactivated");
    } catch (error) {
      toast.error(error instanceof SupplierUsersApiError ? error.message : "Could not update status");
    }
  }

  async function removeEntry(entry: SupplierUser) {
    try {
      await deleteSupplierUser(entry.supplierUserKey);
      setEntries((prev) => prev.filter((r) => r.id !== entry.id));
      toast.success("Supplier user removed");
    } catch (error) {
      toast.error(error instanceof SupplierUsersApiError ? error.message : "Could not remove supplier user");
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Supplier User"
        description="Portal contacts for each supplier — registering one also creates their login account."
        actions={
          canCreate ? (
            <Button
              onClick={() => {
                setEditing(undefined);
                setDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Register user
            </Button>
          ) : undefined
        }
      />
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      <Card>
        {!loading && entries.length === 0 ? (
          <EmptyState
            icon={UserPlus}
            tone="primary"
            heading="No supplier users yet"
            description="Register your first supplier contact to get started."
            size="compact"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Access role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">
                    {entry.firstName} {entry.lastName}
                  </TableCell>
                  <TableCell>{entry.supplierName ?? `Supplier ${entry.supplierId}`}</TableCell>
                  <TableCell className="text-muted-foreground">{entry.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{entry.accessRoleName ?? "—"}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={entry.isActive ? "default" : "secondary"}>
                      {entry.isActive ? "active" : "inactive"}
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
                              setEditing(entry);
                              setDialogOpen(true);
                            }}
                          >
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => void toggleActive(entry)}>
                            {entry.isActive ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => void removeEntry(entry)}>Remove</DropdownMenuItem>
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
      <SupplierUserDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        entry={editing}
        suppliers={suppliers}
        onSaved={upsertLocal}
      />
    </div>
  );
}

export default function SupplierUserPage() {
  return <AccessGate module="supplierUser">{(roleDef) => <SupplierUserList roleDef={roleDef} />}</AccessGate>;
}
