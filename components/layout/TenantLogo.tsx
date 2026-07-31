"use client";

import { useState } from "react";
import { cn, initials } from "@/lib/utils";
import { contrastForeground } from "@/lib/color";
import { SAAS_BRAND } from "@/config/saasBrand";
import type { TenantBranding } from "@/types";

interface TenantLogoProps {
  branding: TenantBranding;
  size?: "sm" | "md" | "lg";
  showName?: boolean;
  /** Prefer compact mark (favicon) instead of full lockup when available. */
  markOnly?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<TenantLogoProps["size"]>, string> = {
  sm: "h-7 w-7 text-xs rounded-md",
  md: "h-9 w-9 text-sm rounded-lg",
  lg: "h-12 w-12 text-lg rounded-xl",
};

const IMG_HEIGHT: Record<NonNullable<TenantLogoProps["size"]>, string> = {
  sm: "h-7",
  md: "h-9",
  lg: "h-12",
};

function resolveLogoSrc(branding: TenantBranding, markOnly: boolean): string | null {
  if (!branding.logoUrl) return null;
  const isPlatformBrand =
    branding.logoUrl === SAAS_BRAND.logoUrl ||
    branding.logoUrl.includes("al-asmakh") ||
    branding.logoUrl.includes("klyra-logo");
  if (markOnly && isPlatformBrand) return SAAS_BRAND.faviconUrl;
  return branding.logoUrl;
}

/**
 * Renders tenant/platform logo from branding.logoUrl, with monogram fallback.
 * Super Admin chrome uses Nexus platform assets; Tenant Admin uses their tenant logo when set.
 */
export function TenantLogo({
  branding,
  size = "md",
  showName = false,
  markOnly = false,
  className,
}: TenantLogoProps) {
  const [failed, setFailed] = useState(false);
  const src = resolveLogoSrc(branding, markOnly);
  const showImage = !!src && !failed;
  const isPlatformLockup = src === SAAS_BRAND.logoUrl;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- dynamic tenant/platform URLs
        <img
          src={src}
          alt={branding.name}
          className={cn(
            "w-auto object-contain",
            IMG_HEIGHT[size],
            isPlatformLockup && !markOnly ? "max-w-[140px]" : SIZE_CLASSES[size]
          )}
          onError={() => setFailed(true)}
        />
      ) : (
        <div
          className={cn("flex shrink-0 items-center justify-center font-semibold", SIZE_CLASSES[size])}
          style={{
            backgroundColor: branding.primaryColor,
            color: contrastForeground(branding.primaryColor),
          }}
          aria-hidden
        >
          {initials(branding.name)}
        </div>
      )}
      {showName && !isPlatformLockup && (
        <span className="font-semibold text-foreground">{branding.name}</span>
      )}
    </div>
  );
}
