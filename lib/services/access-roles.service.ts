import { toAppAccessRole, type AccessRoleRow } from "@/lib/mappers/access-role.mapper";
import type { AccessRole } from "@/types";

export class AccessRolesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "AccessRolesApiError";
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

export async function listAccessRoles(options?: {
  tenantId?: number;
  companyId?: number;
  activeOnly?: boolean;
}): Promise<AccessRole[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/access-roles${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new AccessRolesApiError(await parseError(res), res.status);
  const data = (await res.json()) as AccessRoleRow[];
  return data.map(toAppAccessRole);
}

export async function createAccessRole(input: {
  accessRoleName: string;
  tenantId: number;
  companyId: number;
  isActive?: boolean;
  createdBy: number;
}): Promise<AccessRole> {
  const res = await fetch("/api/access-roles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new AccessRolesApiError(await parseError(res), res.status);
  return toAppAccessRole(await res.json());
}

export async function updateAccessRole(
  accessRoleId: number,
  input: {
    accessRoleName: string;
    tenantId: number;
    companyId: number;
    isActive?: boolean;
    modifiedBy: number;
  }
): Promise<AccessRole> {
  const res = await fetch(`/api/access-roles/${accessRoleId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new AccessRolesApiError(await parseError(res), res.status);
  return toAppAccessRole(await res.json());
}

export async function setAccessRoleActive(
  accessRoleId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<AccessRole> {
  const res = await fetch(`/api/access-roles/${accessRoleId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new AccessRolesApiError(await parseError(res), res.status);
  return toAppAccessRole(await res.json());
}

export async function deleteAccessRole(accessRoleId: number): Promise<void> {
  const res = await fetch(`/api/access-roles/${accessRoleId}`, { method: "DELETE" });
  if (!res.ok) throw new AccessRolesApiError(await parseError(res), res.status);
}
