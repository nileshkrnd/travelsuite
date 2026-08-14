import type { SupplementType } from "@/types/supplement-type";
import type { PropertyContractSupplement, PropertyContractSupplementWrite } from "@/types/property-contract-supplement";
import { DEFAULT_SUPPLEMENT_TYPES } from "@/lib/constants/supplement-types";
import {
  toAppPropertyContractSupplement,
  toAppSupplementType,
  type PropertyContractSupplementRow,
  type SupplementTypeRow,
} from "@/lib/mappers/property-contract-supplement.mapper";

export class SupplementTypesApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "SupplementTypesApiError";
  }
}

export class PropertyContractSupplementApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "PropertyContractSupplementApiError";
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

export async function listSupplementTypes(options?: {
  tenantId?: number;
  companyId?: number;
  activeOnly?: boolean;
}): Promise<SupplementType[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/supplement-types${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new SupplementTypesApiError(await parseError(res), res.status);
  return ((await res.json()) as SupplementTypeRow[]).map(toAppSupplementType);
}

export async function createSupplementType(input: {
  tenantId: number;
  companyId: number;
  supplementTypeCode: string;
  supplementTypeName: string;
  displayOrder?: number;
  isActive?: boolean;
  createdBy: number;
}): Promise<SupplementType> {
  const res = await fetch("/api/supplement-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new SupplementTypesApiError(await parseError(res), res.status);
  return toAppSupplementType(await res.json());
}

/** Create any missing standard supplement types; returns the active list for the company. */
export async function ensureDefaultSupplementTypes(options: {
  tenantId: number;
  companyId: number;
  createdBy: number;
}): Promise<SupplementType[]> {
  const existing = await listSupplementTypes({
    tenantId: options.tenantId,
    companyId: options.companyId,
    activeOnly: false,
  });
  const existingCodes = new Set(existing.map((t) => t.supplementTypeCode.toUpperCase()));

  for (const [i, row] of DEFAULT_SUPPLEMENT_TYPES.entries()) {
    if (existingCodes.has(row.code)) continue;
    try {
      await createSupplementType({
        tenantId: options.tenantId,
        companyId: options.companyId,
        supplementTypeCode: row.code,
        supplementTypeName: row.name,
        displayOrder: i,
        createdBy: options.createdBy,
      });
    } catch (err) {
      if (!(err instanceof SupplementTypesApiError && err.status === 409)) throw err;
    }
  }

  return listSupplementTypes({
    tenantId: options.tenantId,
    companyId: options.companyId,
    activeOnly: true,
  });
}

export async function listPropertyContractSupplements(options?: {
  tenantId?: number;
  companyId?: number;
  propertyId?: number;
  propertyContractId?: number;
  activeOnly?: boolean;
}): Promise<PropertyContractSupplement[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.propertyId !== undefined) params.set("propertyId", String(options.propertyId));
  if (options?.propertyContractId !== undefined) {
    params.set("propertyContractId", String(options.propertyContractId));
  }
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/property-contract-supplements${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new PropertyContractSupplementApiError(await parseError(res), res.status);
  return ((await res.json()) as PropertyContractSupplementRow[]).map(toAppPropertyContractSupplement);
}

export async function getPropertyContractSupplement(
  propertyContractSupplementId: number
): Promise<PropertyContractSupplement> {
  const res = await fetch(`/api/property-contract-supplements/${propertyContractSupplementId}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new PropertyContractSupplementApiError(await parseError(res), res.status);
  return toAppPropertyContractSupplement(await res.json());
}

export async function createPropertyContractSupplement(
  input: PropertyContractSupplementWrite & { createdBy: number }
): Promise<PropertyContractSupplement> {
  const res = await fetch("/api/property-contract-supplements", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertyContractSupplementApiError(await parseError(res), res.status);
  return toAppPropertyContractSupplement(await res.json());
}

export async function updatePropertyContractSupplement(
  propertyContractSupplementId: number,
  input: PropertyContractSupplementWrite & { modifiedBy: number }
): Promise<PropertyContractSupplement> {
  const res = await fetch(`/api/property-contract-supplements/${propertyContractSupplementId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertyContractSupplementApiError(await parseError(res), res.status);
  return toAppPropertyContractSupplement(await res.json());
}

export async function setPropertyContractSupplementActive(
  propertyContractSupplementId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<PropertyContractSupplement> {
  const res = await fetch(`/api/property-contract-supplements/${propertyContractSupplementId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new PropertyContractSupplementApiError(await parseError(res), res.status);
  return toAppPropertyContractSupplement(await res.json());
}

export async function deletePropertyContractSupplement(propertyContractSupplementId: number): Promise<void> {
  const res = await fetch(`/api/property-contract-supplements/${propertyContractSupplementId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new PropertyContractSupplementApiError(await parseError(res), res.status);
}
