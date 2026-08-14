import type { StopSaleReason } from "@/types/stop-sale-reason";
import type { StopSaleType } from "@/types/stop-sale-type";
import type {
  PropertyContractStopSale,
  PropertyContractStopSaleWrite,
} from "@/types/property-contract-stop-sale";
import { DEFAULT_STOP_SALE_REASONS } from "@/lib/constants/stop-sale-reasons";
import { DEFAULT_STOP_SALE_TYPES } from "@/lib/constants/stop-sale-types";
import {
  toAppPropertyContractStopSale,
  toAppStopSaleReason,
  toAppStopSaleType,
  type PropertyContractStopSaleRow,
  type StopSaleReasonRow,
  type StopSaleTypeRow,
} from "@/lib/mappers/property-contract-stop-sale.mapper";

export class StopSaleTypesApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "StopSaleTypesApiError";
  }
}

export class StopSaleReasonsApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "StopSaleReasonsApiError";
  }
}

export class PropertyContractStopSaleApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "PropertyContractStopSaleApiError";
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

export async function listStopSaleTypes(options?: {
  tenantId?: number;
  companyId?: number;
  activeOnly?: boolean;
}): Promise<StopSaleType[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/stop-sale-types${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new StopSaleTypesApiError(await parseError(res), res.status);
  return ((await res.json()) as StopSaleTypeRow[]).map(toAppStopSaleType);
}

export async function createStopSaleType(input: {
  tenantId: number;
  companyId: number;
  stopSaleTypeCode: string;
  stopSaleTypeName: string;
  displayOrder?: number;
  isActive?: boolean;
  createdBy: number;
}): Promise<StopSaleType> {
  const res = await fetch("/api/stop-sale-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new StopSaleTypesApiError(await parseError(res), res.status);
  return toAppStopSaleType(await res.json());
}

export async function ensureDefaultStopSaleTypes(options: {
  tenantId: number;
  companyId: number;
  createdBy: number;
}): Promise<StopSaleType[]> {
  const existing = await listStopSaleTypes({
    tenantId: options.tenantId,
    companyId: options.companyId,
    activeOnly: false,
  });
  const existingCodes = new Set(existing.map((t) => t.stopSaleTypeCode.toUpperCase()));

  for (const [i, row] of DEFAULT_STOP_SALE_TYPES.entries()) {
    if (existingCodes.has(row.code)) continue;
    try {
      await createStopSaleType({
        tenantId: options.tenantId,
        companyId: options.companyId,
        stopSaleTypeCode: row.code,
        stopSaleTypeName: row.name,
        displayOrder: i,
        createdBy: options.createdBy,
      });
    } catch (err) {
      if (!(err instanceof StopSaleTypesApiError && err.status === 409)) throw err;
    }
  }

  return listStopSaleTypes({
    tenantId: options.tenantId,
    companyId: options.companyId,
    activeOnly: true,
  });
}

export async function listStopSaleReasons(options?: {
  tenantId?: number;
  companyId?: number;
  activeOnly?: boolean;
}): Promise<StopSaleReason[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/stop-sale-reasons${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new StopSaleReasonsApiError(await parseError(res), res.status);
  return ((await res.json()) as StopSaleReasonRow[]).map(toAppStopSaleReason);
}

export async function createStopSaleReason(input: {
  tenantId: number;
  companyId: number;
  stopSaleReasonCode: string;
  stopSaleReasonName: string;
  displayOrder?: number;
  isActive?: boolean;
  createdBy: number;
}): Promise<StopSaleReason> {
  const res = await fetch("/api/stop-sale-reasons", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new StopSaleReasonsApiError(await parseError(res), res.status);
  return toAppStopSaleReason(await res.json());
}

export async function ensureDefaultStopSaleReasons(options: {
  tenantId: number;
  companyId: number;
  createdBy: number;
}): Promise<StopSaleReason[]> {
  const existing = await listStopSaleReasons({
    tenantId: options.tenantId,
    companyId: options.companyId,
    activeOnly: false,
  });
  const existingCodes = new Set(existing.map((r) => r.stopSaleReasonCode.toUpperCase()));

  for (const [i, row] of DEFAULT_STOP_SALE_REASONS.entries()) {
    if (existingCodes.has(row.code)) continue;
    try {
      await createStopSaleReason({
        tenantId: options.tenantId,
        companyId: options.companyId,
        stopSaleReasonCode: row.code,
        stopSaleReasonName: row.name,
        displayOrder: i,
        createdBy: options.createdBy,
      });
    } catch (err) {
      if (!(err instanceof StopSaleReasonsApiError && err.status === 409)) throw err;
    }
  }

  return listStopSaleReasons({
    tenantId: options.tenantId,
    companyId: options.companyId,
    activeOnly: true,
  });
}

export async function listPropertyContractStopSales(options?: {
  tenantId?: number;
  companyId?: number;
  propertyId?: number;
  propertyContractId?: number;
  activeOnly?: boolean;
}): Promise<PropertyContractStopSale[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.propertyId !== undefined) params.set("propertyId", String(options.propertyId));
  if (options?.propertyContractId !== undefined) {
    params.set("propertyContractId", String(options.propertyContractId));
  }
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/property-contract-stop-sales${qs ? `?${qs}` : ""}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new PropertyContractStopSaleApiError(await parseError(res), res.status);
  return ((await res.json()) as PropertyContractStopSaleRow[]).map(toAppPropertyContractStopSale);
}

export async function getPropertyContractStopSale(
  propertyContractStopSaleId: number
): Promise<PropertyContractStopSale> {
  const res = await fetch(`/api/property-contract-stop-sales/${propertyContractStopSaleId}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new PropertyContractStopSaleApiError(await parseError(res), res.status);
  return toAppPropertyContractStopSale(await res.json());
}

export async function createPropertyContractStopSale(
  input: PropertyContractStopSaleWrite & { createdBy: number }
): Promise<PropertyContractStopSale> {
  const res = await fetch("/api/property-contract-stop-sales", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertyContractStopSaleApiError(await parseError(res), res.status);
  return toAppPropertyContractStopSale(await res.json());
}

export async function updatePropertyContractStopSale(
  propertyContractStopSaleId: number,
  input: PropertyContractStopSaleWrite & { modifiedBy: number }
): Promise<PropertyContractStopSale> {
  const res = await fetch(`/api/property-contract-stop-sales/${propertyContractStopSaleId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertyContractStopSaleApiError(await parseError(res), res.status);
  return toAppPropertyContractStopSale(await res.json());
}

export async function setPropertyContractStopSaleActive(
  propertyContractStopSaleId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<PropertyContractStopSale> {
  const res = await fetch(`/api/property-contract-stop-sales/${propertyContractStopSaleId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new PropertyContractStopSaleApiError(await parseError(res), res.status);
  return toAppPropertyContractStopSale(await res.json());
}

export async function deletePropertyContractStopSale(
  propertyContractStopSaleId: number
): Promise<void> {
  const res = await fetch(`/api/property-contract-stop-sales/${propertyContractStopSaleId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new PropertyContractStopSaleApiError(await parseError(res), res.status);
}
