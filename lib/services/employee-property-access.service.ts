import {
  toAppEmployeePropertyAccess,
  type EmployeePropertyAccessRow,
} from "@/lib/mappers/employee-property-access.mapper";
import type { EmployeePropertyAccess } from "@/types";

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

export interface EmployeePropertyAccessWriteInput {
  tenantId: number;
  companyId: number;
  employeeId: number;
  propertyId: number;
  canView?: boolean;
  canCreate?: boolean;
  canEdit?: boolean;
  canSubmit?: boolean;
  canApprove?: boolean;
  isActive?: boolean;
  validFrom?: string | null;
  validTo?: string | null;
}

export async function listEmployeePropertyAccess(options?: {
  tenantId?: number;
  companyId?: number;
  employeeId?: number;
  propertyId?: number;
  activeOnly?: boolean;
}): Promise<EmployeePropertyAccess[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.employeeId !== undefined) params.set("employeeId", String(options.employeeId));
  if (options?.propertyId !== undefined) params.set("propertyId", String(options.propertyId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/employee-property-access${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new EmployeePropertyAccessApiError(await parseError(res), res.status);
  return ((await res.json()) as EmployeePropertyAccessRow[]).map(toAppEmployeePropertyAccess);
}

export async function createEmployeePropertyAccess(
  input: EmployeePropertyAccessWriteInput & { createdBy: number }
): Promise<EmployeePropertyAccess> {
  const res = await fetch("/api/employee-property-access", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new EmployeePropertyAccessApiError(await parseError(res), res.status);
  return toAppEmployeePropertyAccess(await res.json());
}

export async function updateEmployeePropertyAccess(
  employeePropertyAccessId: number,
  input: EmployeePropertyAccessWriteInput
): Promise<EmployeePropertyAccess> {
  const res = await fetch(`/api/employee-property-access/${employeePropertyAccessId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new EmployeePropertyAccessApiError(await parseError(res), res.status);
  return toAppEmployeePropertyAccess(await res.json());
}

export async function setEmployeePropertyAccessActive(
  employeePropertyAccessId: number,
  isActive: boolean
): Promise<EmployeePropertyAccess> {
  const res = await fetch(`/api/employee-property-access/${employeePropertyAccessId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive }),
  });
  if (!res.ok) throw new EmployeePropertyAccessApiError(await parseError(res), res.status);
  return toAppEmployeePropertyAccess(await res.json());
}

export async function deleteEmployeePropertyAccess(employeePropertyAccessId: number): Promise<void> {
  const res = await fetch(`/api/employee-property-access/${employeePropertyAccessId}`, { method: "DELETE" });
  if (!res.ok) throw new EmployeePropertyAccessApiError(await parseError(res), res.status);
}
