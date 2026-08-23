import { toAppB2BCustomer, type B2BCustomerRow } from "@/lib/mappers/b2b-customer.mapper";
import type { B2BCustomer } from "@/types";

export class B2BCustomersApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "B2BCustomersApiError";
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

export async function listB2BCustomers(options?: {
  tenantId?: number;
  companyId?: number;
  b2bCustomerTypeId?: number;
  activeOnly?: boolean;
}): Promise<B2BCustomer[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.b2bCustomerTypeId !== undefined) params.set("b2bCustomerTypeId", String(options.b2bCustomerTypeId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/b2b-customers${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new B2BCustomersApiError(await parseError(res), res.status);
  return ((await res.json()) as B2BCustomerRow[]).map(toAppB2BCustomer);
}

export async function getB2BCustomer(b2bCustomerId: number): Promise<B2BCustomer> {
  const res = await fetch(`/api/b2b-customers/${b2bCustomerId}`, { cache: "no-store" });
  if (!res.ok) throw new B2BCustomersApiError(await parseError(res), res.status);
  return toAppB2BCustomer(await res.json());
}

export interface B2BCustomerWriteInput {
  b2bCustomerCode: string;
  b2bCustomerName: string;
  b2bCustomerTypeId: number;
  b2bCustomerCategoryId?: number | null;
  parentB2bCustomerId?: number | null;
  registrationNumber?: string | null;
  taxRegistrationNumber?: string | null;
  countryId: number;
  currencyId: number;
  paymentTermId?: number | null;
  creditLimit?: number | null;
  creditDays?: number | null;
  accountManagerId?: number | null;
  statusId: number;
  tenantId: number;
  companyId: number;
  isActive?: boolean;
}

export async function createB2BCustomer(input: B2BCustomerWriteInput & { createdBy: number }): Promise<B2BCustomer> {
  const res = await fetch("/api/b2b-customers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new B2BCustomersApiError(await parseError(res), res.status);
  return toAppB2BCustomer(await res.json());
}

export async function updateB2BCustomer(
  b2bCustomerId: number,
  input: B2BCustomerWriteInput & { modifiedBy: number }
): Promise<B2BCustomer> {
  const res = await fetch(`/api/b2b-customers/${b2bCustomerId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new B2BCustomersApiError(await parseError(res), res.status);
  return toAppB2BCustomer(await res.json());
}

export async function setB2BCustomerActive(
  b2bCustomerId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<B2BCustomer> {
  const res = await fetch(`/api/b2b-customers/${b2bCustomerId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new B2BCustomersApiError(await parseError(res), res.status);
  return toAppB2BCustomer(await res.json());
}

export async function deleteB2BCustomer(b2bCustomerId: number): Promise<void> {
  const res = await fetch(`/api/b2b-customers/${b2bCustomerId}`, { method: "DELETE" });
  if (!res.ok) throw new B2BCustomersApiError(await parseError(res), res.status);
}
