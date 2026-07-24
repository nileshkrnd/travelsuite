"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowRight, Building2, LogOut, Search, SearchX } from "lucide-react";
import { useSessionStore, useSessionHydrated } from "@/lib/store/session.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { useTenantsStore } from "@/lib/store/tenants.store";
import { useRolesStore } from "@/lib/store/roles.store";
import { roleHomePath } from "@/config/permissions";
import { filterTenants, groupTenants } from "@/lib/tenants";
import { TenantLogo } from "@/components/layout/TenantLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { contrastForeground } from "@/lib/color";
import { cn, initials } from "@/lib/utils";
import type { Tenant } from "@/types";

/**
 * Full-screen workspace picker shown to Super Admin right after login.
 * Tenants are listed under their holding group, with live search.
 */
export function TenantSelection() {
  const t = useTranslations("auth.selectTenant");
  const router = useRouter();
  const hydrated = useSessionHydrated();
  const user = useSessionStore((s) => s.user);
  const logout = useSessionStore((s) => s.logout);
  const setTenant = useTenantStore((s) => s.setTenant);
  const tenants = useTenantsStore((s) => s.tenants);
  const roles = useRolesStore((s) => s.roles);
  const [query, setQuery] = useState("");

  const roleDef = user ? roles.find((r) => r.id === user.roleId) : undefined;

  const groups = useMemo(() => {
    const active = tenants.filter((tenant) => tenant.status === "active");
    return groupTenants(filterTenants(active, query));
  }, [tenants, query]);

  const matchCount = useMemo(() => groups.reduce((sum, g) => sum + g.tenants.length, 0), [groups]);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) router.replace("/login");
  }, [hydrated, user, router]);

  if (!hydrated || !user || !roleDef) return null;

  function selectTenant(tenant: Tenant) {
    setTenant(tenant.id);
    toast.success(t("success", { name: tenant.branding.name }));
    router.push(roleHomePath(roleDef!));
  }

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
      <div className="mx-auto flex min-h-full max-w-5xl flex-col px-6 py-10">
        <div className="flex items-center justify-between">
          <TenantLogo
            branding={{ name: "TravelSuite", logoUrl: "", primaryColor: "#4F46E5" }}
            size="md"
            showName
          />
          <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1.5 text-muted-foreground">
            <LogOut className="h-4 w-4" />
            {t("logout")}
          </Button>
        </div>

        <div className="mt-12 space-y-1.5 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle", { name: user.name.split(" ")[0] })}</p>
        </div>

        <div className="relative mt-6 max-w-xl animate-in fade-in slide-in-from-bottom-2 duration-500">
          <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="h-11 ps-9"
            autoFocus
          />
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          {t("resultCount", { count: matchCount, groups: groups.length })}
        </p>

        {groups.length === 0 ? (
          <div className="mt-16 flex flex-col items-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <SearchX className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">{t("emptyTitle")}</p>
              <p className="text-sm text-muted-foreground">{t("emptyDescription")}</p>
            </div>
            {query && (
              <Button variant="outline" size="sm" onClick={() => setQuery("")}>
                {t("clearSearch")}
              </Button>
            )}
          </div>
        ) : (
          <div className="mt-6 space-y-8 pb-10">
            {groups.map((group) => {
              const isHoldingWithChildren =
                group.tenants.length > 1 || group.tenants[0]?.branding.name !== group.groupName;

              return (
                <section key={group.groupName} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <h2 className="text-sm font-semibold tracking-wide text-foreground uppercase">
                      {group.groupName}
                    </h2>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                      {group.tenants.length}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {group.tenants.map((tenant) => {
                      const foreground = contrastForeground(tenant.branding.primaryColor);
                      return (
                        <button
                          key={tenant.id}
                          type="button"
                          onClick={() => selectTenant(tenant)}
                          className="group relative flex flex-col gap-4 overflow-hidden rounded-xl border bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                        >
                          <div
                            className="pointer-events-none absolute inset-x-0 top-0 h-1"
                            style={{ backgroundColor: tenant.branding.primaryColor }}
                            aria-hidden
                          />
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-sm font-semibold"
                              )}
                              style={{
                                backgroundColor: tenant.branding.primaryColor,
                                color: foreground,
                              }}
                              aria-hidden
                            >
                              {initials(tenant.branding.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-foreground">{tenant.branding.name}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {isHoldingWithChildren && tenant.branding.name !== group.groupName
                                  ? group.groupName
                                  : `${tenant.address.city}, ${tenant.address.country}`}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="rounded-full bg-muted px-2 py-0.5 font-mono">{tenant.slug}</span>
                            <span className="flex items-center gap-1 font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                              {t("select")}
                              <ArrowRight className="h-3.5 w-3.5" />
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
