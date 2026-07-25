import type { User } from "@/types";

export class InvalidCredentialsError extends Error {}

async function loginRequest(body: {
  username: string;
  password: string;
  tenantCode?: string;
}): Promise<User> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new InvalidCredentialsError();
  return (await res.json()) as User;
}

/**
 * Tenant-scoped login — username + password, optionally constrained by tenant code.
 */
export async function authenticate(tenantCode: string, email: string, password: string): Promise<User> {
  return loginRequest({ username: email, password, tenantCode });
}

/**
 * Platform login (generic /login) — resolves by username alone (Super Admin or any user).
 */
export async function authenticateByEmail(email: string, password: string): Promise<User> {
  return loginRequest({ username: email, password });
}

export async function requestPasswordReset(_email: string): Promise<{ ok: true }> {
  return { ok: true };
}

export async function resetPassword(_token: string, _newPassword: string): Promise<{ ok: true }> {
  return { ok: true };
}
