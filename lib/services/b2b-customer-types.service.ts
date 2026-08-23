import { toAppB2BCustomerType, type B2BCustomerTypeRow } from "@/lib/mappers/b2b-customer-type.mapper";
import type { B2BCustomerType } from "@/types";

export class B2BCustomerTypesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "B2BCustomerTypesApiError";
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

export async function listB2BCustomerTypes(options?: {
  tenantId?: number;
  companyId?: number;
  activeOnly?: boolean;
}): Promise<B2BCustomerType[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/b2b-customer-types${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new B2BCustomerTypesApiError(await parseError(res), res.status);
  return ((await res.json()) as B2BCustomerTypeRow[]).map(toAppB2BCustomerType);
}
