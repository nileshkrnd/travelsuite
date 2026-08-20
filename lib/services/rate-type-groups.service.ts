import { toAppRateTypeGroup, type RateTypeGroupRow } from "@/lib/mappers/rate-type-group.mapper";
import type { RateTypeGroup } from "@/types";

export class RateTypeGroupsApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "RateTypeGroupsApiError";
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

export async function listRateTypeGroups(options?: {
  tenantId?: number;
  companyId?: number;
  activeOnly?: boolean;
}): Promise<RateTypeGroup[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/rate-type-groups${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new RateTypeGroupsApiError(await parseError(res), res.status);
  return ((await res.json()) as RateTypeGroupRow[]).map(toAppRateTypeGroup);
}

export async function createRateTypeGroup(input: {
  rateTypeGroupCode: string;
  rateTypeGroupName: string;
  displayOrder?: number;
  tenantId: number;
  companyId: number;
  isActive?: boolean;
  createdBy: number;
}): Promise<RateTypeGroup> {
  const res = await fetch("/api/rate-type-groups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new RateTypeGroupsApiError(await parseError(res), res.status);
  return toAppRateTypeGroup(await res.json());
}

export async function updateRateTypeGroup(
  rateTypeGroupId: number,
  input: {
    rateTypeGroupCode: string;
    rateTypeGroupName: string;
    displayOrder?: number;
    tenantId: number;
    companyId: number;
    isActive?: boolean;
    modifiedBy: number;
  }
): Promise<RateTypeGroup> {
  const res = await fetch(`/api/rate-type-groups/${rateTypeGroupId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new RateTypeGroupsApiError(await parseError(res), res.status);
  return toAppRateTypeGroup(await res.json());
}

export async function setRateTypeGroupActive(
  rateTypeGroupId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<RateTypeGroup> {
  const res = await fetch(`/api/rate-type-groups/${rateTypeGroupId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new RateTypeGroupsApiError(await parseError(res), res.status);
  return toAppRateTypeGroup(await res.json());
}

export async function deleteRateTypeGroup(rateTypeGroupId: number): Promise<void> {
  const res = await fetch(`/api/rate-type-groups/${rateTypeGroupId}`, { method: "DELETE" });
  if (!res.ok) throw new RateTypeGroupsApiError(await parseError(res), res.status);
}
