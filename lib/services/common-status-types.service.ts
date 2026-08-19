import { toAppCommonStatusType, type CommonStatusTypeRow } from "@/lib/mappers/common-status-type.mapper";
import type { CommonStatusType } from "@/types";

export class CommonStatusTypesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "CommonStatusTypesApiError";
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

export async function listCommonStatusTypes(options?: {
  tenantId?: number;
  companyId?: number;
  activeOnly?: boolean;
}): Promise<CommonStatusType[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/common-status-types${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new CommonStatusTypesApiError(await parseError(res), res.status);
  return ((await res.json()) as CommonStatusTypeRow[]).map(toAppCommonStatusType);
}

export async function createCommonStatusType(input: {
  statusTypeCode: string;
  statusTypeName: string;
  description?: string;
  tenantId: number;
  companyId: number;
  isActive?: boolean;
  createdBy: number;
}): Promise<CommonStatusType> {
  const res = await fetch("/api/common-status-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new CommonStatusTypesApiError(await parseError(res), res.status);
  return toAppCommonStatusType(await res.json());
}

export async function updateCommonStatusType(
  commonStatusTypeId: number,
  input: {
    statusTypeCode: string;
    statusTypeName: string;
    description?: string;
    tenantId: number;
    companyId: number;
    isActive?: boolean;
    modifiedBy: number;
  }
): Promise<CommonStatusType> {
  const res = await fetch(`/api/common-status-types/${commonStatusTypeId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new CommonStatusTypesApiError(await parseError(res), res.status);
  return toAppCommonStatusType(await res.json());
}

export async function setCommonStatusTypeActive(
  commonStatusTypeId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<CommonStatusType> {
  const res = await fetch(`/api/common-status-types/${commonStatusTypeId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new CommonStatusTypesApiError(await parseError(res), res.status);
  return toAppCommonStatusType(await res.json());
}

export async function deleteCommonStatusType(commonStatusTypeId: number): Promise<void> {
  const res = await fetch(`/api/common-status-types/${commonStatusTypeId}`, { method: "DELETE" });
  if (!res.ok) throw new CommonStatusTypesApiError(await parseError(res), res.status);
}
