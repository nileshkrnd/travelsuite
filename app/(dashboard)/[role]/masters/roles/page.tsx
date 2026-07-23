"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, MoreHorizontal } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRolesStore } from "@/lib/store/roles.store";
import { can, type ModuleKey, type PermissionAction } from "@/config/permissions";
import type { RoleDef } from "@/types";

const MODULE_LABELS: Record<ModuleKey, string> = {
  dashboard: "Dashboard",
  bookings: "Bookings",
  inventory: "Inventory",
  agents: "Agents",
  corporate: "Corporate",
  billing: "Billing",
  reports: "Reports",
  settings: "Settings",
  masters: "Masters",
  tenantProfile: "Tenant",
  company: "Company",
  branch: "Branch",
  employee: "Employee",
  roles: "Roles",
};

const PERMISSION_MODULES: ModuleKey[] = [
  "dashboard",
  "bookings",
  "inventory",
  "agents",
  "corporate",
  "billing",
  "reports",
  "settings",
  "tenantProfile",
  "company",
  "branch",
  "employee",
  "roles",
];

const ACTIONS: PermissionAction[] = ["view", "create", "edit", "delete", "approve"];
const ACTION_LABELS: Record<PermissionAction, string> = {
  view: "View",
  create: "Create",
  edit: "Edit",
  delete: "Delete",
  approve: "Approve",
};

type PermissionsState = Partial<Record<ModuleKey, PermissionAction[]>>;

function togglePermission(
  perms: PermissionsState,
  module: ModuleKey,
  action: PermissionAction,
  checked: boolean
): PermissionsState {
  const current = perms[module] ?? [];
  const next = checked ? [...new Set([...current, action])] : current.filter((a) => a !== action);
  return { ...perms, [module]: next };
}

const nameSchema = z.object({
  name: z.string().min(1, "Role name is required"),
  description: z.string(),
});
type NameValues = z.infer<typeof nameSchema>;

function RoleDialog({
  open,
  onOpenChange,
  role,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role?: RoleDef;
}) {
  const addRole = useRolesStore((s) => s.addRole);
  const updateRole = useRolesStore((s) => s.updateRole);
  // Parent remounts this component (via `key`) each time it opens, so a plain
  // lazy initializer is enough — no effect needed to resync on role changes.
  const [permissions, setPermissions] = useState<PermissionsState>(() => role?.permissions ?? {});

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NameValues>({
    resolver: zodResolver(nameSchema),
    values: { name: role?.name ?? "", description: role?.description ?? "" },
  });

  async function onSubmit(values: NameValues) {
    if (role) {
      updateRole(role.id, {
        description: values.description,
        permissions,
        ...(role.isSystem ? {} : { name: values.name }),
      });
      toast.success("Role updated");
    } else {
      addRole({ name: values.name, description: values.description, scopeKind: "all", permissions });
      toast.success("Role created");
    }
    onOpenChange(false);
    reset();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{role ? `Edit ${role.name}` : "New role"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="roleName">Role name</Label>
              <Input id="roleName" autoFocus disabled={role?.isSystem} {...register("name")} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              {role?.isSystem && (
                <p className="text-xs text-muted-foreground">System role names can&apos;t be changed.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="roleDescription">Description</Label>
              <Input id="roleDescription" {...register("description")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Permissions</Label>
            <div className="max-h-80 overflow-y-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Module</TableHead>
                    {ACTIONS.map((action) => (
                      <TableHead key={action} className="text-center">
                        {ACTION_LABELS[action]}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PERMISSION_MODULES.map((module) => (
                    <TableRow key={module}>
                      <TableCell className="font-medium">{MODULE_LABELS[module]}</TableCell>
                      {ACTIONS.map((action) => (
                        <TableCell key={action} className="text-center">
                          <Checkbox
                            checked={permissions[module]?.includes(action) ?? false}
                            onCheckedChange={(checked) =>
                              setPermissions((p) => togglePermission(p, module, action, checked === true))
                            }
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {role ? "Save" : "Create role"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RolesList({ roleDef }: { roleDef: RoleDef }) {
  const roles = useRolesStore((s) => s.roles);
  const deleteRole = useRolesStore((s) => s.deleteRole);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RoleDef | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<RoleDef | undefined>();
  // Forces RoleDialog to remount on each open, so its local permissions state
  // starts fresh from the target role instead of carrying over stale edits.
  const [dialogKey, setDialogKey] = useState(0);

  const canEdit = can(roleDef, "roles", "edit");
  const canCreate = can(roleDef, "roles", "create");
  const canDelete = can(roleDef, "roles", "delete");

  function openAdd() {
    setEditing(undefined);
    setDialogOpen(true);
    setDialogKey((k) => k + 1);
  }
  function openEdit(role: RoleDef) {
    setEditing(role);
    setDialogOpen(true);
    setDialogKey((k) => k + 1);
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Roles"
        description="Define what each role can see and do."
        actions={
          canCreate ? (
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4" />
              New role
            </Button>
          ) : undefined
        }
      />
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((role) => (
              <TableRow key={role.id}>
                <TableCell className="font-medium">{role.name}</TableCell>
                <TableCell>
                  <Badge variant={role.isSystem ? "secondary" : "outline"}>
                    {role.isSystem ? "System" : "Custom"}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-xs truncate text-muted-foreground">
                  {role.description ?? "—"}
                </TableCell>
                <TableCell>
                  {(canEdit || canDelete) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canEdit && (
                          <DropdownMenuItem onClick={() => openEdit(role)}>Edit permissions</DropdownMenuItem>
                        )}
                        {canDelete && !role.isSystem && (
                          <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(role)}>
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <RoleDialog key={dialogKey} open={dialogOpen} onOpenChange={setDialogOpen} role={editing} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Employees assigned this role will need a new one. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) {
                  deleteRole(deleteTarget.id);
                  toast.success("Role deleted");
                }
                setDeleteTarget(undefined);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function RolesMasterPage() {
  return <AccessGate module="roles">{(roleDef) => <RolesList roleDef={roleDef} />}</AccessGate>;
}
