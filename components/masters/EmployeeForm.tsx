"use client";

import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { User as UserIcon, Mail, Briefcase, Tag, KeyRound, UserPlus, Save, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUsersStore } from "@/lib/store/users.store";
import { useRolesStore } from "@/lib/store/roles.store";
import { useCompaniesStore } from "@/lib/store/companies.store";
import { useBranchesStore } from "@/lib/store/branches.store";
import { useAgenciesStore } from "@/lib/store/agencies.store";
import { useSubAgenciesStore } from "@/lib/store/subAgencies.store";
import { useCorporatesStore } from "@/lib/store/corporates.store";
import { useSuppliersStore } from "@/lib/store/suppliers.store";
import { initials } from "@/lib/utils";
import type { RoleCategory, User } from "@/types";

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

/** Shared Create/Modify form for the Employee (Users) master. */
export function EmployeeForm({ employee }: { employee?: User }) {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();
  const roles = useRolesStore((s) => s.roles);
  const companies = useCompaniesStore((s) => s.companies);
  const branches = useBranchesStore((s) => s.branches);
  const agencies = useAgenciesStore((s) => s.agencies);
  const subAgencies = useSubAgenciesStore((s) => s.subAgencies);
  const corporates = useCorporatesStore((s) => s.corporates);
  const suppliers = useSuppliersStore((s) => s.suppliers);
  const addUser = useUsersStore((s) => s.addUser);
  const updateUser = useUsersStore((s) => s.updateUser);
  const isEdit = !!employee;

  const employeeRole = employee ? roles.find((r) => r.id === employee.roleId) : undefined;

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

  const nameValue = useWatch({ control, name: "name" });
  const category = useWatch({ control, name: "category" });
  const companyId = useWatch({ control, name: "companyId" });
  const rolesForCategory = roles.filter((r) => r.category === category);
  const availableBranches = branches.filter((b) => companyId !== NONE && b.companyId === companyId);
  const previewName = nameValue?.trim() || "Employee name";

  async function onSubmit(values: FormValues) {
    const patch = {
      name: values.name.trim(),
      email: values.email.trim(),
      roleId: values.roleId,
      companyId: values.category === "internal" && values.companyId !== NONE ? values.companyId : undefined,
      branchId: values.category === "internal" && values.branchId !== NONE ? values.branchId : undefined,
      agencyId: values.category === "agency" && values.agencyId !== NONE ? values.agencyId : undefined,
      subAgencyId: values.category === "subAgency" && values.subAgencyId !== NONE ? values.subAgencyId : undefined,
      corporateId: values.category === "corporate" && values.corporateId !== NONE ? values.corporateId : undefined,
      supplierId: values.category === "supplier" && values.supplierId !== NONE ? values.supplierId : undefined,
      department: values.department || undefined,
    };
    if (isEdit && employee) {
      updateUser(employee.id, patch);
      toast.success("User updated");
      router.push(`/${role}/masters/users/${employee.id}`);
    } else {
      const created = addUser(patch);
      toast.success("User registered — status set to invited");
      router.push(`/${role}/masters/users/${created.id}`);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px] lg:items-start">
      <Card>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
                  Email
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    aria-invalid={!!errors.email}
                    className="h-10 ps-9"
                    {...register("email")}
                  />
                </div>
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label required>Category</Label>
                <Controller
                  control={control}
                  name="category"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(v) => {
                        const next = (v ?? "internal") as RoleCategory;
                        field.onChange(next);
                        setValue("roleId", "");
                      }}
                    >
                      <SelectTrigger className="h-10 w-full">
                        <Tag className="h-4 w-4 text-muted-foreground" />
                        <SelectValue>
                          {(value: RoleCategory | null) => (value ? CATEGORY_LABELS[value] : "Select category")}
                        </SelectValue>
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
                            value ? (rolesForCategory.find((r) => r.id === value)?.name ?? value) : "Select role"
                          }
                        </SelectValue>
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
            </div>

            {category === "internal" && (
              <div className="grid gap-4 sm:grid-cols-2">
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
                          setValue("branchId", NONE);
                        }}
                      >
                        <SelectTrigger className="h-10 w-full">
                          <SelectValue>
                            {(value: string | null) =>
                              !value || value === NONE
                                ? "None"
                                : (companies.find((c) => c.id === value)?.name ?? value)
                            }
                          </SelectValue>
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
            )}

            {category === "agency" && (
              <div className="space-y-2">
                <Label>Agency</Label>
                <Controller
                  control={control}
                  name="agencyId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={(v) => field.onChange(v ?? NONE)}>
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue>
                          {(value: string | null) =>
                            value && value !== NONE ? (agencies.find((a) => a.id === value)?.name ?? value) : "Select an agency"
                          }
                        </SelectValue>
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
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue>
                          {(value: string | null) =>
                            value && value !== NONE
                              ? (subAgencies.find((s) => s.id === value)?.name ?? value)
                              : "Select a sub-agency"
                          }
                        </SelectValue>
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
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue>
                          {(value: string | null) =>
                            value && value !== NONE
                              ? (corporates.find((c) => c.id === value)?.name ?? value)
                              : "Select a corporate account"
                          }
                        </SelectValue>
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
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue>
                          {(value: string | null) =>
                            value && value !== NONE ? (suppliers.find((s) => s.id === value)?.name ?? value) : "Select a supplier"
                          }
                        </SelectValue>
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
              <Label htmlFor="department">Department (optional)</Label>
              <div className="relative">
                <Briefcase className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
                <Input id="department" placeholder="e.g. Sales" className="h-10 ps-9" {...register("department")} />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button type="submit" disabled={isSubmitting}>
                {isEdit ? <Save className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                {isEdit ? "Save changes" : "Register user"}
              </Button>
              <Button
                type="button"
                variant="outline"
                nativeButton={false}
                render={
                  <Link href={isEdit ? `/${role}/masters/users/${employee.id}` : `/${role}/masters/users`} />
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
                {isEdit ? (employee?.status ?? "invited") : "invited"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
