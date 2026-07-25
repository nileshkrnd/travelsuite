import { toAppEmployee, type EmployeeRow } from "@/lib/mappers/employee.mapper";
import type { Employee } from "@/types";

export class EmployeesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "EmployeesApiError";
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

export interface EmployeeWriteInput {
  title: string;
  firstName: string;
  lastName: string;
  gender: string;
  countryDialCode: string;
  phoneNumber: string;
  faxNumber?: string | null;
  email: string;
  address: string;
  countryId: number;
  cityId: number;
  employeeNumber: string;
  designationId: number;
  joiningDate: string;
  accessRoleId: number;
  departmentId?: number | null;
  reportingEmployeeId?: number | null;
  companyId: number;
  branchId: number;
  employeeImage?: string | null;
  tenantId: number;
  isActive?: boolean;
  /** Required on create — sets login password for linked User. */
  password?: string;
  createdBy?: number;
  modifiedBy?: number;
}

export async function listEmployees(options?: {
  tenantId?: number;
  companyId?: number;
  activeOnly?: boolean;
}): Promise<Employee[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/employees${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new EmployeesApiError(await parseError(res), res.status);
  return ((await res.json()) as EmployeeRow[]).map(toAppEmployee);
}

export async function getEmployee(employeeId: number): Promise<Employee> {
  const res = await fetch(`/api/employees/${employeeId}`, { cache: "no-store" });
  if (!res.ok) throw new EmployeesApiError(await parseError(res), res.status);
  return toAppEmployee(await res.json());
}

export async function createEmployee(
  input: EmployeeWriteInput & { tenantId: number; createdBy: number; password: string }
): Promise<Employee> {
  const res = await fetch("/api/employees", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new EmployeesApiError(await parseError(res), res.status);
  return toAppEmployee(await res.json());
}

export async function updateEmployee(
  employeeId: number,
  input: EmployeeWriteInput & { modifiedBy: number }
): Promise<Employee> {
  const res = await fetch(`/api/employees/${employeeId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new EmployeesApiError(await parseError(res), res.status);
  return toAppEmployee(await res.json());
}

export async function setEmployeeActive(
  employeeId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<Employee> {
  const res = await fetch(`/api/employees/${employeeId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new EmployeesApiError(await parseError(res), res.status);
  return toAppEmployee(await res.json());
}

export async function deleteEmployee(employeeId: number): Promise<void> {
  const res = await fetch(`/api/employees/${employeeId}`, { method: "DELETE" });
  if (!res.ok) throw new EmployeesApiError(await parseError(res), res.status);
}
