import type { ChildPolicyType } from "@/types/child-policy-type";
import type {
  PropertyContractChildPolicy,
  PropertyContractChildPolicyWrite,
} from "@/types/property-contract-child-policy";
import { DEFAULT_CHILD_POLICY_TYPES } from "@/lib/constants/child-policy-types";
import {
  toAppChildPolicyType,
  toAppPropertyContractChildPolicy,
  type ChildPolicyTypeRow,
  type PropertyContractChildPolicyRow,
} from "@/lib/mappers/property-contract-child-policy.mapper";

export class ChildPolicyTypesApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "ChildPolicyTypesApiError";
  }
}

export class PropertyContractChildPolicyApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "PropertyContractChildPolicyApiError";
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

export async function listChildPolicyTypes(options?: {
  tenantId?: number;
  companyId?: number;
  activeOnly?: boolean;
}): Promise<ChildPolicyType[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/child-policy-types${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new ChildPolicyTypesApiError(await parseError(res), res.status);
  return ((await res.json()) as ChildPolicyTypeRow[]).map(toAppChildPolicyType);
}

export async function createChildPolicyType(input: {
  tenantId: number;
  companyId: number;
  childPolicyTypeCode: string;
  childPolicyTypeName: string;
  displayOrder?: number;
  isActive?: boolean;
  createdBy: number;
}): Promise<ChildPolicyType> {
  const res = await fetch("/api/child-policy-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ChildPolicyTypesApiError(await parseError(res), res.status);
  return toAppChildPolicyType(await res.json());
}

/** Create any missing standard child policy types; returns the active list for the company. */
export async function ensureDefaultChildPolicyTypes(options: {
  tenantId: number;
  companyId: number;
  createdBy: number;
}): Promise<ChildPolicyType[]> {
  const existing = await listChildPolicyTypes({
    tenantId: options.tenantId,
    companyId: options.companyId,
    activeOnly: false,
  });
  const existingCodes = new Set(existing.map((t) => t.childPolicyTypeCode.toUpperCase()));

  for (const [i, row] of DEFAULT_CHILD_POLICY_TYPES.entries()) {
    if (existingCodes.has(row.code)) continue;
    try {
      await createChildPolicyType({
        tenantId: options.tenantId,
        companyId: options.companyId,
        childPolicyTypeCode: row.code,
        childPolicyTypeName: row.name,
        displayOrder: i,
        createdBy: options.createdBy,
      });
    } catch (err) {
      if (!(err instanceof ChildPolicyTypesApiError && err.status === 409)) throw err;
    }
  }

  return listChildPolicyTypes({
    tenantId: options.tenantId,
    companyId: options.companyId,
    activeOnly: true,
  });
}

export async function listPropertyContractChildPolicies(options?: {
  tenantId?: number;
  companyId?: number;
  propertyId?: number;
  propertyContractId?: number;
  activeOnly?: boolean;
}): Promise<PropertyContractChildPolicy[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.propertyId !== undefined) params.set("propertyId", String(options.propertyId));
  if (options?.propertyContractId !== undefined) {
    params.set("propertyContractId", String(options.propertyContractId));
  }
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/property-contract-child-policies${qs ? `?${qs}` : ""}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new PropertyContractChildPolicyApiError(await parseError(res), res.status);
  return ((await res.json()) as PropertyContractChildPolicyRow[]).map(
    toAppPropertyContractChildPolicy
  );
}

export async function getPropertyContractChildPolicy(
  propertyContractChildPolicyId: number
): Promise<PropertyContractChildPolicy> {
  const res = await fetch(`/api/property-contract-child-policies/${propertyContractChildPolicyId}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new PropertyContractChildPolicyApiError(await parseError(res), res.status);
  return toAppPropertyContractChildPolicy(await res.json());
}

export async function createPropertyContractChildPolicy(
  input: PropertyContractChildPolicyWrite & { createdBy: number }
): Promise<PropertyContractChildPolicy> {
  const res = await fetch("/api/property-contract-child-policies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertyContractChildPolicyApiError(await parseError(res), res.status);
  return toAppPropertyContractChildPolicy(await res.json());
}

export async function updatePropertyContractChildPolicy(
  propertyContractChildPolicyId: number,
  input: PropertyContractChildPolicyWrite & { modifiedBy: number }
): Promise<PropertyContractChildPolicy> {
  const res = await fetch(
    `/api/property-contract-child-policies/${propertyContractChildPolicyId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  );
  if (!res.ok) throw new PropertyContractChildPolicyApiError(await parseError(res), res.status);
  return toAppPropertyContractChildPolicy(await res.json());
}

export async function setPropertyContractChildPolicyActive(
  propertyContractChildPolicyId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<PropertyContractChildPolicy> {
  const res = await fetch(
    `/api/property-contract-child-policies/${propertyContractChildPolicyId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive, modifiedBy }),
    }
  );
  if (!res.ok) throw new PropertyContractChildPolicyApiError(await parseError(res), res.status);
  return toAppPropertyContractChildPolicy(await res.json());
}

export async function deletePropertyContractChildPolicy(
  propertyContractChildPolicyId: number
): Promise<void> {
  const res = await fetch(
    `/api/property-contract-child-policies/${propertyContractChildPolicyId}`,
    { method: "DELETE" }
  );
  if (!res.ok) throw new PropertyContractChildPolicyApiError(await parseError(res), res.status);
}
