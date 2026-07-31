import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { SAAS_BRAND } from "@/config/saasBrand";

export const metadata: Metadata = { title: `Forgot password — ${SAAS_BRAND.name}` };

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
