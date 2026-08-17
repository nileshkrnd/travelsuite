import type { PropertyContractTax, PropertyContractTaxWrite } from "@/types/property-contract-tax";
import {
  toAppPropertyContractTax,
  type PropertyContractTaxRow,
} from "@/lib/mappers/property-contract-tax.mapper";

export class PropertyContractTaxApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "PropertyContractTaxApiError";
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

export async function listPropertyContractTaxes(options?: {
  tenantId?: number;
  companyId?: number;
  propertyId?: number;
  propertyContractId?: number;
  activeOnly?: boolean;
}): Promise<PropertyContractTax[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.propertyId !== undefined) params.set("propertyId", String(options.propertyId));
  if (options?.propertyContractId !== undefined) {
    params.set("propertyContractId", String(options.propertyContractId));
  }
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/property-contract-taxes${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new PropertyContractTaxApiError(await parseError(res), res.status);
  return ((await res.json()) as PropertyContractTaxRow[]).map(toAppPropertyContractTax);
}

export async function getPropertyContractTax(propertyContractTaxId: number): Promise<PropertyContractTax> {
  const res = await fetch(`/api/property-contract-taxes/${propertyContractTaxId}`, { cache: "no-store" });
  if (!res.ok) throw new PropertyContractTaxApiError(await parseError(res), res.status);
  return toAppPropertyContractTax(await res.json());
}

export async function createPropertyContractTax(
  input: PropertyContractTaxWrite & { createdBy: number }
): Promise<PropertyContractTax> {
  const res = await fetch("/api/property-contract-taxes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertyContractTaxApiError(await parseError(res), res.status);
  return toAppPropertyContractTax(await res.json());
}

export async function updatePropertyContractTax(
  propertyContractTaxId: number,
  input: PropertyContractTaxWrite & { modifiedBy: number }
): Promise<PropertyContractTax> {
  const res = await fetch(`/api/property-contract-taxes/${propertyContractTaxId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertyContractTaxApiError(await parseError(res), res.status);
  return toAppPropertyContractTax(await res.json());
}

export async function setPropertyContractTaxActive(
  propertyContractTaxId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<PropertyContractTax> {
  const res = await fetch(`/api/property-contract-taxes/${propertyContractTaxId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new PropertyContractTaxApiError(await parseError(res), res.status);
  return toAppPropertyContractTax(await res.json());
}

export async function deletePropertyContractTax(propertyContractTaxId: number): Promise<void> {
  const res = await fetch(`/api/property-contract-taxes/${propertyContractTaxId}`, { method: "DELETE" });
  if (!res.ok) throw new PropertyContractTaxApiError(await parseError(res), res.status);
}
