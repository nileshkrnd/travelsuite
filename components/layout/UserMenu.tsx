"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Globe2, Layers, LogOut, Settings, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSessionStore } from "@/lib/store/session.store";
import { useRolesStore } from "@/lib/store/roles.store";
import { isPlatformMode, useTenantStore } from "@/lib/store/tenant.store";
import { roleHomePath } from "@/config/permissions";
import { SUPER_ADMIN_ROLE_ID } from "@/mock/data/roles";
import { initials } from "@/lib/utils";
import { toast } from "sonner";

export function UserMenu() {
  const user = useSessionStore((s) => s.user);
  const logout = useSessionStore((s) => s.logout);
  const roles = useRolesStore((s) => s.roles);
  const tenantId = useTenantStore((s) => s.tenantId);
  const clearTenantSelection = useTenantStore((s) => s.clearTenantSelection);
  const router = useRouter();
  const t = useTranslations("topbar");

  const roleDef = user ? roles.find((r) => r.id === user.roleId) : undefined;
  const isSuperAdmin = user?.roleId === SUPER_ADMIN_ROLE_ID;
  const platformMode = isPlatformMode(tenantId);
  const photoUrl = user?.avatarUrl?.trim() || "";

  if (!user || !roleDef) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="gap-2 px-1.5" />}>
        <Avatar size="sm" className="ring-1 ring-border">
          {photoUrl ? <AvatarImage src={photoUrl} alt={user.name} /> : null}
          <AvatarFallback>{initials(user.name)}</AvatarFallback>
        </Avatar>
        <span className="hidden max-w-32 truncate text-sm font-medium sm:inline">{user.name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <div className="flex items-center gap-3 py-0.5">
              <Avatar size="lg" className="ring-1 ring-border">
                {photoUrl ? <AvatarImage src={photoUrl} alt={user.name} /> : null}
                <AvatarFallback>{initials(user.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
                <p className="truncate text-xs font-normal text-muted-foreground">{user.email}</p>
                <p className="truncate text-xs font-normal text-muted-foreground">{roleDef.name}</p>
              </div>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push(`/${roleDef.slug}/settings`)}>
          <UserIcon className="h-4 w-4" />
          {t("profile")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push(`/${roleDef.slug}/settings`)}>
          <Settings className="h-4 w-4" />
          {t("settings")}
        </DropdownMenuItem>
        {isSuperAdmin && (
          <>
            <DropdownMenuItem onClick={() => router.push("/select-tenant")}>
              <Layers className="h-4 w-4" />
              {t("switchTenant")}
            </DropdownMenuItem>
            {!platformMode && (
              <DropdownMenuItem
                onClick={() => {
                  clearTenantSelection();
                  toast.success("Returned to platform settings");
                  router.push(roleHomePath(roleDef));
                }}
              >
                <Globe2 className="h-4 w-4" />
                {t("unselectTenant")}
              </DropdownMenuItem>
            )}
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => {
            logout();
            router.push("/login");
          }}
        >
          <LogOut className="h-4 w-4" />
          {t("logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
