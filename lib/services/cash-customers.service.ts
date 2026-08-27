import { toAppCashCustomer, type CashCustomerRow } from "@/lib/mappers/cash-customer.mapper";
import type { CashCustomer } from "@/types";

export class CashCustomersApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "CashCustomersApiError";
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

export async function listCashCustomers(options?: {
  tenantId?: number;
  companyId?: number;
  cashCustomerTypeId?: number;
  activeOnly?: boolean;
}): Promise<CashCustomer[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.cashCustomerTypeId !== undefined) params.set("cashCustomerTypeId", String(options.cashCustomerTypeId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/cash-customers${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new CashCustomersApiError(await parseError(res), res.status);
  return ((await res.json()) as CashCustomerRow[]).map(toAppCashCustomer);
}

export async function getCashCustomer(cashCustomerId: number): Promise<CashCustomer> {
  const res = await fetch(`/api/cash-customers/${cashCustomerId}`, { cache: "no-store" });
  if (!res.ok) throw new CashCustomersApiError(await parseError(res), res.status);
  return toAppCashCustomer(await res.json());
}

export interface CashCustomerWriteInput {
  cashCustomerCode: string;
  cashCustomerTypeId: number;
  customerName: string;
  firstName?: string | null;
  lastName?: string | null;
  mobileCountryCode?: string | null;
  mobileNumber?: string | null;
  email?: string | null;
  countryId?: number | null;
  nationalityId?: number | null;
  currencyId: number;
  statusId: number;
  tenantId: number;
  companyId: number;
  isActive?: boolean;
}

export async function createCashCustomer(input: CashCustomerWriteInput & { createdBy: number }): Promise<CashCustomer> {
  const res = await fetch("/api/cash-customers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new CashCustomersApiError(await parseError(res), res.status);
  return toAppCashCustomer(await res.json());
}

export async function updateCashCustomer(
  cashCustomerId: number,
  input: CashCustomerWriteInput & { modifiedBy: number }
): Promise<CashCustomer> {
  const res = await fetch(`/api/cash-customers/${cashCustomerId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new CashCustomersApiError(await parseError(res), res.status);
  return toAppCashCustomer(await res.json());
}

export async function setCashCustomerActive(
  cashCustomerId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<CashCustomer> {
  const res = await fetch(`/api/cash-customers/${cashCustomerId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new CashCustomersApiError(await parseError(res), res.status);
  return toAppCashCustomer(await res.json());
}

export async function deleteCashCustomer(cashCustomerId: number): Promise<void> {
  const res = await fetch(`/api/cash-customers/${cashCustomerId}`, { method: "DELETE" });
  if (!res.ok) throw new CashCustomersApiError(await parseError(res), res.status);
}
