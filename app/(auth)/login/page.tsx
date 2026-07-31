import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";
import { SAAS_BRAND } from "@/config/saasBrand";

export const metadata: Metadata = { title: `Sign in — ${SAAS_BRAND.name}` };

export default function LoginPage() {
  return <LoginForm />;
}
