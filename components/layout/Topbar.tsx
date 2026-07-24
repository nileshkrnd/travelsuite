"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CurrencySwitcher } from "@/components/layout/CurrencySwitcher";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/layout/ThemeSwitcher";
import { NotificationCenter } from "@/components/layout/NotificationCenter";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { OrgScopeSelectors } from "@/components/layout/OrgScopeSelectors";
import { UserMenu } from "@/components/layout/UserMenu";
import { DevTenantSwitcher } from "@/components/layout/DevTenantSwitcher";
import { useSessionStore } from "@/lib/store/session.store";
import { useRolesStore } from "@/lib/store/roles.store";
import { useUiPrefsStore } from "@/lib/store/ui-prefs.store";
import { MENU_ITEMS, flatMenuItems } from "@/config/permissions";
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

  const groupLabel = activeItem
    ? (() => {
        for (const group of MENU_ITEMS) {
          if (group.children?.some((c) => c.key === activeItem.key)) return t(group.key);
        }
        return null;
      })()
    : null;

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
        <div className="hidden min-w-0 flex-col sm:flex">
          {groupLabel && (
            <p className="truncate text-[11px] leading-none text-muted-foreground">{groupLabel}</p>
          )}
          <div className="flex min-w-0 items-center gap-2">
            <ActiveIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <h2 className="truncate text-sm font-semibold text-foreground">{t(activeItem.key)}</h2>
          </div>
        </div>
      )}

      <div className="flex-1" />

      <GlobalSearch />

      <OrgScopeSelectors />

      <div className="flex items-center gap-1.5">
        <DevTenantSwitcher />
        <Separator orientation="vertical" className="mx-1 hidden h-6 sm:block" />
        <NotificationCenter />
        <div className="flex items-center gap-0.5">
          <ThemeSwitcher />
          <CurrencySwitcher />
          <LanguageSwitcher />
        </div>
        <Separator orientation="vertical" className="mx-1 h-6" />
        <UserMenu />
      </div>
    </header>
  );
}
