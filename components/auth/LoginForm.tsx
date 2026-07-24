"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CircleAlert, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authenticate, InvalidCredentialsError } from "@/lib/services/auth.service";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { useRolesStore } from "@/lib/store/roles.store";
import { roleHomePath } from "@/config/permissions";
import { PasswordInput } from "./PasswordInput";
import { DevRoleSwitcher } from "./DevRoleSwitcher";
import Link from "next/link";

function useLoginSchema() {
  const t = useTranslations("auth.validation");
  return z.object({
    email: z.string().min(1, t("emailRequired")).email(t("emailInvalid")),
    password: z.string().min(1, t("passwordRequired")),
  });
}

type LoginValues = z.infer<ReturnType<typeof useLoginSchema>>;

export function LoginForm() {
  const t = useTranslations("auth.login");
  const tenant = useTenantStore((s) => s.tenant);
  const login = useSessionStore((s) => s.login);
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const schema = useLoginSchema();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: LoginValues) {
    setServerError(null);
    try {
      const user = await authenticate(values.email, values.password);
      const roleDef = useRolesStore.getState().roles.find((r) => r.id === user.roleId);
      if (!roleDef) throw new InvalidCredentialsError();
      login(user);
      toast.success(t("success", { name: user.name }));
      router.push(roleHomePath(roleDef));
    } catch (err) {
      setServerError(err instanceof InvalidCredentialsError ? t("invalidCredentials") : t("invalidCredentials"));
    }
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-7 duration-500">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("subtitle", { tenant: tenant.branding.name })}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {serverError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/10 px-3.5 py-3 text-sm text-destructive"
          >
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{serverError}</p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">{t("emailLabel")}</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder={t("emailPlaceholder")}
              aria-invalid={!!errors.email}
              className="h-10 ps-9"
              {...register("email")}
            />
          </div>
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t("passwordLabel")}</Label>
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-primary hover:underline"
            >
              {t("forgotPassword")}
            </Link>
          </div>
          <PasswordInput
            id="password"
            icon={Lock}
            autoComplete="current-password"
            placeholder={t("passwordPlaceholder")}
            aria-invalid={!!errors.password}
            className="h-10"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>

        <Button type="submit" className="h-10 w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSubmitting ? t("submitting") : t("submit")}
        </Button>
      </form>

      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" />
        Your connection to {tenant.branding.name} is secure
      </p>

      <DevRoleSwitcher />
    </div>
  );
}
