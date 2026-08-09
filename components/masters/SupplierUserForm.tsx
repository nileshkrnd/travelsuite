"use client";

import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Loader2, Save, UserPlus, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Section } from "@/components/masters/PropertyFormSection";
import { SearchableCombobox } from "@/components/shared/SearchableCombobox";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { listSuppliers } from "@/lib/services/suppliers.service";
import { listAccessRoles } from "@/lib/services/access-roles.service";
import {
  createSupplierUser,
  updateSupplierUser,
  SupplierUsersApiError,
} from "@/lib/services/supplier-users.service";
import type { AccessRole, Supplier, SupplierUser } from "@/types";

const schema = z.object({
  supplierId: z.number().int().positive("Supplier is required"),
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email").max(200),
  dialCountryCode: z.string().trim().max(10).optional().or(z.literal("")),
  mobileNumber: z.string().trim().max(30).optional().or(z.literal("")),
  accessRoleId: z.number().int().positive("Access role is required"),
  password: z.string().trim().max(200).optional().or(z.literal("")),
  isActive: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

function emptyValues(): FormValues {
  return {
    supplierId: 0,
    firstName: "",
    lastName: "",
    email: "",
    dialCountryCode: "",
    mobileNumber: "",
    accessRoleId: 0,
    password: "",
    isActive: true,
  };
}

function valuesFromEntry(entry: SupplierUser): FormValues {
  return {
    supplierId: entry.supplierId,
    firstName: entry.firstName,
    lastName: entry.lastName,
    email: entry.email,
    dialCountryCode: entry.dialCountryCode ?? "",
    mobileNumber: entry.mobileNumber ?? "",
    accessRoleId: entry.accessRoleId,
    password: "",
    isActive: entry.isActive,
  };
}

/** Shared Register / Modify form for a supplier portal user. */
export function SupplierUserForm({ entry }: { entry?: SupplierUser }) {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();
  const sessionUser = useSessionStore((s) => s.user);
  const activeTenant = useTenantStore((s) => s.tenant);
  const tenantKey = sessionUser?.tenantKey ?? activeTenant.tenantKey ?? 0;
  const actorKey = sessionUser?.userKey ?? 0;
  const isEdit = !!entry;

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [accessRoles, setAccessRoles] = useState<AccessRole[]>([]);
  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: entry ? valuesFromEntry(entry) : emptyValues(),
  });

  const supplierId = useWatch({ control, name: "supplierId" });
  const isActive = useWatch({ control, name: "isActive" });
  const firstName = useWatch({ control, name: "firstName" });
  const lastName = useWatch({ control, name: "lastName" });
  const selectedSupplier = suppliers.find((s) => s.supplierKey === supplierId);

  useEffect(() => {
    if (tenantKey <= 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    listSuppliers({ tenantId: tenantKey, activeOnly: true })
      .then((rows) => {
        if (!cancelled) setSuppliers(rows);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load suppliers");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantKey]);

  useEffect(() => {
    if (!selectedSupplier) {
      setAccessRoles([]);
      return;
    }
    let cancelled = false;
    listAccessRoles({ tenantId: selectedSupplier.tenantKey, activeOnly: true })
      .then((rows) => {
        if (!cancelled) {
          setAccessRoles(rows.filter((r) => r.companyId === 0 || r.companyId === selectedSupplier.companyKey));
        }
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
    const password = values.password?.trim() ?? "";
    if (!isEdit && !password) {
      toast.error("Set an initial password for this user");
      return;
    }
    if (password && password.length < 6) {
      toast.error("Password must be at least 6 characters");
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
      isActive: values.isActive,
      ...(password ? { password } : {}),
    };
    try {
      if (isEdit && entry) {
        const saved = await updateSupplierUser(entry.supplierUserKey, {
          ...payload,
          updatedBy: actorKey,
        });
        toast.success("Supplier user updated");
        router.push(`/${role}/masters/supplier-user/${saved.supplierUserKey}`);
      } else {
        const saved = await createSupplierUser({ ...payload, password, createdBy: actorKey });
        toast.success("Supplier user registered — login account created");
        router.push(`/${role}/masters/supplier-user/${saved.supplierUserKey}`);
      }
    } catch (error) {
      toast.error(error instanceof SupplierUsersApiError ? error.message : "Could not save supplier user");
    }
  }

  if (loading) {
    return (
      <Card className="max-w-xl">
        <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </CardContent>
      </Card>
    );
  }

  if (suppliers.length === 0) {
    return (
      <Card className="max-w-xl">
        <CardContent className="space-y-3 py-8 text-sm">
          <p className="font-medium">Add a supplier first</p>
          <p className="text-muted-foreground">
            Supplier users belong to a supplier — create one under Masters → Supplier.
          </p>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/${role}/masters/supplier`} />}
          >
            Go to suppliers
          </Button>
        </CardContent>
      </Card>
    );
  }

  const previewName = `${firstName || ""} ${lastName || ""}`.trim() || "New supplier user";

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,280px)] lg:items-start"
      noValidate
    >
      <div className="min-w-0 space-y-5">
        <Section icon={UserPlus} title="Supplier & identity" description="Portal contact linked to a supplier login account.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label required>Supplier</Label>
              <Controller
                control={control}
                name="supplierId"
                render={({ field }) => (
                  <SearchableCombobox
                    value={field.value || null}
                    onChange={(v) => field.onChange(v)}
                    options={suppliers.map((s) => ({ value: s.supplierKey, label: s.name, sublabel: s.code }))}
                    placeholder="Search supplier by name or code…"
                    emptyLabel="No suppliers found."
                    disabled={isEdit}
                    ariaInvalid={!!errors.supplierId}
                  />
                )}
              />
              {errors.supplierId && <p className="text-sm text-destructive">{errors.supplierId.message}</p>}
            </div>

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

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="email" required>
                Email
              </Label>
              <Input id="email" type="email" aria-invalid={!!errors.email} {...register("email")} />
              <p className="text-xs text-muted-foreground">Used as the login username.</p>
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dialCountryCode">Dial code</Label>
              <Input id="dialCountryCode" placeholder="+974" {...register("dialCountryCode")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mobileNumber">Mobile number</Label>
              <Input id="mobileNumber" {...register("mobileNumber")} />
            </div>
          </div>
        </Section>

        <Section icon={UserPlus} title="Access & login" description="Role for the portal and optional password change.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
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
                    <SelectTrigger className="h-10 w-full" aria-invalid={!!errors.accessRoleId}>
                      <SelectValue>
                        {(value: string | null) => {
                          if (!selectedSupplier) return "Select a supplier first";
                          if (!value) return "Select access role";
                          return (
                            accessRoles.find((r) => String(r.accessRoleId) === value)?.accessRoleName ??
                            "Select access role"
                          );
                        }}
                      </SelectValue>
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
              {errors.accessRoleId && (
                <p className="text-sm text-destructive">{errors.accessRoleId.message}</p>
              )}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="password" required={!isEdit}>
                {isEdit ? "New password" : "Password"}
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder={isEdit ? "Leave blank to keep current password" : undefined}
                {...register("password")}
              />
            </div>

            {isEdit && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Controller
                  control={control}
                  name="isActive"
                  render={({ field }) => (
                    <Select
                      value={field.value ? "active" : "inactive"}
                      onValueChange={(v) => field.onChange(v === "active")}
                    >
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue>
                          {(value: string | null) => (value === "active" ? "Active" : "Inactive")}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            )}
          </div>
        </Section>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEdit ? "Save changes" : "Register user"}
          </Button>
          <Button
            type="button"
            variant="outline"
            nativeButton={false}
            render={
              <Link
                href={
                  isEdit
                    ? `/${role}/masters/supplier-user/${entry.supplierUserKey}`
                    : `/${role}/masters/supplier-user`
                }
              />
            }
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
        </div>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6">
        <Card className="overflow-hidden p-0">
          <div className="flex h-24 items-end bg-gradient-to-br from-[#001C35] via-[#0a3558] to-[#1a5a7a] p-4 text-white">
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold">{previewName}</p>
              <p className="truncate text-sm text-white/75">
                {selectedSupplier?.name ?? "Select a supplier"}
              </p>
            </div>
          </div>
          <CardContent className="space-y-3 pt-4">
            <Badge variant={isActive ? "default" : "secondary"}>{isActive ? "active" : "inactive"}</Badge>
            <p className="text-xs text-muted-foreground">
              Registering creates a linked login user for the supplier portal.
            </p>
          </CardContent>
        </Card>
      </aside>
    </form>
  );
}
