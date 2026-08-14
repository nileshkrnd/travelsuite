import type { PropertyContractRate } from "@/types";

export interface PropertyContractRateRow {
  propertyContractRateId: bigint | number;
  tenantId: number;
  companyId: number;
  propertyContractId: bigint | number;
  propertyContractSeasonPeriodId: bigint | number;
  propertyContractRatePlanId: bigint | number;
  propertyRoomId: bigint | number;
  occupancyTypeId: bigint | number;
  rateAmount: { toString(): string } | number | string;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  propertyContract?: {
    contractNumber: string;
    contractName: string;
  } | null;
  seasonPeriod?: {
    fromDate: Date | string;
    toDate: Date | string;
    propertySeason?: { seasonCode: string; seasonName: string } | null;
  } | null;
  ratePlan?: {
    ratePlanCode: string;
    ratePlanName: string;
    ratePlanTypeId?: bigint | number;
    mealPlan?: { mealPlanCode: string; mealPlanName: string } | null;
    ratePlanType?: { ratePlanTypeCode: string; ratePlanTypeName: string } | null;
  } | null;
  propertyRoom?: { roomCode: string; roomName: string } | null;
  occupancyType?: { occupancyTypeCode: string; occupancyTypeName: string } | null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

function toDateOnly(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  const iso = typeof value === "string" ? value : value.toISOString();
  return iso.slice(0, 10);
}

function toNumber(value: { toString(): string } | number | string): number {
  if (typeof value === "number") return value;
  return Number(value.toString());
}

export function toAppPropertyContractRate(row: PropertyContractRateRow): PropertyContractRate {
  return {
    id: String(row.propertyContractRateId),
    propertyContractRateKey: Number(row.propertyContractRateId),
    tenantKey: row.tenantId,
    companyKey: row.companyId,
    propertyContractId: Number(row.propertyContractId),
    contractNumber: row.propertyContract?.contractNumber,
    contractName: row.propertyContract?.contractName,
    propertyContractSeasonPeriodId: Number(row.propertyContractSeasonPeriodId),
    seasonCode: row.seasonPeriod?.propertySeason?.seasonCode,
    seasonName: row.seasonPeriod?.propertySeason?.seasonName,
    fromDate: toDateOnly(row.seasonPeriod?.fromDate) ?? undefined,
    toDate: toDateOnly(row.seasonPeriod?.toDate) ?? undefined,
    propertyContractRatePlanId: Number(row.propertyContractRatePlanId),
    ratePlanCode: row.ratePlan?.ratePlanCode,
    ratePlanName: row.ratePlan?.ratePlanName,
    ratePlanTypeId: row.ratePlan?.ratePlanTypeId != null ? Number(row.ratePlan.ratePlanTypeId) : undefined,
    ratePlanTypeCode: row.ratePlan?.ratePlanType?.ratePlanTypeCode,
    ratePlanTypeName: row.ratePlan?.ratePlanType?.ratePlanTypeName,
    mealPlanCode: row.ratePlan?.mealPlan?.mealPlanCode,
    mealPlanName: row.ratePlan?.mealPlan?.mealPlanName,
    propertyRoomId: Number(row.propertyRoomId),
    roomCode: row.propertyRoom?.roomCode,
    roomName: row.propertyRoom?.roomName,
    occupancyTypeId: Number(row.occupancyTypeId),
    occupancyTypeCode: row.occupancyType?.occupancyTypeCode,
    occupancyTypeName: row.occupancyType?.occupancyTypeName,
    rateAmount: toNumber(row.rateAmount),
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdAt: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
  };
}
