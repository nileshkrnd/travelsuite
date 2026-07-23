import { mockDelay } from "@/lib/utils";
import { useUsersStore } from "@/lib/store/users.store";
import type { User } from "@/types";

export async function getUserByEmail(email: string): Promise<User | undefined> {
  // TODO(Phase 2): replace with `await fetch(`/api/users/lookup?email=${email}`).then(r => r.json())`
  await mockDelay();
  return useUsersStore.getState().users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}
