import type { Metadata } from "next";
import { Suspense } from "react";
import { TenantRegisterForm } from "@/components/marketing/TenantRegisterForm";
import { SAAS_BRAND } from "@/config/saasBrand";

export const metadata: Metadata = {
  title: `Register tenant — ${SAAS_BRAND.name}`,
  description: `Create a ${SAAS_BRAND.name} tenant workspace and choose your subscription modules.`,
};

export default function RegisterPage() {
  return (
    <div className="border-b border-[#1a1814]/10 bg-[#efeae2]">
      <div className="mx-auto max-w-3xl px-4 py-3 text-xs text-[#1a1814]/55 sm:px-6">
        {SAAS_BRAND.name} · Standard SaaS subscription · Prototype registration
      </div>
      <div className="bg-[#f6f3ee] px-4 sm:px-6">
        <Suspense
          fallback={<div className="mx-auto max-w-3xl py-20 text-sm text-[#1a1814]/55">Loading…</div>}
        >
          <TenantRegisterForm />
        </Suspense>
      </div>
    </div>
  );
}
