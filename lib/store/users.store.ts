import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, UserStatus } from "@/types";
import { users as seedUsers } from "@/mock/data/users";
import { useTenantStore } from "@/lib/store/tenant.store";

export interface NewEmployeeInput {
  name: string;
  email: string;
  roleId: string;
  companyId?: string;
  branchId?: string;
  department?: string;
}

export type EmployeePatch = Partial<
  Pick<User, "name" | "email" | "roleId" | "companyId" | "branchId" | "department" | "status">
>;

interface UsersState {
  users: User[];
  addUser: (input: NewEmployeeInput) => User;
  updateUser: (id: string, patch: EmployeePatch) => void;
  setUserStatus: (id: string, status: UserStatus) => void;
}

/**
 * Source of truth for all tenant users/employees — including the currently
 * logged-in one, whose session copy lives separately in session.store.ts.
 * auth.service.ts reads from here so employees registered at runtime can log
 * in immediately.
 */
export const useUsersStore = create<UsersState>()(
  persist(
    (set) => ({
      users: seedUsers,

      addUser: (input) => {
        const user: User = {
          id: `user_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
          tenantId: useTenantStore.getState().tenantId,
          name: input.name,
          email: input.email,
          roleId: input.roleId,
          companyId: input.companyId,
          branchId: input.branchId,
          department: input.department,
          status: "invited",
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ users: [...state.users, user] }));
        return user;
      },

      updateUser: (id, patch) => {
        set((state) => ({
          users: state.users.map((u) => (u.id === id ? { ...u, ...patch } : u)),
        }));
      },

      setUserStatus: (id, status) => {
        set((state) => ({
          users: state.users.map((u) => (u.id === id ? { ...u, status } : u)),
        }));
      },
    }),
    { name: "travelsuite.users" }
  )
);
