"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Loader2, MailCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/lib/services/auth.service";

function useForgotPasswordSchema() {
  const t = useTranslations("auth.validation");
  return z.object({
    email: z.string().min(1, t("emailRequired")).email(t("emailInvalid")),
  });
}

type ForgotPasswordValues = z.infer<ReturnType<typeof useForgotPasswordSchema>>;

export function ForgotPasswordForm() {
  const t = useTranslations("auth.forgotPassword");
  const common = useTranslations("common");
  const schema = useForgotPasswordSchema();
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: ForgotPasswordValues) {
    await requestPasswordReset(values.email);
    setSubmittedEmail(values.email);
  }

  if (submittedEmail) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <MailCheck className="h-6 w-6 text-primary" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-xl font-semibold tracking-tight">{t("successTitle")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("successBody", { email: submittedEmail })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSubmittedEmail(null)}
          className="text-sm font-medium text-primary hover:underline"
        >
          {t("resend")}
        </button>
        <div>
          <Link href="/login" className="text-sm text-muted-foreground hover:underline">
            {common("backToLogin")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
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

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSubmitting ? t("submitting") : t("submit")}
        </Button>
      </form>

      <div className="text-center">
        <Link href="/login" className="text-sm text-muted-foreground hover:underline">
          {common("backToLogin")}
        </Link>
      </div>
    </div>
  );
}
