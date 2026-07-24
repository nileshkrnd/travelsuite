import { mockDelay } from "@/lib/utils";
import { MOCK_PASSWORD } from "@/mock/data/users";
import { findTenantBySlug } from "@/lib/store/tenant.store";
import type { User } from "@/types";
import { getUserByEmail } from "./users.service";

export class InvalidCredentialsError extends Error {}

/**
 * Phase 1 mock: resolves the tenant by its code (slug), looks up the user by
 * email within that tenant, and checks against a single shared mock password.
 * Role is derived from the matched account, never chosen by the caller.
 */
export async function authenticate(tenantCode: string, email: string, password: string): Promise<User> {
  // TODO(Phase 2): replace with `await fetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ tenantCode, email, password }) }).then(r => r.json())`
  await mockDelay();
  const tenant = findTenantBySlug(tenantCode);
  if (!tenant) throw new InvalidCredentialsError();
  const user = await getUserByEmail(email);
  if (!user || user.tenantId !== tenant.id || password !== MOCK_PASSWORD) {
    throw new InvalidCredentialsError();
  }
  return user;
}

export async function requestPasswordReset(_email: string): Promise<{ ok: true }> {
  // TODO(Phase 2): replace with `await fetch('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email: _email }) })`
  await mockDelay();
  return { ok: true };
}

export async function resetPassword(
  _token: string,
  _newPassword: string
): Promise<{ ok: true }> {
  // TODO(Phase 2): replace with `await fetch('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ token: _token, newPassword: _newPassword }) })`
  await mockDelay();
  return { ok: true };
}
