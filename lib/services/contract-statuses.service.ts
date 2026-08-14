import type { ContractStatus } from "@/types";
import { toAppContractStatus, type ContractStatusRow } from "@/lib/mappers/contract-status.mapper";

export class ContractStatusesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ContractStatusesApiError";
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

export async function listContractStatuses(options?: { activeOnly?: boolean }): Promise<ContractStatus[]> {
  const params = new URLSearchParams();
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/contract-statuses${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new ContractStatusesApiError(await parseError(res), res.status);
  return ((await res.json()) as ContractStatusRow[]).map(toAppContractStatus);
}
