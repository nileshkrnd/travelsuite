import type { User } from "@/types";
import { listUsers } from "@/lib/services/db-users.service";

/** Lookup active user by username/email via User master API. */
export async function getUserByEmail(email: string): Promise<User | undefined> {
  try {
    const users = await listUsers({ activeOnly: true });
    const normalized = email.trim().toLowerCase();
    return users.find((u) => u.username.toLowerCase() === normalized || u.email.toLowerCase() === normalized);
  } catch {
    return undefined;
  }
}
