"use client";

import { useMemo, useState } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Users, MoreHorizontal } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { useUsersStore } from "@/lib/store/users.store";
import { useRolesStore } from "@/lib/store/roles.store";
import { useCompaniesStore } from "@/lib/store/companies.store";
import { useBranchesStore } from "@/lib/store/branches.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { can } from "@/config/permissions";
import { initials } from "@/lib/utils";
import type { RoleDef, User } from "@/types";

const NONE = "__none__";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  roleId: z.string().min(1, "Select a role"),
  companyId: z.string(),
  branchId: z.string(),
  department: z.string(),
});
type FormValues = z.infer<typeof schema>;

function EmployeeDialog({
  open,
  onOpenChange,
  employee,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: User;
}) {
  const roles = useRolesStore((s) => s.roles);
  const companies = useCompaniesStore((s) => s.companies);
  const branches = useBranchesStore((s) => s.branches);
  const addUser = useUsersStore((s) => s.addUser);
  const updateUser = useUsersStore((s) => s.updateUser);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      name: employee?.name ?? "",
      email: employee?.email ?? "",
      roleId: employee?.roleId ?? "",
      companyId: employee?.companyId ?? NONE,
      branchId: employee?.branchId ?? NONE,
      department: employee?.department ?? "",
    },
  });

  const watchedCompanyId = useWatch({ control, name: "companyId" });
  const availableBranches = branches.filter((b) => watchedCompanyId !== NONE && b.companyId === watchedCompanyId);

  async function onSubmit(values: FormValues) {
    const patch = {
      name: values.name,
      email: values.email,
      roleId: values.roleId,
      companyId: values.companyId === NONE ? undefined : values.companyId,
      branchId: values.branchId === NONE ? undefined : values.branchId,
      department: values.department || undefined,
    };
    if (employee) {
      updateUser(employee.id, patch);
      toast.success("Employee updated");
    } else {
      addUser(patch);
      toast.success("Employee registered — status set to invited");
    }
    onOpenChange(false);
    reset();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{employee ? "Edit employee" : "Register employee"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="empName">Full name</Label>
            <Input id="empName" autoFocus {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="empEmail">Email</Label>
            <Input id="empEmail" type="email" {...register("email")} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Controller
              control={control}
              name="roleId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={(v) => field.onChange(v ?? "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.roleId && <p className="text-sm text-destructive">{errors.roleId.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Company</Label>
              <Controller
                control={control}
                name="companyId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => field.onChange(v ?? NONE)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>None</SelectItem>
                      {companies.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Branch</Label>
              <Controller
                control={control}
                name="branchId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => field.onChange(v ?? NONE)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>None</SelectItem>
                      {availableBranches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="empDept">Department (optional)</Label>
            <Input id="empDept" {...register("department")} />
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {employee ? "Save" : "Register"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EmployeeList({ roleDef }: { roleDef: RoleDef }) {
  const tenantId = useTenantStore((s) => s.tenantId);
  const users = useUsersStore((s) => s.users);
  const setUserStatus = useUsersStore((s) => s.setUserStatus);
  const roles = useRolesStore((s) => s.roles);
  const companies = useCompaniesStore((s) => s.companies);
  const branches = useBranchesStore((s) => s.branches);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<User | undefined>();
  const [roleFilter, setRoleFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");

  const canEdit = can(roleDef, "employee", "edit");
  const canCreate = can(roleDef, "employee", "create");
  const canDelete = can(roleDef, "employee", "delete");

  const roleName = (id: string) => roles.find((r) => r.id === id)?.name ?? "—";
  const companyName = (id?: string) => companies.find((c) => c.id === id)?.name;
  const branchName = (id?: string) => branches.find((b) => b.id === id)?.name;

  const employees = useMemo(() => users.filter((u) => u.tenantId === tenantId), [users, tenantId]);
  const filtered = useMemo(
    () =>
      employees.filter(
        (u) =>
          (roleFilter === "all" || u.roleId === roleFilter) &&
          (companyFilter === "all" || u.companyId === companyFilter)
      ),
    [employees, roleFilter, companyFilter]
  );

  function openAdd() {
    setEditing(undefined);
    setDialogOpen(true);
  }
  function openEdit(user: User) {
    setEditing(user);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Employee"
        description="Everyone with a login to this tenant."
        actions={
          canCreate ? (
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4" />
              Register employee
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-wrap gap-2">
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v ?? "all")}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {roles.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {companies.length > 0 && (
          <Select value={companyFilter} onValueChange={(v) => setCompanyFilter(v ?? "all")}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All companies</SelectItem>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            tone="primary"
            heading="No employees match"
            description="Try a different filter, or register a new employee."
            size="compact"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Company / Branch</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Avatar size="sm">
                        <AvatarFallback>{initials(user.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{user.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{roleName(user.roleId)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {companyName(user.companyId) ?? "—"}
                    {branchName(user.branchId) ? ` · ${branchName(user.branchId)}` : ""}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.status === "active" ? "default" : user.status === "invited" ? "secondary" : "outline"}>
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {(canEdit || canDelete) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canEdit && <DropdownMenuItem onClick={() => openEdit(user)}>Edit</DropdownMenuItem>}
                          {canDelete && user.status !== "deactivated" && (
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setUserStatus(user.id, "deactivated")}
                            >
                              Deactivate
                            </DropdownMenuItem>
                          )}
                          {canDelete && user.status === "deactivated" && (
                            <DropdownMenuItem onClick={() => setUserStatus(user.id, "active")}>
                              Reactivate
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
        )}
      </Card>
      <EmployeeDialog open={dialogOpen} onOpenChange={setDialogOpen} employee={editing} />
    </div>
  );
}

export default function EmployeeMasterPage() {
  return <AccessGate module="employee">{(roleDef) => <EmployeeList roleDef={roleDef} />}</AccessGate>;
}
