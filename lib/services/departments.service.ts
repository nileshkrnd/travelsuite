import { toAppDepartment, type DepartmentRow } from "@/lib/mappers/department.mapper";
import type { Department } from "@/types";

export class DepartmentsApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "DepartmentsApiError";
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

export async function listDepartments(options?: {
  tenantId?: number;
  companyId?: number;
  activeOnly?: boolean;
}): Promise<Department[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/departments${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new DepartmentsApiError(await parseError(res), res.status);
  return ((await res.json()) as DepartmentRow[]).map(toAppDepartment);
}

export async function createDepartment(input: {
  departmentCode: string;
  departmentName: string;
  tenantId: number;
  companyId: number;
  isActive?: boolean;
  createdBy: number;
}): Promise<Department> {
  const res = await fetch("/api/departments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new DepartmentsApiError(await parseError(res), res.status);
  return toAppDepartment(await res.json());
}

export async function updateDepartment(
  departmentId: number,
  input: {
    departmentCode: string;
    departmentName: string;
    tenantId: number;
    companyId: number;
    isActive?: boolean;
    modifiedBy: number;
  }
): Promise<Department> {
  const res = await fetch(`/api/departments/${departmentId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new DepartmentsApiError(await parseError(res), res.status);
  return toAppDepartment(await res.json());
}

export async function setDepartmentActive(
  departmentId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<Department> {
  const res = await fetch(`/api/departments/${departmentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new DepartmentsApiError(await parseError(res), res.status);
  return toAppDepartment(await res.json());
}

export async function deleteDepartment(departmentId: number): Promise<void> {
  const res = await fetch(`/api/departments/${departmentId}`, { method: "DELETE" });
  if (!res.ok) throw new DepartmentsApiError(await parseError(res), res.status);
}
