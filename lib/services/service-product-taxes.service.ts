import { toAppServiceProductTax, type ServiceProductTaxRow } from "@/lib/mappers/service-product-tax.mapper";
import type { ServiceProductTax } from "@/types";

export class ServiceProductTaxesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ServiceProductTaxesApiError";
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

export async function listServiceProductTaxes(options?: {
  serviceProductId?: number;
  activeOnly?: boolean;
}): Promise<ServiceProductTax[]> {
  const params = new URLSearchParams();
  if (options?.serviceProductId !== undefined) params.set("serviceProductId", String(options.serviceProductId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/service-product-taxes${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new ServiceProductTaxesApiError(await parseError(res), res.status);
  return ((await res.json()) as ServiceProductTaxRow[]).map(toAppServiceProductTax);
}

export interface ServiceProductTaxWriteInput {
  serviceProductId: number;
  serviceProductSupplierId?: number | null;
  serviceProductOptionId?: number | null;
  serviceProductVariantId?: number | null;
  taxId: number;
  taxName: string;
  taxCalculationTypeId: number;
  taxRate?: number | null;
  taxAmount?: number | null;
  taxApplicationBasisId: number;
  isInclusive?: boolean;
  isCompound?: boolean;
  sequenceNo?: number;
  fromDate: string;
  toDate?: string | null;
  isActive?: boolean;
  remarks?: string | null;
}

export async function createServiceProductTax(
  input: ServiceProductTaxWriteInput & { createdBy: number }
): Promise<ServiceProductTax> {
  const res = await fetch("/api/service-product-taxes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ServiceProductTaxesApiError(await parseError(res), res.status);
  return toAppServiceProductTax(await res.json());
}

export async function updateServiceProductTax(
  serviceProductTaxId: number,
  input: ServiceProductTaxWriteInput & { modifiedBy: number }
): Promise<ServiceProductTax> {
  const res = await fetch(`/api/service-product-taxes/${serviceProductTaxId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ServiceProductTaxesApiError(await parseError(res), res.status);
  return toAppServiceProductTax(await res.json());
}

export async function setServiceProductTaxActive(
  serviceProductTaxId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<ServiceProductTax> {
  const res = await fetch(`/api/service-product-taxes/${serviceProductTaxId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new ServiceProductTaxesApiError(await parseError(res), res.status);
  return toAppServiceProductTax(await res.json());
}

export async function deleteServiceProductTax(serviceProductTaxId: number): Promise<void> {
  const res = await fetch(`/api/service-product-taxes/${serviceProductTaxId}`, { method: "DELETE" });
  if (!res.ok) throw new ServiceProductTaxesApiError(await parseError(res), res.status);
}
