import { toAppCashCustomerType, type CashCustomerTypeRow } from "@/lib/mappers/cash-customer-type.mapper";
import type { CashCustomerType } from "@/types";

export class CashCustomerTypesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "CashCustomerTypesApiError";
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

export async function listCashCustomerTypes(options?: {
  tenantId?: number;
  companyId?: number;
  activeOnly?: boolean;
}): Promise<CashCustomerType[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/cash-customer-types${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new CashCustomerTypesApiError(await parseError(res), res.status);
  return ((await res.json()) as CashCustomerTypeRow[]).map(toAppCashCustomerType);
}
