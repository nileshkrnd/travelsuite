import type { User } from "@/types";

export class InvalidCredentialsError extends Error {
  constructor(message = "Invalid credentials") {
    super(message);
    this.name = "InvalidCredentialsError";
  }
}

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
  if (!res.ok) {
    let message = "Invalid credentials";
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      /* ignore */
    }
    throw new InvalidCredentialsError(message);
  }
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
