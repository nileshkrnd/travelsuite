import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, UserStatus } from "@/types";
import { users as seedUsers } from "@/mock/data/users";
import { useTenantStore } from "@/lib/store/tenant.store";
import { userScopeFromKeys } from "@/types";

export interface NewEmployeeInput {
  name: string;
  email: string;
  roleId: string;
  companyId?: string;
  branchId?: string;
  agencyId?: string;
  subAgencyId?: string;
  corporateId?: string;
  supplierId?: string;
  department?: string;
}

export type EmployeePatch = Partial<
  Pick<
    User,
    | "name"
    | "email"
    | "roleId"
    | "companyId"
    | "branchId"
    | "agencyId"
    | "subAgencyId"
    | "corporateId"
    | "supplierId"
    | "department"
    | "status"
    | "isActive"
  >
>;

interface UsersState {
  users: User[];
  setUsers: (users: User[]) => void;
  upsertUser: (user: User) => void;
  addUser: (input: NewEmployeeInput) => User;
  updateUser: (id: string, patch: EmployeePatch) => void;
  setUserStatus: (id: string, status: UserStatus) => void;
}

export const useUsersStore = create<UsersState>()(
  persist(
    (set, get) => ({
      users: seedUsers,

      setUsers: (users) => set({ users }),

      upsertUser: (user) =>
        set((state) => {
          const idx = state.users.findIndex((u) => u.id === user.id || u.userKey === user.userKey);
          if (idx === -1) return { users: [...state.users, user] };
          const next = [...state.users];
          next[idx] = user;
          return { users: next };
        }),

      addUser: (input) => {
        const tenant = useTenantStore.getState().tenant;
        const nextKey = Math.max(0, ...get().users.map((u) => u.userKey ?? 0)) + 1;
        const tenantKey = tenant.tenantKey ?? 0;
        const companyKey = 0;
        const user: User = {
          id: `user_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
          userKey: nextKey,
          username: input.email,
          name: input.name,
          email: input.email,
          tenantKey,
          companyKey,
          tenantId: useTenantStore.getState().tenantId,
          roleId: input.roleId,
          scope: userScopeFromKeys(tenantKey, companyKey),
          companyId: input.companyId,
          branchId: input.branchId,
          agencyId: input.agencyId,
          subAgencyId: input.subAgencyId,
          corporateId: input.corporateId,
          supplierId: input.supplierId,
          department: input.department,
          status: "invited",
          isActive: true,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ users: [...state.users, user] }));
        return user;
      },

      updateUser: (id, patch) => {
        set((state) => ({
          users: state.users.map((u) => {
            if (u.id !== id) return u;
            const next = { ...u, ...patch };
            if (patch.status === "deactivated") next.isActive = false;
            if (patch.status === "active") next.isActive = true;
            return next;
          }),
        }));
      },

      setUserStatus: (id, status) => {
        set((state) => ({
          users: state.users.map((u) =>
            u.id === id
              ? { ...u, status, isActive: status === "active" || status === "invited" }
              : u
          ),
        }));
      },
    }),
    {
      name: "travelsuite.users",
      version: 6,
      migrate: () => ({ users: seedUsers }),
    }
  )
);
