import { toAppCommonStatus, type CommonStatusRow } from "@/lib/mappers/common-status.mapper";
import type { CommonStatus } from "@/types";

export class CommonStatusesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "CommonStatusesApiError";
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

export async function listCommonStatuses(options?: {
  tenantId?: number;
  companyId?: number;
  commonStatusTypeId?: number;
  activeOnly?: boolean;
}): Promise<CommonStatus[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.commonStatusTypeId !== undefined) params.set("commonStatusTypeId", String(options.commonStatusTypeId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/common-statuses${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new CommonStatusesApiError(await parseError(res), res.status);
  return ((await res.json()) as CommonStatusRow[]).map(toAppCommonStatus);
}

export interface CommonStatusWriteInput {
  commonStatusTypeId: number;
  statusCode: string;
  statusName: string;
  description?: string;
  displayOrder?: number;
  isInitial?: boolean;
  isFinal?: boolean;
  tenantId: number;
  companyId: number;
  isActive?: boolean;
}

export async function createCommonStatus(input: CommonStatusWriteInput & { createdBy: number }): Promise<CommonStatus> {
  const res = await fetch("/api/common-statuses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new CommonStatusesApiError(await parseError(res), res.status);
  return toAppCommonStatus(await res.json());
}

export async function updateCommonStatus(
  commonStatusId: number,
  input: CommonStatusWriteInput & { modifiedBy: number }
): Promise<CommonStatus> {
  const res = await fetch(`/api/common-statuses/${commonStatusId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new CommonStatusesApiError(await parseError(res), res.status);
  return toAppCommonStatus(await res.json());
}

export async function setCommonStatusActive(
  commonStatusId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<CommonStatus> {
  const res = await fetch(`/api/common-statuses/${commonStatusId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new CommonStatusesApiError(await parseError(res), res.status);
  return toAppCommonStatus(await res.json());
}

export async function deleteCommonStatus(commonStatusId: number): Promise<void> {
  const res = await fetch(`/api/common-statuses/${commonStatusId}`, { method: "DELETE" });
  if (!res.ok) throw new CommonStatusesApiError(await parseError(res), res.status);
}
