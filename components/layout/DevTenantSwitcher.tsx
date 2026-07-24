"use client";

import { useMemo, useState } from "react";
import { Building2, Check, FlaskConical, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTenantStore } from "@/lib/store/tenant.store";
import { useTenantsStore } from "@/lib/store/tenants.store";
import { filterTenants, groupTenants } from "@/lib/tenants";
import { cn } from "@/lib/utils";

/**
 * Phase 1 only: lets reviewers preview every tenant's branding without a
 * real tenant-switching backend. DELETE once Phase 2 resolves the tenant
 * from the authenticated session/subdomain instead.
 */
export function DevTenantSwitcher() {
  const tenantId = useTenantStore((s) => s.tenantId);
  const setTenant = useTenantStore((s) => s.setTenant);
  const tenants = useTenantsStore((s) => s.tenants);
  const [query, setQuery] = useState("");

  const groups = useMemo(() => groupTenants(filterTenants(tenants, query)), [tenants, query]);

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (!open) setQuery("");
      }}
    >
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="hidden gap-1.5 border-dashed text-xs text-muted-foreground md:flex"
          />
        }
      >
        <FlaskConical className="h-3.5 w-3.5" />
        Preview tenant
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 p-0">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-3 py-2">Dev: preview branding</DropdownMenuLabel>
        </DropdownMenuGroup>
        <div className="border-y px-2 py-2">
          <div className="relative">
            <Search className="pointer-events-none absolute inset-y-0 start-2.5 my-auto h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tenant…"
              className="h-8 ps-8 text-xs"
            />
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto p-1">
          {groups.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">No match</p>
          ) : (
            groups.map((group) => (
              <div key={group.groupName} className="mb-1">
                <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                  <Building2 className="h-3 w-3" />
                  <span className="truncate">{group.groupName}</span>
                </div>
                {group.tenants.map((tenant) => (
                  <button
                    key={tenant.id}
                    type="button"
                    onClick={() => setTenant(tenant.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted",
                      tenant.id === tenantId && "bg-primary/10 text-primary"
                    )}
                  >
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: tenant.branding.primaryColor }}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate">{tenant.branding.name}</span>
                    {tenant.id === tenantId && <Check className="h-3.5 w-3.5 shrink-0" />}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
