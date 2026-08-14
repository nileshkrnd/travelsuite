import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const propertyContractRatePlanWriteSchema = z.object({
  tenantId: z.number().int().positive(),
  companyId: z.number().int().positive(),
  propertyContractId: z.number().int().positive("Contract is required"),
  ratePlanCode: z.string().trim().min(1, "Rate plan code is required").max(50),
  ratePlanName: z.string().trim().min(1, "Rate plan name is required").max(150),
  ratePlanTypeId: z.number().int().positive("Rate plan type is required"),
  mealPlanId: z.number().int().positive("Meal plan is required"),
  rateBasisId: z.number().int().positive("Rate basis is required"),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
});

export type PropertyContractRatePlanWriteData = z.infer<typeof propertyContractRatePlanWriteSchema>;

export const propertyContractRatePlanInclude = {
  propertyContract: {
    select: {
      contractNumber: true,
      contractName: true,
      propertyId: true,
      property: { select: { propertyName: true, propertyCode: true } },
    },
  },
  ratePlanType: { select: { ratePlanTypeCode: true, ratePlanTypeName: true } },
  mealPlan: { select: { mealPlanCode: true, mealPlanName: true } },
  rateBasis: { select: { rateBasisCode: true, rateBasisName: true } },
} as const;

type SerializableRow = {
  propertyContractRatePlanId: bigint;
  propertyContractId: bigint;
  ratePlanTypeId: bigint;
  mealPlanId: bigint;
  rateBasisId: bigint;
  [key: string]: unknown;
};

export function serializePropertyContractRatePlanRow<T extends SerializableRow>(row: T) {
  return {
    ...row,
    propertyContractRatePlanId: Number(row.propertyContractRatePlanId),
    propertyContractId: Number(row.propertyContractId),
    ratePlanTypeId: Number(row.ratePlanTypeId),
    mealPlanId: Number(row.mealPlanId),
    rateBasisId: Number(row.rateBasisId),
  };
}

async function validateScopedMaster(
  model: "ratePlanType" | "mealPlan" | "rateBasis",
  id: number,
  tenantId: number,
  companyId: number,
  label: string
): Promise<NextResponse | null> {
  const row =
    model === "ratePlanType"
      ? await prisma.ratePlanType.findUnique({ where: { ratePlanTypeId: BigInt(id) } })
      : model === "mealPlan"
        ? await prisma.mealPlan.findUnique({ where: { mealPlanId: BigInt(id) } })
        : await prisma.rateBasis.findUnique({ where: { rateBasisId: BigInt(id) } });

  if (!row || row.tenantId !== tenantId || row.companyId !== companyId || !row.isActive) {
    return NextResponse.json({ error: `${label} not found for this tenant/company` }, { status: 400 });
  }
  return null;
}

export async function validatePropertyContractRatePlanLookups(
  data: PropertyContractRatePlanWriteData
): Promise<NextResponse | null> {
  const contract = await prisma.propertyContract.findUnique({
    where: { propertyContractId: BigInt(data.propertyContractId) },
  });
  if (!contract || contract.tenantId !== data.tenantId) {
    return NextResponse.json({ error: "Contract not found for this tenant" }, { status: 400 });
  }
  if (contract.companyId !== data.companyId) {
    return NextResponse.json({ error: "Contract does not belong to this company" }, { status: 400 });
  }

  const typeError = await validateScopedMaster(
    "ratePlanType",
    data.ratePlanTypeId,
    data.tenantId,
    data.companyId,
    "Rate plan type"
  );
  if (typeError) return typeError;

  const mealError = await validateScopedMaster(
    "mealPlan",
    data.mealPlanId,
    data.tenantId,
    data.companyId,
    "Meal plan"
  );
  if (mealError) return mealError;

  const basisError = await validateScopedMaster(
    "rateBasis",
    data.rateBasisId,
    data.tenantId,
    data.companyId,
    "Rate basis"
  );
  if (basisError) return basisError;

  return null;
}

function scalars(data: PropertyContractRatePlanWriteData) {
  return {
    tenantId: data.tenantId,
    companyId: data.companyId,
    propertyContractId: BigInt(data.propertyContractId),
    ratePlanCode: data.ratePlanCode,
    ratePlanName: data.ratePlanName,
    ratePlanTypeId: BigInt(data.ratePlanTypeId),
    mealPlanId: BigInt(data.mealPlanId),
    rateBasisId: BigInt(data.rateBasisId),
    displayOrder: data.displayOrder ?? 0,
  };
}

export function toPropertyContractRatePlanCreateData(
  data: PropertyContractRatePlanWriteData & { createdBy: number }
): Prisma.PropertyContractRatePlanUncheckedCreateInput {
  return { ...scalars(data), isActive: data.isActive ?? true, createdBy: data.createdBy };
}

export function toPropertyContractRatePlanUpdateScalars(
  data: PropertyContractRatePlanWriteData & { modifiedBy: number }
): Prisma.PropertyContractRatePlanUncheckedUpdateInput {
  return { ...scalars(data), isActive: data.isActive, modifiedBy: data.modifiedBy, modifiedDtTm: new Date() };
}
