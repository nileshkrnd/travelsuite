import { mockDelay } from "@/lib/utils";
import { useUsersStore } from "@/lib/store/users.store";
import type { User } from "@/types";

export async function getEmployees(tenantId: string): Promise<User[]> {
  // TODO(Phase 2): replace with `await fetch(`/api/tenants/${tenantId}/employees`).then(r => r.json())`
  await mockDelay();
  return useUsersStore.getState().users.filter((u) => u.tenantId === tenantId);
}
