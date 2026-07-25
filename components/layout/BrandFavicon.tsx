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
 * Super Admin → Klyra favicon.
 * Tenant Admin → tenant logo when set, otherwise Klyra favicon.
 */
export function BrandFavicon() {
  const branding = useChromeBranding();

  useEffect(() => {
    const isKlyra =
      branding.logoUrl === SAAS_BRAND.logoUrl || branding.logoUrl.includes("klyra-logo");
    const href =
      branding.logoUrl && !isKlyra ? branding.logoUrl : SAAS_BRAND.faviconUrl;

    upsertIconLink("icon", href);
    upsertIconLink("shortcut icon", href);
    upsertIconLink("apple-touch-icon", href);
  }, [branding.logoUrl]);

  return null;
}
