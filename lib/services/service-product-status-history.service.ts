import {
  toAppServiceProductStatusHistory,
  type ServiceProductStatusHistoryRow,
} from "@/lib/mappers/service-product-status-history.mapper";
import type { ServiceProductStatusHistory } from "@/types";

export class ServiceProductStatusHistoryApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ServiceProductStatusHistoryApiError";
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

export async function listServiceProductStatusHistory(serviceProductId: number): Promise<ServiceProductStatusHistory[]> {
  const res = await fetch(`/api/service-product-status-history?serviceProductId=${serviceProductId}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new ServiceProductStatusHistoryApiError(await parseError(res), res.status);
  return ((await res.json()) as ServiceProductStatusHistoryRow[]).map(toAppServiceProductStatusHistory);
}
