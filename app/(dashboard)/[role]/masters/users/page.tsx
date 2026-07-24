"use client";

import { useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
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
import { useAgenciesStore } from "@/lib/store/agencies.store";
import { useSubAgenciesStore } from "@/lib/store/subAgencies.store";
import { useCorporatesStore } from "@/lib/store/corporates.store";
import { useSuppliersStore } from "@/lib/store/suppliers.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { can } from "@/config/permissions";
import { initials } from "@/lib/utils";
import type { RoleCategory, RoleDef, User } from "@/types";

const NONE = "__none__";

const CATEGORY_LABELS: Record<RoleCategory, string> = {
  internal: "Internal Staff",
  agency: "Agency",
  subAgency: "SubAgency",
  corporate: "Corporate",
  supplier: "Supplier",
};
const CATEGORIES: RoleCategory[] = ["internal", "agency", "subAgency", "corporate", "supplier"];

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  category: z.enum(["internal", "agency", "subAgency", "corporate", "supplier"]),
  roleId: z.string().min(1, "Select a role"),
  companyId: z.string(),
  branchId: z.string(),
  agencyId: z.string(),
  subAgencyId: z.string(),
  corporateId: z.string(),
  supplierId: z.string(),
  department: z.string(),
});
type FormValues = z.infer<typeof schema>;

function useOrgName() {
  const companies = useCompaniesStore((s) => s.companies);
  const branches = useBranchesStore((s) => s.branches);
  const agencies = useAgenciesStore((s) => s.agencies);
  const subAgencies = useSubAgenciesStore((s) => s.subAgencies);
  const corporates = useCorporatesStore((s) => s.corporates);
  const suppliers = useSuppliersStore((s) => s.suppliers);

  return (user: User) => {
    if (user.companyId) {
      const company = companies.find((c) => c.id === user.companyId)?.name;
      const branch = branches.find((b) => b.id === user.branchId)?.name;
      return [company, branch].filter(Boolean).join(" · ") || "—";
    }
    if (user.agencyId) return agencies.find((a) => a.id === user.agencyId)?.name ?? "—";
    if (user.subAgencyId) return subAgencies.find((s) => s.id === user.subAgencyId)?.name ?? "—";
    if (user.corporateId) return corporates.find((c) => c.id === user.corporateId)?.name ?? "—";
    if (user.supplierId) return suppliers.find((s) => s.id === user.supplierId)?.name ?? "—";
    return "—";
  };
}

function UserDialog({
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
  const agencies = useAgenciesStore((s) => s.agencies);
  const subAgencies = useSubAgenciesStore((s) => s.subAgencies);
  const corporates = useCorporatesStore((s) => s.corporates);
  const suppliers = useSuppliersStore((s) => s.suppliers);
  const addUser = useUsersStore((s) => s.addUser);
  const updateUser = useUsersStore((s) => s.updateUser);

  const employeeRole = employee ? roles.find((r) => r.id === employee.roleId) : undefined;

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      name: employee?.name ?? "",
      email: employee?.email ?? "",
      category: employeeRole?.category ?? "internal",
      roleId: employee?.roleId ?? "",
      companyId: employee?.companyId ?? NONE,
      branchId: employee?.branchId ?? NONE,
      agencyId: employee?.agencyId ?? NONE,
      subAgencyId: employee?.subAgencyId ?? NONE,
      corporateId: employee?.corporateId ?? NONE,
      supplierId: employee?.supplierId ?? NONE,
      department: employee?.department ?? "",
    },
  });

  const [category, setCategory] = useState<RoleCategory>(employeeRole?.category ?? "internal");
  const [companyId, setCompanyId] = useState(employee?.companyId ?? NONE);
  const rolesForCategory = roles.filter((r) => r.category === category);
  const availableBranches = branches.filter((b) => companyId !== NONE && b.companyId === companyId);

  async function onSubmit(values: FormValues) {
    const patch = {
      name: values.name,
      email: values.email,
      roleId: values.roleId,
      companyId: values.category === "internal" && values.companyId !== NONE ? values.companyId : undefined,
      branchId: values.category === "internal" && values.branchId !== NONE ? values.branchId : undefined,
      agencyId: values.category === "agency" && values.agencyId !== NONE ? values.agencyId : undefined,
      subAgencyId: values.category === "subAgency" && values.subAgencyId !== NONE ? values.subAgencyId : undefined,
      corporateId: values.category === "corporate" && values.corporateId !== NONE ? values.corporateId : undefined,
      supplierId: values.category === "supplier" && values.supplierId !== NONE ? values.supplierId : undefined,
      department: values.department || undefined,
    };
    if (employee) {
      updateUser(employee.id, patch);
      toast.success("User updated");
    } else {
      addUser(patch);
      toast.success("User registered — status set to invited");
    }
    onOpenChange(false);
    reset();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{employee ? "Edit user" : "Register user"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="userName">Full name</Label>
            <Input id="userName" autoFocus {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="userEmail">Email</Label>
            <Input id="userEmail" type="email" {...register("email")} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    const next = (v ?? "internal") as RoleCategory;
                    field.onChange(next);
                    setCategory(next);
                    setValue("roleId", "");
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {CATEGORY_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
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
                    {rolesForCategory.map((r) => (
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

          {category === "internal" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Company</Label>
                <Controller
                  control={control}
                  name="companyId"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(v) => {
                        field.onChange(v ?? NONE);
                        setCompanyId(v ?? NONE);
                        setValue("branchId", NONE);
                      }}
                    >
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
          )}

          {category === "agency" && (
            <div className="space-y-2">
              <Label>Agency</Label>
              <Controller
                control={control}
                name="agencyId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => field.onChange(v ?? NONE)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select an agency" />
                    </SelectTrigger>
                    <SelectContent>
                      {agencies.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          {category === "subAgency" && (
            <div className="space-y-2">
              <Label>SubAgency</Label>
              <Controller
                control={control}
                name="subAgencyId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => field.onChange(v ?? NONE)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a sub-agency" />
                    </SelectTrigger>
                    <SelectContent>
                      {subAgencies.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} ({agencies.find((a) => a.id === s.agencyId)?.name ?? "—"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          {category === "corporate" && (
            <div className="space-y-2">
              <Label>Corporate account</Label>
              <Controller
                control={control}
                name="corporateId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => field.onChange(v ?? NONE)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a corporate account" />
                    </SelectTrigger>
                    <SelectContent>
                      {corporates.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          {category === "supplier" && (
            <div className="space-y-2">
              <Label>Supplier</Label>
              <Controller
                control={control}
                name="supplierId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => field.onChange(v ?? NONE)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="userDept">Department (optional)</Label>
            <Input id="userDept" {...register("department")} />
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

function UsersList({ roleDef }: { roleDef: RoleDef }) {
  const tenantId = useTenantStore((s) => s.tenantId);
  const users = useUsersStore((s) => s.users);
  const setUserStatus = useUsersStore((s) => s.updateUser);
  const roles = useRolesStore((s) => s.roles);
  const getOrgName = useOrgName();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);
  const [editing, setEditing] = useState<User | undefined>();
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const canEdit = can(roleDef, "users", "edit");
  const canCreate = can(roleDef, "users", "create");
  const canDelete = can(roleDef, "users", "delete");

  const roleFor = (id: string) => roles.find((r) => r.id === id);

  const employees = useMemo(() => users.filter((u) => u.tenantId === tenantId), [users, tenantId]);
  const filtered = useMemo(
    () => employees.filter((u) => categoryFilter === "all" || roleFor(u.roleId)?.category === categoryFilter),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [employees, categoryFilter, roles]
  );

  function openAdd() {
    setEditing(undefined);
    setDialogOpen(true);
    setDialogKey((k) => k + 1);
  }
  function openEdit(user: User) {
    setEditing(user);
    setDialogOpen(true);
    setDialogKey((k) => k + 1);
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Users"
        description="Every account with a login to this tenant, across every category."
        actions={
          canCreate ? (
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4" />
              Register user
            </Button>
          ) : undefined
        }
      />

      <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? "all")}>
        <SelectTrigger className="w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {CATEGORIES.map((c) => (
            <SelectItem key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            tone="primary"
            heading="No users match"
            description="Try a different filter, or register a new user."
            size="compact"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Organization</TableHead>
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
                  <TableCell>{roleFor(user.roleId)?.name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{getOrgName(user)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        user.status === "active" ? "default" : user.status === "invited" ? "secondary" : "outline"
                      }
                    >
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
                              onClick={() => setUserStatus(user.id, { status: "deactivated" })}
                            >
                              Deactivate
                            </DropdownMenuItem>
                          )}
                          {canDelete && user.status === "deactivated" && (
                            <DropdownMenuItem onClick={() => setUserStatus(user.id, { status: "active" })}>
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
      <UserDialog key={dialogKey} open={dialogOpen} onOpenChange={setDialogOpen} employee={editing} />
    </div>
  );
}

export default function UsersMasterPage() {
  return <AccessGate module="users">{(roleDef) => <UsersList roleDef={roleDef} />}</AccessGate>;
}
