"use client";

import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { User as UserIcon, Mail, Briefcase, KeyRound, UserPlus, Save, X, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { useUsersStore } from "@/lib/store/users.store";
import { useRolesStore } from "@/lib/store/roles.store";
import { useCompaniesStore } from "@/lib/store/companies.store";
import { useBranchesStore } from "@/lib/store/branches.store";
import { createUser, updateUser, UsersApiError } from "@/lib/services/db-users.service";
import { UserType } from "@/types";
import { initials } from "@/lib/utils";
import type { User } from "@/types";

const NONE = "__none__";

function useSchema(isCreate: boolean) {
  return z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().min(1, "Company email is required").email("Enter a valid company email"),
    password: isCreate
      ? z.string().min(6, "Password must be at least 6 characters")
      : z.string().optional(),
    roleId: z.string().min(1, "Select a role"),
    companyId: z.string().refine((v) => v !== NONE, "Company is required"),
    branchId: z.string(),
    department: z.string(),
  });
}

type FormValues = z.infer<ReturnType<typeof useSchema>>;

/**
 * Employee master — registering an employee creates their login user
 * (TenantID + CompanyID) using the company email as Username.
 * Separate User creation is only available in Tenant Configuration (platform).
 */
export function InternalEmployeeForm({ employee }: { employee?: User }) {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();
  const sessionUser = useSessionStore((s) => s.user);
  const activeTenant = useTenantStore((s) => s.tenant);
  const roles = useRolesStore((s) => s.roles);
  const companies = useCompaniesStore((s) => s.companies);
  const branches = useBranchesStore((s) => s.branches);
  const upsertUser = useUsersStore((s) => s.upsertUser);
  const updateLocal = useUsersStore((s) => s.updateUser);
  const isEdit = !!employee;
  const internalRoles = roles.filter((r) => r.category === "internal");
  const schema = useSchema(!isEdit);

  const actorKey = sessionUser?.userKey ?? 0;
  const tenantKey = sessionUser?.tenantKey ?? activeTenant.tenantKey ?? 0;

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      name: employee?.name ?? "",
      email: employee?.email ?? "",
      password: "",
      roleId: employee?.roleId ?? "",
      companyId: employee?.companyId ?? NONE,
      branchId: employee?.branchId ?? NONE,
      department: employee?.department ?? "",
    },
  });

  const nameValue = useWatch({ control, name: "name" });
  const companyId = useWatch({ control, name: "companyId" });
  const availableBranches = branches.filter((b) => companyId !== NONE && b.companyId === companyId);
  const previewName = nameValue?.trim() || "Employee name";
  const tenantCompanies = companies.filter(
    (c) => c.tenantId === activeTenant.id && c.status === "active" && c.companyKey > 0
  );

  async function onSubmit(values: FormValues) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    if (tenantKey <= 0) {
      toast.error("Select a tenant workspace before registering employees.");
      return;
    }

    const company = companies.find((c) => c.id === values.companyId);
    if (!company || company.companyKey <= 0) {
      toast.error("Select a company for this employee.");
      return;
    }

    const email = values.email.trim().toLowerCase();
    const name = values.name.trim();
    const branchId = values.branchId !== NONE ? values.branchId : undefined;
    const department = values.department || undefined;

    try {
      if (isEdit && employee) {
        const saved = await updateUser(employee.userKey, {
          username: email,
          password: values.password?.trim() || undefined,
          userDisplayName: name,
          tenantId: tenantKey,
          companyId: company.companyKey,
          userTypeId: UserType.InternalEmployee,
          isActive: employee.isActive,
          modifiedBy: actorKey,
        });
        upsertUser({
          ...saved,
          roleId: values.roleId,
          companyId: company.id,
          branchId,
          department,
        });
        updateLocal(saved.id, { roleId: values.roleId, companyId: company.id, branchId, department });
        toast.success("Employee updated — login username is the company email");
        router.push(`/${role}/masters/employee/${saved.id}`);
      } else {
        const created = await createUser({
          username: email,
          password: values.password!.trim(),
          userDisplayName: name,
          tenantId: tenantKey,
          companyId: company.companyKey,
          userTypeId: UserType.InternalEmployee,
          createdBy: actorKey,
        });
        upsertUser({
          ...created,
          roleId: values.roleId,
          companyId: company.id,
          branchId,
          department,
        });
        toast.success("Employee registered — login created with company email");
        router.push(`/${role}/masters/employee/${created.id}`);
      }
    } catch (error) {
      toast.error(error instanceof UsersApiError ? error.message : "Could not save employee");
    }
  }

  if (tenantCompanies.length === 0) {
    return (
      <Card className="max-w-xl">
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Add a company first — employees belong to a company and branch. Go to Masters → Company to create one.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px] lg:items-start">
      <Card>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <p className="text-sm text-muted-foreground">
              Registering an employee creates their login using the company email (TenantID + CompanyID). There is no
              separate Users screen inside a tenant.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" required>
                  Full name
                </Label>
                <div className="relative">
                  <UserIcon className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    autoFocus
                    placeholder="e.g. Priya Sharma"
                    aria-invalid={!!errors.name}
                    className="h-10 ps-9"
                    {...register("name")}
                  />
                </div>
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" required>
                  Company email (login username)
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    aria-invalid={!!errors.email}
                    className="h-10 ps-9"
                    disabled={isEdit}
                    {...register("email")}
                  />
                </div>
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" required={!isEdit}>
                {isEdit ? "New password (optional)" : "Login password"}
              </Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  className="h-10 ps-9"
                  {...register("password")}
                />
              </div>
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>

            <div className="space-y-2">
              <Label required>Role</Label>
              <Controller
                control={control}
                name="roleId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => field.onChange(v ?? "")}>
                    <SelectTrigger className="h-10 w-full">
                      <KeyRound className="h-4 w-4 text-muted-foreground" />
                      <SelectValue>
                        {(value: string | null) =>
                          value ? (internalRoles.find((r) => r.id === value)?.name ?? value) : "Select role"
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {internalRoles.map((r) => (
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

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label required>Company</Label>
                <Controller
                  control={control}
                  name="companyId"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(v) => {
                        field.onChange(v ?? NONE);
                        setValue("branchId", NONE);
                      }}
                    >
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue>
                          {(value: string | null) =>
                            !value || value === NONE
                              ? "Select company"
                              : (tenantCompanies.find((c) => c.id === value)?.name ?? value)
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {tenantCompanies.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.companyId && <p className="text-sm text-destructive">{errors.companyId.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Branch</Label>
                <Controller
                  control={control}
                  name="branchId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={(v) => field.onChange(v ?? NONE)}>
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue>
                          {(value: string | null) =>
                            !value || value === NONE
                              ? "None"
                              : (availableBranches.find((b) => b.id === value)?.name ?? value)
                          }
                        </SelectValue>
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
              <Label htmlFor="department">Department (optional)</Label>
              <div className="relative">
                <Briefcase className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
                <Input id="department" placeholder="e.g. Sales" className="h-10 ps-9" {...register("department")} />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button type="submit" disabled={isSubmitting}>
                {isEdit ? <Save className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                {isEdit ? "Save changes" : "Register employee"}
              </Button>
              <Button
                type="button"
                variant="outline"
                nativeButton={false}
                render={
                  <Link href={isEdit ? `/${role}/masters/employee/${employee.id}` : `/${role}/masters/employee`} />
                }
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-muted/40">
        <CardContent className="space-y-4">
          <p className="text-xs font-medium text-muted-foreground">Preview</p>
          <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
              aria-hidden
            >
              {initials(previewName)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{previewName}</p>
              <Badge variant="secondary" className="mt-0.5">
                {isEdit ? (employee?.status ?? "active") : "login created"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
