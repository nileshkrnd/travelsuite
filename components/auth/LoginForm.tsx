"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authenticate, InvalidCredentialsError } from "@/lib/services/auth.service";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { roleHomePath } from "@/config/permissions";
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
      login(user);
      toast.success(t("success", { name: user.name }));
      router.push(roleHomePath(user.role));
    } catch (err) {
      if (err instanceof InvalidCredentialsError) {
        setServerError(t("invalidCredentials"));
      } else {
        setServerError(t("invalidCredentials"));
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("subtitle", { tenant: tenant.branding.name })}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{t("emailLabel")}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder={t("emailPlaceholder")}
            aria-invalid={!!errors.email}
            {...register("email")}
          />
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
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder={t("passwordPlaceholder")}
            aria-invalid={!!errors.password}
            {...register("password")}
          />
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>

        {serverError && (
          <p role="alert" className="text-sm text-destructive">
            {serverError}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSubmitting ? t("submitting") : t("submit")}
        </Button>
      </form>

      <DevRoleSwitcher />
    </div>
  );
}
