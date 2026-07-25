import type { Branch } from "@/types";

export class BranchesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "BranchesApiError";
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

export async function listBranches(options?: {
  companyId?: number;
  tenantId?: number;
  activeOnly?: boolean;
}): Promise<Branch[]> {
  const params = new URLSearchParams();
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  else if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/branches${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new BranchesApiError(await parseError(res), res.status);
  // API already returns app-shaped Branch[]
  return (await res.json()) as Branch[];
}

export interface BranchWriteInput {
  branchUid?: string;
  branchTypeId: number;
  branchName: string;
  companyId: number;
  address1: string;
  address2?: string;
  countryId: number;
  cityId: number;
  zipCode: string;
  contactPerson: string;
  emailAddress: string;
  countryDialCode: string;
  phoneNumber: string;
  faxNumber?: string | null;
  isActive?: boolean;
  createdBy?: number;
  modifiedBy?: number;
}

export async function createBranch(input: BranchWriteInput & { createdBy: number }): Promise<Branch> {
  const res = await fetch("/api/branches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new BranchesApiError(await parseError(res), res.status);
  return (await res.json()) as Branch;
}

export async function updateBranch(
  branchId: number,
  input: BranchWriteInput & { modifiedBy: number }
): Promise<Branch> {
  const res = await fetch(`/api/branches/${branchId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new BranchesApiError(await parseError(res), res.status);
  return (await res.json()) as Branch;
}

export async function setBranchActive(
  branchId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<Branch> {
  const res = await fetch(`/api/branches/${branchId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new BranchesApiError(await parseError(res), res.status);
  return (await res.json()) as Branch;
}
