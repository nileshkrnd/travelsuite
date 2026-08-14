import type { ContractType } from "@/types";
import { toAppContractType, type ContractTypeRow } from "@/lib/mappers/contract-type.mapper";

export class ContractTypesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ContractTypesApiError";
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

export async function listContractTypes(options?: { activeOnly?: boolean }): Promise<ContractType[]> {
  const params = new URLSearchParams();
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/contract-types${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new ContractTypesApiError(await parseError(res), res.status);
  return ((await res.json()) as ContractTypeRow[]).map(toAppContractType);
}
