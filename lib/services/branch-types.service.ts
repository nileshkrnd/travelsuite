import { toAppBranchType, type BranchTypeRow } from "@/lib/mappers/branch-type.mapper";
import type { BranchType } from "@/types";

export class BranchTypesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "BranchTypesApiError";
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

export async function listBranchTypes(options?: {
  tenantId?: number;
  companyId?: number;
  activeOnly?: boolean;
}): Promise<BranchType[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/branch-types${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new BranchTypesApiError(await parseError(res), res.status);
  return ((await res.json()) as BranchTypeRow[]).map(toAppBranchType);
}

export async function createBranchType(input: {
  branchTypeName: string;
  tenantId: number;
  companyId: number;
  isActive?: boolean;
  createdBy: number;
}): Promise<BranchType> {
  const res = await fetch("/api/branch-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new BranchTypesApiError(await parseError(res), res.status);
  return toAppBranchType(await res.json());
}

export async function updateBranchType(
  branchTypeId: number,
  input: {
    branchTypeName: string;
    tenantId: number;
    companyId: number;
    isActive?: boolean;
    modifiedBy: number;
  }
): Promise<BranchType> {
  const res = await fetch(`/api/branch-types/${branchTypeId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new BranchTypesApiError(await parseError(res), res.status);
  return toAppBranchType(await res.json());
}

export async function setBranchTypeActive(
  branchTypeId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<BranchType> {
  const res = await fetch(`/api/branch-types/${branchTypeId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new BranchTypesApiError(await parseError(res), res.status);
  return toAppBranchType(await res.json());
}

export async function deleteBranchType(branchTypeId: number): Promise<void> {
  const res = await fetch(`/api/branch-types/${branchTypeId}`, { method: "DELETE" });
  if (!res.ok) throw new BranchTypesApiError(await parseError(res), res.status);
}
