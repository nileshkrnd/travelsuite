import type { BlackoutReason } from "@/types/blackout-reason";
import type { BlackoutType } from "@/types/blackout-type";
import type {
  PropertyContractBlackout,
  PropertyContractBlackoutWrite,
} from "@/types/property-contract-blackout";
import { DEFAULT_BLACKOUT_REASONS } from "@/lib/constants/blackout-reasons";
import { DEFAULT_BLACKOUT_TYPES } from "@/lib/constants/blackout-types";
import {
  toAppPropertyContractBlackout,
  toAppBlackoutReason,
  toAppBlackoutType,
  type PropertyContractBlackoutRow,
  type BlackoutReasonRow,
  type BlackoutTypeRow,
} from "@/lib/mappers/property-contract-blackout.mapper";

export class BlackoutTypesApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "BlackoutTypesApiError";
  }
}

export class BlackoutReasonsApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "BlackoutReasonsApiError";
  }
}

export class PropertyContractBlackoutApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "PropertyContractBlackoutApiError";
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

export async function listBlackoutTypes(options?: {
  tenantId?: number;
  companyId?: number;
  activeOnly?: boolean;
}): Promise<BlackoutType[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/blackout-types${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new BlackoutTypesApiError(await parseError(res), res.status);
  return ((await res.json()) as BlackoutTypeRow[]).map(toAppBlackoutType);
}

export async function createBlackoutType(input: {
  tenantId: number;
  companyId: number;
  blackoutTypeCode: string;
  blackoutTypeName: string;
  displayOrder?: number;
  isActive?: boolean;
  createdBy: number;
}): Promise<BlackoutType> {
  const res = await fetch("/api/blackout-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new BlackoutTypesApiError(await parseError(res), res.status);
  return toAppBlackoutType(await res.json());
}

export async function ensureDefaultBlackoutTypes(options: {
  tenantId: number;
  companyId: number;
  createdBy: number;
}): Promise<BlackoutType[]> {
  const existing = await listBlackoutTypes({
    tenantId: options.tenantId,
    companyId: options.companyId,
    activeOnly: false,
  });
  const existingCodes = new Set(existing.map((t) => t.blackoutTypeCode.toUpperCase()));

  for (const [i, row] of DEFAULT_BLACKOUT_TYPES.entries()) {
    if (existingCodes.has(row.code)) continue;
    try {
      await createBlackoutType({
        tenantId: options.tenantId,
        companyId: options.companyId,
        blackoutTypeCode: row.code,
        blackoutTypeName: row.name,
        displayOrder: i,
        createdBy: options.createdBy,
      });
    } catch (err) {
      if (!(err instanceof BlackoutTypesApiError && err.status === 409)) throw err;
    }
  }

  return listBlackoutTypes({
    tenantId: options.tenantId,
    companyId: options.companyId,
    activeOnly: true,
  });
}

export async function listBlackoutReasons(options?: {
  tenantId?: number;
  companyId?: number;
  activeOnly?: boolean;
}): Promise<BlackoutReason[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/blackout-reasons${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new BlackoutReasonsApiError(await parseError(res), res.status);
  return ((await res.json()) as BlackoutReasonRow[]).map(toAppBlackoutReason);
}

export async function createBlackoutReason(input: {
  tenantId: number;
  companyId: number;
  blackoutReasonCode: string;
  blackoutReasonName: string;
  description?: string | null;
  displayOrder?: number;
  isActive?: boolean;
  createdBy: number;
}): Promise<BlackoutReason> {
  const res = await fetch("/api/blackout-reasons", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new BlackoutReasonsApiError(await parseError(res), res.status);
  return toAppBlackoutReason(await res.json());
}

export async function ensureDefaultBlackoutReasons(options: {
  tenantId: number;
  companyId: number;
  createdBy: number;
}): Promise<BlackoutReason[]> {
  const existing = await listBlackoutReasons({
    tenantId: options.tenantId,
    companyId: options.companyId,
    activeOnly: false,
  });
  const existingCodes = new Set(existing.map((r) => r.blackoutReasonCode.toUpperCase()));

  for (const [i, row] of DEFAULT_BLACKOUT_REASONS.entries()) {
    if (existingCodes.has(row.code)) continue;
    try {
      await createBlackoutReason({
        tenantId: options.tenantId,
        companyId: options.companyId,
        blackoutReasonCode: row.code,
        blackoutReasonName: row.name,
        displayOrder: i,
        createdBy: options.createdBy,
      });
    } catch (err) {
      if (!(err instanceof BlackoutReasonsApiError && err.status === 409)) throw err;
    }
  }

  return listBlackoutReasons({
    tenantId: options.tenantId,
    companyId: options.companyId,
    activeOnly: true,
  });
}

export async function listPropertyContractBlackouts(options?: {
  tenantId?: number;
  companyId?: number;
  propertyId?: number;
  propertyContractId?: number;
  activeOnly?: boolean;
}): Promise<PropertyContractBlackout[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.propertyId !== undefined) params.set("propertyId", String(options.propertyId));
  if (options?.propertyContractId !== undefined) {
    params.set("propertyContractId", String(options.propertyContractId));
  }
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/property-contract-blackouts${qs ? `?${qs}` : ""}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new PropertyContractBlackoutApiError(await parseError(res), res.status);
  return ((await res.json()) as PropertyContractBlackoutRow[]).map(toAppPropertyContractBlackout);
}

export async function getPropertyContractBlackout(
  propertyContractBlackoutId: number
): Promise<PropertyContractBlackout> {
  const res = await fetch(`/api/property-contract-blackouts/${propertyContractBlackoutId}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new PropertyContractBlackoutApiError(await parseError(res), res.status);
  return toAppPropertyContractBlackout(await res.json());
}

export async function createPropertyContractBlackout(
  input: PropertyContractBlackoutWrite & { createdBy: number }
): Promise<PropertyContractBlackout> {
  const res = await fetch("/api/property-contract-blackouts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertyContractBlackoutApiError(await parseError(res), res.status);
  return toAppPropertyContractBlackout(await res.json());
}

export async function updatePropertyContractBlackout(
  propertyContractBlackoutId: number,
  input: PropertyContractBlackoutWrite & { modifiedBy: number }
): Promise<PropertyContractBlackout> {
  const res = await fetch(`/api/property-contract-blackouts/${propertyContractBlackoutId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertyContractBlackoutApiError(await parseError(res), res.status);
  return toAppPropertyContractBlackout(await res.json());
}

export async function setPropertyContractBlackoutActive(
  propertyContractBlackoutId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<PropertyContractBlackout> {
  const res = await fetch(`/api/property-contract-blackouts/${propertyContractBlackoutId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new PropertyContractBlackoutApiError(await parseError(res), res.status);
  return toAppPropertyContractBlackout(await res.json());
}

export async function deletePropertyContractBlackout(
  propertyContractBlackoutId: number
): Promise<void> {
  const res = await fetch(`/api/property-contract-blackouts/${propertyContractBlackoutId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new PropertyContractBlackoutApiError(await parseError(res), res.status);
}
