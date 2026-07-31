import { AuthBrandPanel } from "@/components/auth/AuthBrandPanel";
import { BrandHomeLink } from "@/components/layout/BrandHomeLink";
import { SAAS_BRAND } from "@/config/saasBrand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-[#F8F9FB] text-[#001C35] lg:grid-cols-2">
      <AuthBrandPanel />

      <div className="relative flex flex-col justify-center px-5 py-10 sm:px-8 lg:px-12">
        {/* Mobile brand mark — desktop uses the left panel */}
        <div className="mb-8 flex flex-col items-start gap-3 lg:hidden">
          <BrandHomeLink className="inline-flex items-center gap-3" ariaLabel={SAAS_BRAND.name}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={SAAS_BRAND.logoUrl}
              alt={SAAS_BRAND.groupName}
              className="h-10 w-auto object-contain object-left"
            />
          </BrandHomeLink>
          <div className="h-px w-12 bg-[#001C35]/20" aria-hidden />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0A4A6E]">
              {SAAS_BRAND.shortName}
            </p>
            <p className="text-sm text-[#001C35]/55">{SAAS_BRAND.tagline}</p>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[26rem]">
          <div className="border border-[#001C35]/10 bg-white px-6 py-8 shadow-[0_1px_0_rgba(0,28,53,0.04)] sm:px-8">
            {children}
          </div>
          <p className="mt-6 text-center text-xs text-[#001C35]/45">
            <BrandHomeLink className="font-medium text-[#0A4A6E] hover:underline">
              {SAAS_BRAND.name}
            </BrandHomeLink>
            {" · "}
            Secure workspace access
          </p>
        </div>
      </div>
    </div>
  );
}
