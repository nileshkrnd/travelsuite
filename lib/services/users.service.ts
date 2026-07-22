import { mockDelay } from "@/lib/utils";
import { users } from "@/mock/data/users";
import type { User } from "@/types";

export async function getUsers(tenantId: string): Promise<User[]> {
  // TODO(Phase 2): replace with `await fetch(`/api/tenants/${tenantId}/users`).then(r => r.json())`
  await mockDelay();
  return users.filter((u) => u.tenantId === tenantId);
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  // TODO(Phase 2): replace with `await fetch(`/api/users/lookup?email=${email}`).then(r => r.json())`
  await mockDelay();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}
