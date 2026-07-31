import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { SAAS_BRAND } from "@/config/saasBrand";

export const metadata: Metadata = { title: `Reset password — ${SAAS_BRAND.name}` };

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
