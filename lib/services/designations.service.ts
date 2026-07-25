import { toAppDesignation, type DesignationRow } from "@/lib/mappers/designation.mapper";
import type { Designation } from "@/types";

export class DesignationsApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "DesignationsApiError";
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

export async function listDesignations(options?: {
  tenantId?: number;
  companyId?: number;
  activeOnly?: boolean;
}): Promise<Designation[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/designations${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new DesignationsApiError(await parseError(res), res.status);
  return ((await res.json()) as DesignationRow[]).map(toAppDesignation);
}

export async function createDesignation(input: {
  designationCode: string;
  designationName: string;
  tenantId: number;
  companyId: number;
  isActive?: boolean;
  createdBy: number;
}): Promise<Designation> {
  const res = await fetch("/api/designations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new DesignationsApiError(await parseError(res), res.status);
  return toAppDesignation(await res.json());
}

export async function updateDesignation(
  designationId: number,
  input: {
    designationCode: string;
    designationName: string;
    tenantId: number;
    companyId: number;
    isActive?: boolean;
    modifiedBy: number;
  }
): Promise<Designation> {
  const res = await fetch(`/api/designations/${designationId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new DesignationsApiError(await parseError(res), res.status);
  return toAppDesignation(await res.json());
}

export async function setDesignationActive(
  designationId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<Designation> {
  const res = await fetch(`/api/designations/${designationId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new DesignationsApiError(await parseError(res), res.status);
  return toAppDesignation(await res.json());
}

export async function deleteDesignation(designationId: number): Promise<void> {
  const res = await fetch(`/api/designations/${designationId}`, { method: "DELETE" });
  if (!res.ok) throw new DesignationsApiError(await parseError(res), res.status);
}
