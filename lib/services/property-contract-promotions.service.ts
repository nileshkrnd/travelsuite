import type { PromotionBenefitType } from "@/types/promotion-benefit-type";
import type { PromotionType } from "@/types/promotion-type";
import type {
  PropertyContractPromotion,
  PropertyContractPromotionWrite,
} from "@/types/property-contract-promotion";
import { DEFAULT_PROMOTION_BENEFIT_TYPES } from "@/lib/constants/promotion-benefit-types";
import { DEFAULT_PROMOTION_TYPES } from "@/lib/constants/promotion-types";
import {
  toAppPromotionBenefitType,
  toAppPromotionType,
  toAppPropertyContractPromotion,
  type PromotionBenefitTypeRow,
  type PromotionTypeRow,
  type PropertyContractPromotionRow,
} from "@/lib/mappers/property-contract-promotion.mapper";

export class PromotionTypesApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "PromotionTypesApiError";
  }
}

export class PromotionBenefitTypesApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "PromotionBenefitTypesApiError";
  }
}

export class PropertyContractPromotionApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "PropertyContractPromotionApiError";
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

export async function listPromotionTypes(options?: {
  tenantId?: number;
  companyId?: number;
  activeOnly?: boolean;
}): Promise<PromotionType[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/promotion-types${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new PromotionTypesApiError(await parseError(res), res.status);
  return ((await res.json()) as PromotionTypeRow[]).map(toAppPromotionType);
}

export async function createPromotionType(input: {
  tenantId: number;
  companyId: number;
  promotionTypeCode: string;
  promotionTypeName: string;
  displayOrder?: number;
  isActive?: boolean;
  createdBy: number;
}): Promise<PromotionType> {
  const res = await fetch("/api/promotion-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PromotionTypesApiError(await parseError(res), res.status);
  return toAppPromotionType(await res.json());
}

export async function ensureDefaultPromotionTypes(options: {
  tenantId: number;
  companyId: number;
  createdBy: number;
}): Promise<PromotionType[]> {
  const existing = await listPromotionTypes({
    tenantId: options.tenantId,
    companyId: options.companyId,
    activeOnly: false,
  });
  const existingCodes = new Set(existing.map((t) => t.promotionTypeCode.toUpperCase()));

  for (const [i, row] of DEFAULT_PROMOTION_TYPES.entries()) {
    if (existingCodes.has(row.code)) continue;
    try {
      await createPromotionType({
        tenantId: options.tenantId,
        companyId: options.companyId,
        promotionTypeCode: row.code,
        promotionTypeName: row.name,
        displayOrder: i,
        createdBy: options.createdBy,
      });
    } catch (err) {
      if (!(err instanceof PromotionTypesApiError && err.status === 409)) throw err;
    }
  }

  return listPromotionTypes({
    tenantId: options.tenantId,
    companyId: options.companyId,
    activeOnly: true,
  });
}

export async function listPromotionBenefitTypes(options?: {
  tenantId?: number;
  companyId?: number;
  activeOnly?: boolean;
}): Promise<PromotionBenefitType[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/promotion-benefit-types${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new PromotionBenefitTypesApiError(await parseError(res), res.status);
  return ((await res.json()) as PromotionBenefitTypeRow[]).map(toAppPromotionBenefitType);
}

export async function createPromotionBenefitType(input: {
  tenantId: number;
  companyId: number;
  promotionBenefitTypeCode: string;
  promotionBenefitTypeName: string;
  displayOrder?: number;
  isActive?: boolean;
  createdBy: number;
}): Promise<PromotionBenefitType> {
  const res = await fetch("/api/promotion-benefit-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PromotionBenefitTypesApiError(await parseError(res), res.status);
  return toAppPromotionBenefitType(await res.json());
}

export async function ensureDefaultPromotionBenefitTypes(options: {
  tenantId: number;
  companyId: number;
  createdBy: number;
}): Promise<PromotionBenefitType[]> {
  const existing = await listPromotionBenefitTypes({
    tenantId: options.tenantId,
    companyId: options.companyId,
    activeOnly: false,
  });
  const existingCodes = new Set(
    existing.map((t) => t.promotionBenefitTypeCode.toUpperCase())
  );

  for (const [i, row] of DEFAULT_PROMOTION_BENEFIT_TYPES.entries()) {
    if (existingCodes.has(row.code)) continue;
    try {
      await createPromotionBenefitType({
        tenantId: options.tenantId,
        companyId: options.companyId,
        promotionBenefitTypeCode: row.code,
        promotionBenefitTypeName: row.name,
        displayOrder: i,
        createdBy: options.createdBy,
      });
    } catch (err) {
      if (!(err instanceof PromotionBenefitTypesApiError && err.status === 409)) throw err;
    }
  }

  return listPromotionBenefitTypes({
    tenantId: options.tenantId,
    companyId: options.companyId,
    activeOnly: true,
  });
}

export async function listPropertyContractPromotions(options?: {
  tenantId?: number;
  companyId?: number;
  propertyId?: number;
  propertyContractId?: number;
  activeOnly?: boolean;
}): Promise<PropertyContractPromotion[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.propertyId !== undefined) params.set("propertyId", String(options.propertyId));
  if (options?.propertyContractId !== undefined) {
    params.set("propertyContractId", String(options.propertyContractId));
  }
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/property-contract-promotions${qs ? `?${qs}` : ""}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new PropertyContractPromotionApiError(await parseError(res), res.status);
  return ((await res.json()) as PropertyContractPromotionRow[]).map(
    toAppPropertyContractPromotion
  );
}

export async function getPropertyContractPromotion(
  propertyContractPromotionId: number
): Promise<PropertyContractPromotion> {
  const res = await fetch(
    `/api/property-contract-promotions/${propertyContractPromotionId}`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new PropertyContractPromotionApiError(await parseError(res), res.status);
  return toAppPropertyContractPromotion(await res.json());
}

export async function createPropertyContractPromotion(
  input: PropertyContractPromotionWrite & { createdBy: number }
): Promise<PropertyContractPromotion> {
  const res = await fetch("/api/property-contract-promotions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertyContractPromotionApiError(await parseError(res), res.status);
  return toAppPropertyContractPromotion(await res.json());
}

export async function updatePropertyContractPromotion(
  propertyContractPromotionId: number,
  input: PropertyContractPromotionWrite & { modifiedBy: number }
): Promise<PropertyContractPromotion> {
  const res = await fetch(
    `/api/property-contract-promotions/${propertyContractPromotionId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  );
  if (!res.ok) throw new PropertyContractPromotionApiError(await parseError(res), res.status);
  return toAppPropertyContractPromotion(await res.json());
}

export async function setPropertyContractPromotionActive(
  propertyContractPromotionId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<PropertyContractPromotion> {
  const res = await fetch(
    `/api/property-contract-promotions/${propertyContractPromotionId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive, modifiedBy }),
    }
  );
  if (!res.ok) throw new PropertyContractPromotionApiError(await parseError(res), res.status);
  return toAppPropertyContractPromotion(await res.json());
}

export async function deletePropertyContractPromotion(
  propertyContractPromotionId: number
): Promise<void> {
  const res = await fetch(
    `/api/property-contract-promotions/${propertyContractPromotionId}`,
    { method: "DELETE" }
  );
  if (!res.ok) throw new PropertyContractPromotionApiError(await parseError(res), res.status);
}
