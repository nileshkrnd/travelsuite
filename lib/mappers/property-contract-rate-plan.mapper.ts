import type { PropertyContractRatePlan } from "@/types";

export interface PropertyContractRatePlanRow {
  propertyContractRatePlanId: bigint | number;
  tenantId: number;
  companyId: number;
  propertyContractId: bigint | number;
  ratePlanCode: string;
  ratePlanName: string;
  ratePlanTypeId: bigint | number;
  mealPlanId: bigint | number;
  rateBasisId: bigint | number;
  isActive: boolean;
  displayOrder: number;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  propertyContract?: {
    contractNumber: string;
    contractName: string;
    propertyId: number;
    property?: { propertyName: string | null; propertyCode: string } | null;
  } | null;
  ratePlanType?: { ratePlanTypeCode: string; ratePlanTypeName: string } | null;
  mealPlan?: { mealPlanCode: string; mealPlanName: string } | null;
  rateBasis?: { rateBasisCode: string; rateBasisName: string } | null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

export function toAppPropertyContractRatePlan(
  row: PropertyContractRatePlanRow
): PropertyContractRatePlan {
  return {
    id: String(row.propertyContractRatePlanId),
    propertyContractRatePlanKey: Number(row.propertyContractRatePlanId),
    tenantKey: row.tenantId,
    companyKey: row.companyId,
    propertyContractId: Number(row.propertyContractId),
    contractNumber: row.propertyContract?.contractNumber,
    contractName: row.propertyContract?.contractName,
    propertyId: row.propertyContract?.propertyId,
    propertyName:
      row.propertyContract?.property?.propertyName ??
      row.propertyContract?.property?.propertyCode,
    ratePlanCode: row.ratePlanCode,
    ratePlanName: row.ratePlanName,
    ratePlanTypeId: Number(row.ratePlanTypeId),
    ratePlanTypeCode: row.ratePlanType?.ratePlanTypeCode,
    ratePlanTypeName: row.ratePlanType?.ratePlanTypeName,
    mealPlanId: Number(row.mealPlanId),
    mealPlanCode: row.mealPlan?.mealPlanCode,
    mealPlanName: row.mealPlan?.mealPlanName,
    rateBasisId: Number(row.rateBasisId),
    rateBasisCode: row.rateBasis?.rateBasisCode,
    rateBasisName: row.rateBasis?.rateBasisName,
    isActive: row.isActive,
    displayOrder: row.displayOrder,
    createdBy: row.createdBy,
    createdAt: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
  };
}
