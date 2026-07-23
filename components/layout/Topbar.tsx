"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CurrencySwitcher } from "@/components/layout/CurrencySwitcher";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { UserMenu } from "@/components/layout/UserMenu";
import { DevTenantSwitcher } from "@/components/layout/DevTenantSwitcher";
import { useSessionStore } from "@/lib/store/session.store";
import { useRolesStore } from "@/lib/store/roles.store";
import { useUiPrefsStore } from "@/lib/store/ui-prefs.store";
import { flatMenuItems } from "@/config/permissions";
import { ICONS } from "@/lib/icon-registry";

export function Topbar() {
  const user = useSessionStore((s) => s.user);
  const roles = useRolesStore((s) => s.roles);
  const pathname = usePathname();
  const setMobileDrawerOpen = useUiPrefsStore((s) => s.setMobileDrawerOpen);
  const t = useTranslations("sidebar");

  const roleDef = user ? roles.find((r) => r.id === user.roleId) : undefined;
  const activeItem = roleDef
    ? flatMenuItems().find((item) => {
        const href = `/${roleDef.slug}/${item.path}`;
        return pathname === href || pathname.startsWith(`${href}/`);
      })
    : undefined;
  const ActiveIcon = activeItem ? ICONS[activeItem.icon] : undefined;

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

      {activeItem && ActiveIcon && (
        <div className="flex min-w-0 items-center gap-2">
          <ActiveIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <h2 className="truncate text-sm font-semibold text-foreground">{t(activeItem.key)}</h2>
        </div>
      )}

      <div className="flex-1" />

      <div className="flex items-center gap-1.5">
        <DevTenantSwitcher />
        <Separator orientation="vertical" className="mx-1 h-6" />
        <div className="flex items-center gap-0.5">
          <CurrencySwitcher />
          <LanguageSwitcher />
        </div>
        <Separator orientation="vertical" className="mx-1 h-6" />
        <UserMenu />
      </div>
    </header>
  );
}
