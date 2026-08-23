import { toAppB2BCustomerCategory, type B2BCustomerCategoryRow } from "@/lib/mappers/b2b-customer-category.mapper";
import type { B2BCustomerCategory } from "@/types";

export class B2BCustomerCategoriesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "B2BCustomerCategoriesApiError";
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

export async function listB2BCustomerCategories(options?: {
  tenantId?: number;
  companyId?: number;
  b2bCustomerTypeId?: number;
  activeOnly?: boolean;
}): Promise<B2BCustomerCategory[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.b2bCustomerTypeId !== undefined) params.set("b2bCustomerTypeId", String(options.b2bCustomerTypeId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/b2b-customer-categories${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new B2BCustomerCategoriesApiError(await parseError(res), res.status);
  return ((await res.json()) as B2BCustomerCategoryRow[]).map(toAppB2BCustomerCategory);
}
