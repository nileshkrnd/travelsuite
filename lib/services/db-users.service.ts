import type { User } from "@/types";
import { toAppUser, type UserRow } from "@/lib/mappers/user.mapper";

export class UsersApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "UsersApiError";
  }
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error ?? res.statusText;
  } catch {
    return res.statusText || "Request failed";
  }
}

function mapRow(row: UserRow & { tenantUid?: string; companyUid?: string }): User {
  const tenantUidByKey = new Map<number, string>();
  const companyUidByKey = new Map<number, string>();
  if (row.tenantId > 0 && row.tenantUid) tenantUidByKey.set(row.tenantId, row.tenantUid);
  if (row.companyId > 0 && row.companyUid) companyUidByKey.set(row.companyId, row.companyUid);
  return toAppUser(row, { tenantUidByKey, companyUidByKey });
}

export async function listUsers(options?: {
  tenantId?: number;
  companyId?: number;
  activeOnly?: boolean;
}): Promise<User[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/users${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new UsersApiError(await parseError(res), res.status);
  const data = (await res.json()) as Array<UserRow & { tenantUid?: string; companyUid?: string }>;
  return data.map(mapRow);
}

export interface UserWriteInput {
  username: string;
  password?: string;
  userDisplayName: string;
  tenantId: number;
  companyId: number;
  isActive?: boolean;
  createdBy?: number;
  modifiedBy?: number;
}

export async function createUser(input: UserWriteInput): Promise<User> {
  const res = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new UsersApiError(await parseError(res), res.status);
  return mapRow(await res.json());
}

export async function updateUser(userId: number, input: UserWriteInput): Promise<User> {
  const res = await fetch(`/api/users/${userId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new UsersApiError(await parseError(res), res.status);
  return mapRow(await res.json());
}

export async function setUserActive(
  userId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<User> {
  const res = await fetch(`/api/users/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new UsersApiError(await parseError(res), res.status);
  return mapRow(await res.json());
}
