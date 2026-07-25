"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, Check, ChevronsUpDown, Layers, Search } from "lucide-react";
import Link from "next/link";
import { useSessionStore } from "@/lib/store/session.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { useTenantsStore } from "@/lib/store/tenants.store";
import { filterTenants, groupTenants } from "@/lib/tenants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SUPER_ADMIN_ROLE_ID } from "@/mock/data/roles";

/**
 * Super Admin only — switch the active tenant workspace.
 * Tenant Admin and other roles never see tenant / company / branch controls here.
 */
export function OrgScopeSelectors() {
  const user = useSessionStore((s) => s.user);
  const tenant = useTenantStore((s) => s.tenant);
  const setTenant = useTenantStore((s) => s.setTenant);
  const tenants = useTenantsStore((s) => s.tenants);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const isSuperAdmin = user?.roleId === SUPER_ADMIN_ROLE_ID;

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const groups = useMemo(() => {
    const active = tenants.filter((t) => t.status === "active");
    return groupTenants(filterTenants(active, query));
  }, [tenants, query]);

  if (!user || !isSuperAdmin) return null;

  return (
    <div className="hidden items-center gap-1.5 xl:flex">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-[200px] justify-between gap-1.5 px-2 text-xs font-medium"
            />
          }
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{tenant.branding.name}</span>
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 p-0">
          <div className="border-b p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute inset-y-0 start-2.5 my-auto h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tenant or group…"
                className="h-8 ps-8 text-xs"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto p-1">
            {groups.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-muted-foreground">No tenants found</p>
            ) : (
              groups.map((group) => (
                <div key={group.groupName} className="mb-1">
                  <div className="flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                    <Building2 className="h-3 w-3" />
                    <span className="truncate">{group.groupName}</span>
                  </div>
                  {group.tenants.map((item) => {
                    const selected = item.id === tenant.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setTenant(item.id);
                          setOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted",
                          selected && "bg-primary/10 text-primary"
                        )}
                      >
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: item.branding.primaryColor }}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1 truncate font-medium">{item.branding.name}</span>
                        {selected && <Check className="h-3.5 w-3.5 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
          <div className="border-t p-1.5">
            <Link
              href="/select-tenant"
              onClick={() => setOpen(false)}
              className="flex w-full items-center justify-center rounded-md px-2 py-1.5 text-xs font-medium text-primary hover:bg-muted"
            >
              Browse all workspaces
            </Link>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
