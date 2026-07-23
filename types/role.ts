import type { ModuleKey, PermissionAction } from "@/config/permissions";

/**
 * Closed set used only for booking-visibility scoping (lib/services/bookings.service.ts).
 * Every RoleDef — seeded or custom — carries one, independent of its free-text name.
 */
export type ScopeKind = "all" | "agent" | "subAgent" | "hotelier" | "supplier" | "dmc" | "corporate";

export interface RoleDef {
  id: string;
  tenantId: string;
  /** Free text, editable by Super Admin, e.g. "Regional Manager". */
  name: string;
  /** camelCase, URL-safe — derived from name at creation. See lib/slug.ts. */
  slug: string;
  description?: string;
  /** Seeded roles: name/slug locked, cannot be deleted. */
  isSystem: boolean;
  scopeKind: ScopeKind;
  permissions: Partial<Record<ModuleKey, PermissionAction[]>>;
  createdAt: string;
}
