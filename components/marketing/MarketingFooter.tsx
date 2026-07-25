import Link from "next/link";
import { SAAS_BRAND } from "@/config/saasBrand";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">{SAAS_BRAND.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{SAAS_BRAND.tagline}</p>
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <Link href="/#modules" className="hover:text-foreground">
            Modules
          </Link>
          <Link href="/#pricing" className="hover:text-foreground">
            Pricing
          </Link>
          <Link href="/register" className="hover:text-foreground">
            Register
          </Link>
          <Link href="/login" className="hover:text-foreground">
            Sign in
          </Link>
        </div>
      </div>
      <div className="border-t border-border">
        <p className="mx-auto max-w-6xl px-6 py-4 text-xs text-muted-foreground">
          © {new Date().getFullYear()} {SAAS_BRAND.legalName}. UI prototype — no real billing.
        </p>
      </div>
    </footer>
  );
}
