"use client";

import { FlaskConical, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTenantStore } from "@/lib/store/tenant.store";
import { tenants } from "@/mock/data/tenants";

/**
 * Phase 1 only: lets reviewers preview every tenant's branding (logo
 * monogram + accent color propagated through --primary/--ring) without a
 * real tenant-switching backend. DELETE once Phase 2 resolves the tenant
 * from the authenticated session/subdomain instead.
 */
export function DevTenantSwitcher() {
  const tenantId = useTenantStore((s) => s.tenantId);
  const setTenant = useTenantStore((s) => s.setTenant);

  return (
    <DropdownMenu>
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
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Dev: preview branding</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {tenants.map((tenant) => (
          <DropdownMenuItem key={tenant.id} onClick={() => setTenant(tenant.id)}>
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: tenant.branding.primaryColor }}
              aria-hidden
            />
            <span className="truncate">{tenant.branding.name}</span>
            {tenant.id === tenantId && <Check className="ml-auto h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
