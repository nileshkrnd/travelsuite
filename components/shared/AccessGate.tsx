"use client";

import { ShieldAlert } from "lucide-react";
import { useSessionStore } from "@/lib/store/session.store";
import { useRolesStore } from "@/lib/store/roles.store";
import {
  can,
  GLOBAL_TENANT_SETTING_KEYS,
  type ModuleKey,
  type PermissionAction,
} from "@/config/permissions";
import { EmptyState } from "@/components/shared/EmptyState";
import { SUPER_ADMIN_ROLE_ID } from "@/mock/data/roles";
import type { RoleDef } from "@/types";

interface AccessGateProps {
  module: ModuleKey;
  action?: PermissionAction;
  /** Render prop form gives the resolved roleDef to the page for further use (e.g. building URLs). */
  children: (roleDef: RoleDef) => React.ReactNode;
}

/** Super Admin platform settings (tenant registration + global masters). */
const SUPER_ADMIN_ONLY_MODULES = new Set<ModuleKey>(GLOBAL_TENANT_SETTING_KEYS);

/**
 * Cross-cutting Product masters (span every supplier's products) — a supplier-portal session
 * only ever manages its own products via "Service Product" (list is scoped, detail page is
 * per-product), never these shared catalog-configuration screens. Tenant Admin keeps full access.
 */
const TENANT_ADMIN_ONLY_PRODUCT_MODULES = new Set<ModuleKey>([
  "serviceType",
  "serviceProductClassification",
  "serviceProductCategory",
  "serviceTypeConfiguration",
  "serviceProductClassificationConfiguration",
  "serviceProductConfiguration",
  "serviceProductOption",
  "serviceProductVariant",
  "serviceProductSupplier",
  "serviceProductAvailability",
  "serviceProductSchedule",
  "serviceProductRate",
  "serviceProductLocationType",
  "serviceProductLocation",
  "serviceProductSupplierLocation",
  "serviceProductMedia",
  "inclusionExclusionType",
  "serviceProductItemType",
  "serviceProductInclusionExclusion",
  "serviceProductItinerary",
  "serviceProductCancellationPolicy",
  "serviceProductInventory",
  "serviceProductMarketRule",
  "serviceProductTax",
  "serviceProductContentSection",
  "serviceProductAdditionalInfo",
  "serviceProductRequirement",
  "serviceProductBookingQuestion",
]);

/** Gates a full page behind a permission check, showing a consistent "Access restricted" state otherwise. */
export function AccessGate({ module, action = "view", children }: AccessGateProps) {
  const user = useSessionStore((s) => s.user);
  const roles = useRolesStore((s) => s.roles);
  const roleDef = user ? roles.find((r) => r.id === user.roleId) : undefined;
  const superAdminOnly = SUPER_ADMIN_ONLY_MODULES.has(module);
  const isSupplierSession = !!user?.supplierId;
  const allowed =
    !!roleDef &&
    can(roleDef, module, action) &&
    (!superAdminOnly || user?.roleId === SUPER_ADMIN_ROLE_ID) &&
    (!isSupplierSession || !TENANT_ADMIN_ONLY_PRODUCT_MODULES.has(module));

  if (!allowed) {
    return (
      <EmptyState
        icon={ShieldAlert}
        tone="muted"
        heading="Access restricted"
        description="You don't have access to this page."
      />
    );
  }

  return <>{children(roleDef!)}</>;
}
