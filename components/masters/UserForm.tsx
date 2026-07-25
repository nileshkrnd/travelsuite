"use client";

import { useForm } from "react-hook-form";
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
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore, isPlatformMode } from "@/lib/store/tenant.store";
import { useUsersStore } from "@/lib/store/users.store";
import { createUser, updateUser, UsersApiError } from "@/lib/services/db-users.service";
import { SUPER_ADMIN_ROLE_ID } from "@/mock/data/roles";
import type { User } from "@/types";

function useUserSchema(isCreate: boolean) {
  return z.object({
    userDisplayName: z.string().min(1, "Display name is required"),
    username: z.string().min(1, "Username is required").email("Use an email-style username"),
    password: isCreate
      ? z.string().min(6, "Password must be at least 6 characters")
      : z.string().optional(),
  });
}

type FormValues = z.infer<ReturnType<typeof useUserSchema>>;

/**
 * Platform Tenant Configuration only — Super Admin accounts (TenantID=0, CompanyID=0 / T0C0).
 */
export function UserForm({ user }: { user?: User }) {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();
  const sessionUser = useSessionStore((s) => s.user);
  const actorUsers = useUsersStore((s) => s.users);
  const upsertLocal = useUsersStore((s) => s.upsertUser);
  const activeTenantId = useTenantStore((s) => s.tenantId);
  const isSuperAdmin = sessionUser?.roleId === SUPER_ADMIN_ROLE_ID;
  const platformMode = isSuperAdmin && isPlatformMode(activeTenantId);
  const isCreate = !user;

  const actorKey = sessionUser
    ? (actorUsers.find((u) => u.id === sessionUser.id)?.userKey ?? sessionUser.userKey ?? 0)
    : 0;

  const schema = useUserSchema(isCreate);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      userDisplayName: user?.name ?? "",
      username: user?.username ?? user?.email ?? "",
      password: "",
    },
  });

  async function onSubmit(values: FormValues) {
    if (!actorKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    if (!platformMode) {
      toast.error("Users are created in Tenant Configuration only.");
      return;
    }

    // Super Admin Users master is T0C0 only.
    const tenantId = 0;
    const companyId = 0;

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

  return (
    <Card className="max-w-2xl">
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <p className="text-sm text-muted-foreground">
            Super Admin — TenantID 0, CompanyID 0 (T0C0).
          </p>

          <div className="space-y-2">
            <Label htmlFor="userDisplayName" required>
              Display name
            </Label>
            <Input id="userDisplayName" autoFocus {...register("userDisplayName")} />
            {errors.userDisplayName && (
              <p className="text-sm text-destructive">{errors.userDisplayName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="username" required>
              Username (email)
            </Label>
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
            <Label htmlFor="password" required={isCreate}>
              {isCreate ? "Password" : "New password (optional)"}
            </Label>
            <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          </div>

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
