"use client";

import { useEffect } from "react";
import { SAAS_BRAND } from "@/config/saasBrand";
import { useChromeBranding } from "@/lib/hooks/useChromeBranding";

function upsertIconLink(rel: string, href: string) {
  let link = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!link) {
    link = document.createElement("link");
    link.rel = rel;
    document.head.appendChild(link);
  }
  if (link.href !== new URL(href, window.location.origin).href) {
    link.href = href;
  }
}

/**
 * Super Admin → Al Asmakh Nexus favicon.
 * Tenant Admin → tenant logo when set, otherwise platform favicon.
 * Legacy klyra-logo URLs are still treated as platform brand.
 */
export function BrandFavicon() {
  const branding = useChromeBranding();

  useEffect(() => {
    const isPlatformBrand =
      branding.logoUrl === SAAS_BRAND.logoUrl ||
      branding.logoUrl.includes("al-asmakh") ||
      branding.logoUrl.includes("klyra-logo");
    const href =
      branding.logoUrl && !isPlatformBrand ? branding.logoUrl : SAAS_BRAND.faviconUrl;

    upsertIconLink("icon", href);
    upsertIconLink("shortcut icon", href);
    upsertIconLink("apple-touch-icon", SAAS_BRAND.appleTouchIconUrl ?? href);
  }, [branding.logoUrl]);

  return null;
}
