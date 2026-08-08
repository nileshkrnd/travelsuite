import { toAppSupplierUser, type SupplierUserRow } from "@/lib/mappers/supplier-user.mapper";
import type { SupplierUser } from "@/types";

export class SupplierUsersApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "SupplierUsersApiError";
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

export interface SupplierUserWriteInput {
  supplierId: number;
  firstName: string;
  lastName: string;
  email: string;
  dialCountryCode?: string | null;
  mobileNumber?: string | null;
  accessRoleId: number;
  isActive?: boolean;
  /** Required on create; optional on update (leave blank to keep current password). */
  password?: string;
}

export async function listSupplierUsers(options?: {
  supplierId?: number;
  activeOnly?: boolean;
}): Promise<SupplierUser[]> {
  const params = new URLSearchParams();
  if (options?.supplierId !== undefined) params.set("supplierId", String(options.supplierId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/supplier-users${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new SupplierUsersApiError(await parseError(res), res.status);
  return ((await res.json()) as SupplierUserRow[]).map(toAppSupplierUser);
}

export async function createSupplierUser(
  input: SupplierUserWriteInput & { createdBy: number; password: string }
): Promise<SupplierUser> {
  const res = await fetch("/api/supplier-users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new SupplierUsersApiError(await parseError(res), res.status);
  return toAppSupplierUser(await res.json());
}

export async function updateSupplierUser(
  supplierUserId: number,
  input: SupplierUserWriteInput & { updatedBy: number }
): Promise<SupplierUser> {
  const res = await fetch(`/api/supplier-users/${supplierUserId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new SupplierUsersApiError(await parseError(res), res.status);
  return toAppSupplierUser(await res.json());
}

export async function setSupplierUserActive(
  supplierUserId: number,
  isActive: boolean,
  updatedBy: number
): Promise<SupplierUser> {
  const res = await fetch(`/api/supplier-users/${supplierUserId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, updatedBy }),
  });
  if (!res.ok) throw new SupplierUsersApiError(await parseError(res), res.status);
  return toAppSupplierUser(await res.json());
}

export async function deleteSupplierUser(supplierUserId: number): Promise<void> {
  const res = await fetch(`/api/supplier-users/${supplierUserId}`, { method: "DELETE" });
  if (!res.ok) throw new SupplierUsersApiError(await parseError(res), res.status);
}
