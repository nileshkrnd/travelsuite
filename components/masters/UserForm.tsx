"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Save, UserPlus, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore, isPlatformMode } from "@/lib/store/tenant.store";
import { useTenantsStore } from "@/lib/store/tenants.store";
import { useCompaniesStore } from "@/lib/store/companies.store";
import { useUsersStore } from "@/lib/store/users.store";
import { createUser, updateUser, UsersApiError } from "@/lib/services/db-users.service";
import { listTenants } from "@/lib/services/tenants.service";
import { SUPER_ADMIN_ROLE_ID } from "@/mock/data/roles";
import type { User } from "@/types";

function useUserSchema(isCreate: boolean) {
  return z.object({
    userDisplayName: z.string().min(1, "Display name is required"),
    username: z.string().min(1, "Username is required").email("Use an email-style username"),
    password: isCreate
      ? z.string().min(6, "Password must be at least 6 characters")
      : z.string().optional(),
    tenantId: z.number().int().min(0),
    companyId: z.number().int().min(0),
  });
}

type FormValues = z.infer<ReturnType<typeof useUserSchema>>;

/**
 * Create/edit User master records.
 * Super Admin (platform): TenantID=0/CompanyID=0 or Tenant Admin (tenant/0).
 * Tenant Admin: employees under their tenant (company optional).
 */
export function UserForm({ user }: { user?: User }) {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();
  const sessionUser = useSessionStore((s) => s.user);
  const actorUsers = useUsersStore((s) => s.users);
  const upsertLocal = useUsersStore((s) => s.upsertUser);
  const activeTenantId = useTenantStore((s) => s.tenantId);
  const activeTenant = useTenantStore((s) => s.tenant);
  const tenants = useTenantsStore((s) => s.tenants);
  const setTenants = useTenantsStore((s) => s.setTenants);
  const companies = useCompaniesStore((s) => s.companies);
  const isSuperAdmin = sessionUser?.roleId === SUPER_ADMIN_ROLE_ID;
  const platformMode = isSuperAdmin && isPlatformMode(activeTenantId);
  const isCreate = !user;

  const actorKey = sessionUser
    ? (actorUsers.find((u) => u.id === sessionUser.id)?.userKey ?? sessionUser.userKey ?? 0)
    : 0;

  const schema = useUserSchema(isCreate);

  const defaultTenantKey = useMemo(() => {
    if (user) return user.tenantKey;
    if (isSuperAdmin && platformMode) return 0;
    return activeTenant.tenantKey ?? 0;
  }, [user, isSuperAdmin, platformMode, activeTenant.tenantKey]);

  const defaultCompanyKey = useMemo(() => {
    if (user) return user.companyKey;
    if (!isSuperAdmin) {
      const first = companies.find(
        (c) => c.tenantId === activeTenant.id && c.status === "active" && c.companyKey > 0
      );
      return first?.companyKey ?? 0;
    }
    return 0;
  }, [user, isSuperAdmin, companies, activeTenant.id]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      userDisplayName: user?.name ?? "",
      username: user?.username ?? user?.email ?? "",
      password: "",
      tenantId: defaultTenantKey,
      companyId: defaultCompanyKey,
    },
  });

  const tenantIdValue = watch("tenantId");
  const [loadingTenants, setLoadingTenants] = useState(false);

  useEffect(() => {
    if (!isSuperAdmin || !platformMode) return;
    let cancelled = false;
    setLoadingTenants(true);
    listTenants()
      .then((rows) => {
        if (!cancelled) setTenants(rows);
      })
      .finally(() => {
        if (!cancelled) setLoadingTenants(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isSuperAdmin, platformMode, setTenants]);

  const companyOptions = useMemo(() => {
    if (tenantIdValue <= 0) return [];
    const tenantUid =
      tenants.find((t) => t.tenantKey === tenantIdValue)?.id ??
      (activeTenant.tenantKey === tenantIdValue ? activeTenant.id : undefined);
    if (!tenantUid) return [];
    return companies.filter((c) => c.tenantId === tenantUid && c.status === "active" && c.companyKey > 0);
  }, [tenantIdValue, tenants, companies, activeTenant.tenantKey, activeTenant.id]);

  async function onSubmit(values: FormValues) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }

    let tenantId = values.tenantId;
    let companyId = values.companyId;

    if (!isSuperAdmin) {
      // Tenant Admin creates employee logins for their tenant only.
      tenantId = sessionUser?.tenantKey ?? activeTenant.tenantKey ?? 0;
      if (tenantId <= 0) {
        toast.error("Tenant Admin must belong to a tenant.");
        return;
      }
      if (companyId <= 0) {
        toast.error("Select a company for the employee login.");
        return;
      }
    } else if (platformMode && tenantId === 0) {
      companyId = 0;
    }

    try {
      if (user) {
        const saved = await updateUser(user.userKey, {
          username: values.username.trim(),
          password: values.password?.trim() || undefined,
          userDisplayName: values.userDisplayName.trim(),
          tenantId,
          companyId,
          isActive: user.isActive,
          modifiedBy: actorKey,
        });
        upsertLocal(saved);
        toast.success("User updated");
        router.push(`/${role}/masters/users/${saved.id}`);
      } else {
        const created = await createUser({
          username: values.username.trim(),
          password: values.password!.trim(),
          userDisplayName: values.userDisplayName.trim(),
          tenantId,
          companyId,
          createdBy: actorKey,
        });
        upsertLocal(created);
        toast.success("User created");
        router.push(`/${role}/masters/users/${created.id}`);
      }
    } catch (error) {
      toast.error(error instanceof UsersApiError ? error.message : "Could not save user");
    }
  }

  const scopeHint =
    tenantIdValue === 0
      ? "Super Admin — TenantID 0, CompanyID 0 (platform / tenant configuration)."
      : watch("companyId") === 0
        ? "Tenant Admin — TenantID set, CompanyID 0."
        : "Employee login — TenantID and CompanyID set.";

  return (
    <Card className="max-w-2xl">
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <p className="text-sm text-muted-foreground">{scopeHint}</p>

          <div className="space-y-2">
            <Label htmlFor="userDisplayName">Display name</Label>
            <Input id="userDisplayName" autoFocus {...register("userDisplayName")} />
            {errors.userDisplayName && (
              <p className="text-sm text-destructive">{errors.userDisplayName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username (email)</Label>
            <Input
              id="username"
              type="email"
              disabled={!isCreate}
              placeholder="user@example.com"
              {...register("username")}
            />
            {errors.username && <p className="text-sm text-destructive">{errors.username.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{isCreate ? "Password" : "New password (optional)"}</Label>
            <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          </div>

          {isSuperAdmin && platformMode && (
            <div className="space-y-2">
              <Label>Tenant</Label>
              <Controller
                control={control}
                name="tenantId"
                render={({ field }) => (
                  <Select
                    value={String(field.value)}
                    onValueChange={(value) => {
                      field.onChange(Number(value));
                      setValue("companyId", 0);
                    }}
                    disabled={loadingTenants}
                  >
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Platform (Super Admin)</SelectItem>
                      {tenants.map((t) => (
                        <SelectItem key={t.id} value={String(t.tenantKey)}>
                          {t.branding.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          {tenantIdValue > 0 && (
            <div className="space-y-2">
              <Label>Company</Label>
              <Controller
                control={control}
                name="companyId"
                render={({ field }) => (
                  <Select
                    value={String(field.value)}
                    onValueChange={(value) => field.onChange(Number(value))}
                  >
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {isSuperAdmin && <SelectItem value="0">None — Tenant Admin</SelectItem>}
                      {companyOptions.map((c) => (
                        <SelectItem key={c.id} value={String(c.companyKey)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-xs text-muted-foreground">
                {isSuperAdmin
                  ? "Leave as None for Tenant Admin. Pick a company for an employee login."
                  : "Pick a company — Tenant Admin creates employee logins only."}
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <Button type="submit" disabled={isSubmitting}>
              {isCreate ? <UserPlus className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {isCreate ? "Create user" : "Save changes"}
            </Button>
            <Button type="button" variant="outline" nativeButton={false} render={<Link href={`/${role}/masters/users`} />}>
              <X className="h-4 w-4" />
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
