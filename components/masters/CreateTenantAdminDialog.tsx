"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Check, Copy, KeyRound, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { createUser, UsersApiError } from "@/lib/services/db-users.service";
import { UserType, type Tenant, type User } from "@/types";

const schema = z.object({
  userDisplayName: z.string().min(1, "Display name is required"),
  username: z.string().min(1, "Username is required").email("Use an email-style username"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type FormValues = z.infer<typeof schema>;

interface CreatedCredentials {
  user: User;
  password: string;
  loginPath: string;
}

async function copyText(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  } catch {
    toast.error("Could not copy to clipboard");
  }
}

function ShareRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <code
          className={`min-w-0 flex-1 truncate rounded-md bg-muted px-2 py-1.5 text-sm text-foreground ${
            mono ? "font-mono" : ""
          }`}
        >
          {value}
        </code>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => void copyText(value, label)}
          aria-label={`Copy ${label}`}
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

/**
 * Super Admin creates a Tenant Admin (UserTypeID=2, CompanyID=0) for a registered tenant,
 * then shows login details to share.
 */
export function CreateTenantAdminDialog({
  open,
  onOpenChange,
  tenant,
  createdBy,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: Tenant;
  createdBy: number;
  onCreated?: (user: User) => void;
}) {
  const [created, setCreated] = useState<CreatedCredentials | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      userDisplayName: `${tenant.branding.name} Admin`,
      username: tenant.contact.email?.trim() || "",
      password: "",
    },
  });

  useEffect(() => {
    if (!open) {
      setCreated(null);
      reset({
        userDisplayName: `${tenant.branding.name} Admin`,
        username: tenant.contact.email?.trim() || "",
        password: "",
      });
    }
  }, [open, tenant, reset]);

  async function onSubmit(values: FormValues) {
    if (!createdBy) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    if (!tenant.tenantKey || tenant.tenantKey <= 0) {
      toast.error("This tenant has no TenantID yet — save the tenant first.");
      return;
    }

    try {
      const user = await createUser({
        username: values.username.trim().toLowerCase(),
        password: values.password,
        userDisplayName: values.userDisplayName.trim(),
        tenantId: tenant.tenantKey,
        companyId: 0,
        userTypeId: UserType.TenantAdmin,
        createdBy,
      });
      const loginPath = `/${tenant.slug}/login`;
      setCreated({ user, password: values.password, loginPath });
      onCreated?.(user);
      toast.success("Tenant Admin created — share the login details below");
    } catch (error) {
      toast.error(error instanceof UsersApiError ? error.message : "Could not create Tenant Admin");
    }
  }

  function shareBundle(): string {
    if (!created) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return [
      `Tenant: ${tenant.branding.name}`,
      `Tenant code: ${tenant.slug}`,
      `Login URL: ${origin}${created.loginPath}`,
      `Username: ${created.user.username}`,
      `Password: ${created.password}`,
      "",
      "Sign in, then set up companies, branches, and employees for your workspace.",
    ].join("\n");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{created ? "Share login details" : "Create Tenant Admin"}</DialogTitle>
          <DialogDescription>
            {created
              ? `Send these credentials to ${tenant.branding.name} so they can sign in and set up their workspace.`
              : `Creates a Tenant Admin for ${tenant.branding.name} (UserTypeID ${UserType.TenantAdmin}, CompanyID 0).`}
          </DialogDescription>
        </DialogHeader>

        {created ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p>
                Account <span className="font-medium">{created.user.name}</span> is ready. Copy and share
                the details — the password is shown only once.
              </p>
            </div>

            <ShareRow label="Login URL" value={`${typeof window !== "undefined" ? window.location.origin : ""}${created.loginPath}`} />
            <ShareRow label="Tenant code" value={tenant.slug} mono />
            <ShareRow label="Username" value={created.user.username} mono />
            <ShareRow label="Password" value={created.password} mono />

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => void copyText(shareBundle(), "Login details")}
            >
              <Copy className="h-4 w-4" />
              Copy all details
            </Button>

            <DialogFooter>
              <DialogClose render={<Button type="button" />}>Done</DialogClose>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ta-displayName" required>
                Display name
              </Label>
              <Input id="ta-displayName" autoFocus {...register("userDisplayName")} />
              {errors.userDisplayName && (
                <p className="text-sm text-destructive">{errors.userDisplayName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ta-username" required>
                Username (email)
              </Label>
              <Input
                id="ta-username"
                type="email"
                placeholder="admin@tenant.com"
                {...register("username")}
              />
              {errors.username && <p className="text-sm text-destructive">{errors.username.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ta-password" required>
                Temporary password
              </Label>
              <PasswordInput id="ta-password" autoComplete="new-password" {...register("password")} />
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
              <p className="text-xs text-muted-foreground">
                Share this with the tenant — they can change it after first login.
              </p>
            </div>

            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                <UserPlus className="h-4 w-4" />
                Create & show details
              </Button>
            </DialogFooter>
          </form>
        )}

        {!created && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <KeyRound className="h-3.5 w-3.5" />
            Login path: /{tenant.slug}/login
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
