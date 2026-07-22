"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TenantLogo } from "@/components/layout/TenantLogo";
import { CurrencySwitcher } from "@/components/layout/CurrencySwitcher";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { UserMenu } from "@/components/layout/UserMenu";
import { DevTenantSwitcher } from "@/components/layout/DevTenantSwitcher";
import { useTenantStore } from "@/lib/store/tenant.store";
import { useUiPrefsStore } from "@/lib/store/ui-prefs.store";

export function Topbar() {
  const branding = useTenantStore((s) => s.tenant.branding);
  const setMobileDrawerOpen = useUiPrefsStore((s) => s.setMobileDrawerOpen);

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b bg-background px-4 lg:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        aria-label="Open navigation"
        onClick={() => setMobileDrawerOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <TenantLogo branding={branding} size="sm" showName className="hidden sm:flex" />

      <div className="flex-1" />

      <div className="flex items-center gap-1.5">
        <DevTenantSwitcher />
        <CurrencySwitcher />
        <LanguageSwitcher />
        <UserMenu />
      </div>
    </header>
  );
}
