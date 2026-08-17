import type { TaxType } from "@/types/tax-type";
import type { Tax, TaxWrite } from "@/types/tax";
import { DEFAULT_TAX_TYPES } from "@/lib/constants/tax-types";
import {
  toAppTaxType,
  toAppTax,
  type TaxTypeRow,
  type TaxRow,
} from "@/lib/mappers/tax.mapper";

export class TaxTypesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "TaxTypesApiError";
  }
}

export class TaxesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "TaxesApiError";
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

export async function listTaxTypes(options?: {
  tenantId?: number;
  companyId?: number;
  activeOnly?: boolean;
}): Promise<TaxType[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/tax-types${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new TaxTypesApiError(await parseError(res), res.status);
  return ((await res.json()) as TaxTypeRow[]).map(toAppTaxType);
}

export async function createTaxType(input: {
  tenantId: number;
  companyId: number;
  taxTypeCode: string;
  taxTypeName: string;
  description?: string;
  displayOrder?: number;
  isActive?: boolean;
  createdBy: number;
}): Promise<TaxType> {
  const res = await fetch("/api/tax-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new TaxTypesApiError(await parseError(res), res.status);
  return toAppTaxType(await res.json());
}

export async function ensureDefaultTaxTypes(options: {
  tenantId: number;
  companyId: number;
  createdBy: number;
}): Promise<TaxType[]> {
  const existing = await listTaxTypes({
    tenantId: options.tenantId,
    companyId: options.companyId,
    activeOnly: false,
  });
  const existingCodes = new Set(existing.map((t) => t.taxTypeCode.toUpperCase()));

  for (const [i, row] of DEFAULT_TAX_TYPES.entries()) {
    if (existingCodes.has(row.code)) continue;
    try {
      await createTaxType({
        tenantId: options.tenantId,
        companyId: options.companyId,
        taxTypeCode: row.code,
        taxTypeName: row.name,
        displayOrder: i,
        createdBy: options.createdBy,
      });
    } catch (err) {
      if (!(err instanceof TaxTypesApiError && err.status === 409)) throw err;
    }
  }

  return listTaxTypes({ tenantId: options.tenantId, companyId: options.companyId, activeOnly: true });
}

export async function listTaxes(options?: {
  tenantId?: number;
  companyId?: number;
  activeOnly?: boolean;
}): Promise<Tax[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/taxes${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new TaxesApiError(await parseError(res), res.status);
  return ((await res.json()) as TaxRow[]).map(toAppTax);
}

export async function getTax(taxId: number): Promise<Tax> {
  const res = await fetch(`/api/taxes/${taxId}`, { cache: "no-store" });
  if (!res.ok) throw new TaxesApiError(await parseError(res), res.status);
  return toAppTax(await res.json());
}

export async function createTax(input: TaxWrite & { createdBy: number }): Promise<Tax> {
  const res = await fetch("/api/taxes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new TaxesApiError(await parseError(res), res.status);
  return toAppTax(await res.json());
}

export async function updateTax(taxId: number, input: TaxWrite & { modifiedBy: number }): Promise<Tax> {
  const res = await fetch(`/api/taxes/${taxId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new TaxesApiError(await parseError(res), res.status);
  return toAppTax(await res.json());
}

export async function setTaxActive(taxId: number, isActive: boolean, modifiedBy: number): Promise<Tax> {
  const res = await fetch(`/api/taxes/${taxId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new TaxesApiError(await parseError(res), res.status);
  return toAppTax(await res.json());
}

export async function deleteTax(taxId: number): Promise<void> {
  const res = await fetch(`/api/taxes/${taxId}`, { method: "DELETE" });
  if (!res.ok) throw new TaxesApiError(await parseError(res), res.status);
}
