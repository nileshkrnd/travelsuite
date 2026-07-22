import { cn, initials } from "@/lib/utils";
import { contrastForeground } from "@/lib/color";
import type { TenantBranding } from "@/types";

interface TenantLogoProps {
  branding: TenantBranding;
  size?: "sm" | "md" | "lg";
  showName?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<TenantLogoProps["size"]>, string> = {
  sm: "h-7 w-7 text-xs rounded-md",
  md: "h-9 w-9 text-sm rounded-lg",
  lg: "h-12 w-12 text-lg rounded-xl",
};

/**
 * Phase 1 renders a monogram derived from the tenant name/brand color since
 * no real logo assets exist yet. Phase 2: swap for an <img src={branding.logoUrl}>
 * with this monogram as the onError fallback.
 */
export function TenantLogo({ branding, size = "md", showName = false, className }: TenantLogoProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn("flex shrink-0 items-center justify-center font-semibold", SIZE_CLASSES[size])}
        style={{ backgroundColor: branding.primaryColor, color: contrastForeground(branding.primaryColor) }}
        aria-hidden
      >
        {initials(branding.name)}
      </div>
      {showName && <span className="font-semibold text-foreground">{branding.name}</span>}
    </div>
  );
}
