"use client";

import { Building2, Layers, Link2, ShieldCheck } from "lucide-react";
import { SAAS_BRAND } from "@/config/saasBrand";
import { BrandHomeLink } from "@/components/layout/BrandHomeLink";
import { isPlatformMode, useTenantStore } from "@/lib/store/tenant.store";
import { cn } from "@/lib/utils";

const PLATFORM_HIGHLIGHTS = [
  { icon: Layers, text: "Travel, Finance, Real Estate, HRMS and more — licensed by product" },
  { icon: Building2, text: "Multi-company control under one holding workspace" },
  { icon: Link2, text: "Shared administration, roles and audit across every business" },
  { icon: ShieldCheck, text: "Enterprise sign-in with tenant-scoped access" },
];

export function AuthBrandPanel() {
  const tenant = useTenantStore((s) => s.tenant);
  const tenantId = useTenantStore((s) => s.tenantId);
  const platform = isPlatformMode(tenantId);
  const branding = tenant.branding;
  const logoSrc = branding.logoUrl || SAAS_BRAND.logoUrl;
  const isPlatformLogo =
    logoSrc === SAAS_BRAND.logoUrl || logoSrc.includes("al-asmakh");

  return (
    <aside
      className={cn(
        "relative hidden flex-col justify-between overflow-hidden border-e border-[#001C35]/10 lg:flex",
        "bg-[#F8F9FB] text-[#001C35]"
      )}
    >
      {/* Atmosphere — soft navy wash + fine grid */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 0% 0%, rgba(10,74,110,0.10), transparent 55%), radial-gradient(ellipse 50% 40% at 100% 100%, rgba(0,28,53,0.06), transparent 50%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.045]"
        style={{
          backgroundImage: `linear-gradient(#001C35 1px, transparent 1px), linear-gradient(90deg, #001C35 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
        aria-hidden
      />

      <div className="relative flex flex-1 flex-col justify-between p-10 xl:p-14">
        <div className="space-y-8">
          <div className="space-y-5">
            <BrandHomeLink className="inline-flex transition-opacity hover:opacity-90">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoSrc}
                alt={branding.name || SAAS_BRAND.groupName}
                className={cn(
                  "w-auto object-contain object-left",
                  isPlatformLogo ? "h-14 max-w-[280px]" : "h-12 max-w-[220px]"
                )}
              />
            </BrandHomeLink>
            <div className="h-px w-16 bg-[#001C35]/25" aria-hidden />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#0A4A6E]">
                {platform ? `${SAAS_BRAND.groupName} · Platform` : "Workspace sign-in"}
              </p>
              <h1 className="mt-3 max-w-[12ch] text-[clamp(2rem,3.2vw,2.75rem)] font-semibold leading-[1.05] tracking-tight text-[#001C35]">
                {platform ? SAAS_BRAND.name : branding.name}
              </h1>
              <p className="mt-4 max-w-md text-base font-medium leading-snug text-[#001C35]/85">
                {platform
                  ? SAAS_BRAND.tagline
                  : `Sign in to manage ${branding.name} across companies and branches.`}
              </p>
              {platform && (
                <p className="mt-3 max-w-md text-sm leading-relaxed text-[#001C35]/55">
                  {SAAS_BRAND.description}
                </p>
              )}
            </div>
          </div>

          <ul className="space-y-3.5">
            {PLATFORM_HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-sm text-[#001C35]/70">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center border border-[#001C35]/12 bg-white text-[#001C35]">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="leading-snug pt-1.5">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-[#001C35]/45">
          © {new Date().getFullYear()} {SAAS_BRAND.groupName}. {SAAS_BRAND.shortName} platform.
        </p>
      </div>
    </aside>
  );
}
