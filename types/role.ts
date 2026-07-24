import type { ModuleKey, PermissionAction } from "@/config/permissions";

/**
 * Which organization type a role belongs to. Drives three things at once:
 * booking-visibility scoping (lib/services/bookings.service.ts), which org-FK
 * a user of that role needs (types/user.ts), and which Partners screen the
 * role's org lives under. "internal" roles see the whole tenant.
 */
export type RoleCategory = "internal" | "agency" | "subAgency" | "corporate" | "supplier";

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
  category: RoleCategory;
  permissions: Partial<Record<ModuleKey, PermissionAction[]>>;
  createdAt: string;
}
