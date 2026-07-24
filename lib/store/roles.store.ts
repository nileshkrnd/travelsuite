import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ModuleKey, PermissionAction } from "@/config/permissions";
import type { RoleCategory, RoleDef } from "@/types";
import { roles as seedRoles } from "@/mock/data/roles";
import { toCamelSlug, uniqueSlug } from "@/lib/slug";
import { useTenantStore } from "@/lib/store/tenant.store";

export interface NewRoleInput {
  name: string;
  description?: string;
  category: RoleCategory;
  permissions: Partial<Record<ModuleKey, PermissionAction[]>>;
}

export type RolePatch = Partial<Pick<RoleDef, "name" | "description" | "permissions" | "category">>;

interface RolesState {
  roles: RoleDef[];
  addRole: (input: NewRoleInput) => RoleDef;
  updateRole: (id: string, patch: RolePatch) => void;
  deleteRole: (id: string) => void;
}

export const useRolesStore = create<RolesState>()(
  persist(
    (set, get) => ({
      roles: seedRoles,

      addRole: (input) => {
        const slug = uniqueSlug(
          toCamelSlug(input.name),
          get().roles.map((r) => r.slug)
        );
        const role: RoleDef = {
          id: `role_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
          tenantId: useTenantStore.getState().tenantId,
          name: input.name,
          slug,
          description: input.description,
          isSystem: false,
          category: input.category,
          permissions: input.permissions,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ roles: [...state.roles, role] }));
        return role;
      },

      updateRole: (id, patch) => {
        set((state) => ({
          roles: state.roles.map((r) => {
            if (r.id !== id) return r;
            // System roles keep their name/slug locked — only permissions/description/category change.
            if (r.isSystem) {
              return {
                ...r,
                description: patch.description ?? r.description,
                permissions: patch.permissions ?? r.permissions,
                category: patch.category ?? r.category,
              };
            }
            const nextName = patch.name ?? r.name;
            const nextSlug =
              nextName !== r.name
                ? uniqueSlug(
                    toCamelSlug(nextName),
                    state.roles.filter((x) => x.id !== id).map((x) => x.slug)
                  )
                : r.slug;
            return { ...r, ...patch, name: nextName, slug: nextSlug };
          }),
        }));
      },

      deleteRole: (id) => {
        set((state) => ({
          roles: state.roles.filter((r) => !(r.id === id && !r.isSystem)),
        }));
      },
    }),
    { name: "travelsuite.roles" }
  )
);
