import {
  toAppEmployeePropertyGrants,
  type EmployeePropertyAccessRow,
} from "@/lib/mappers/employee-property-access.mapper";
import type { EmployeePropertyGrant } from "@/types";

export class EmployeePropertyAccessApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "EmployeePropertyAccessApiError";
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

export interface EmployeePropertyGrantWriteInput {
  tenantId: number;
  companyId: number;
  isAllProperties: boolean;
  propertyIds: number[];
  canView?: boolean;
  canCreate?: boolean;
  canEdit?: boolean;
  canSubmit?: boolean;
  canApprove?: boolean;
  isActive?: boolean;
  validFrom?: string | null;
  validTo?: string | null;
}

/** All employees' grants for a tenant/company, aggregated one-per-employee. */
export async function listEmployeePropertyGrants(options?: {
  tenantId?: number;
  companyId?: number;
}): Promise<EmployeePropertyGrant[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  const qs = params.toString();
  const res = await fetch(`/api/employee-property-access${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new EmployeePropertyAccessApiError(await parseError(res), res.status);
  const rows = (await res.json()) as EmployeePropertyAccessRow[];
  return toAppEmployeePropertyGrants(rows);
}

export async function getEmployeePropertyGrant(employeeId: number): Promise<EmployeePropertyGrant> {
  const res = await fetch(`/api/employee-property-access/employee/${employeeId}`, { cache: "no-store" });
  if (!res.ok) throw new EmployeePropertyAccessApiError(await parseError(res), res.status);
  return res.json();
}

export async function saveEmployeePropertyGrant(
  employeeId: number,
  input: EmployeePropertyGrantWriteInput & { createdBy: number }
): Promise<EmployeePropertyGrant> {
  const res = await fetch(`/api/employee-property-access/employee/${employeeId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new EmployeePropertyAccessApiError(await parseError(res), res.status);
  return res.json();
}

export async function setEmployeePropertyGrantActive(
  employeeId: number,
  isActive: boolean
): Promise<EmployeePropertyGrant> {
  const res = await fetch(`/api/employee-property-access/employee/${employeeId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive }),
  });
  if (!res.ok) throw new EmployeePropertyAccessApiError(await parseError(res), res.status);
  return res.json();
}

export async function deleteEmployeePropertyGrant(employeeId: number): Promise<void> {
  const res = await fetch(`/api/employee-property-access/employee/${employeeId}`, { method: "DELETE" });
  if (!res.ok) throw new EmployeePropertyAccessApiError(await parseError(res), res.status);
}
