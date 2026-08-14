import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const propertyContractRateWriteSchema = z.object({
  tenantId: z.number().int().positive(),
  companyId: z.number().int().positive(),
  propertyContractId: z.number().int().positive("Contract is required"),
  propertyContractSeasonPeriodId: z.number().int().positive("Season period is required"),
  propertyContractRatePlanId: z.number().int().positive("Rate plan is required"),
  propertyRoomId: z.number().int().positive("Room type is required"),
  occupancyTypeId: z.number().int().positive("Occupancy type is required"),
  rateAmount: z.number().min(0, "Rate amount cannot be negative"),
  isActive: z.boolean().optional(),
});

export type PropertyContractRateWriteData = z.infer<typeof propertyContractRateWriteSchema>;

export const propertyContractRateInclude = {
  propertyContract: { select: { contractNumber: true, contractName: true, propertyId: true } },
  seasonPeriod: {
    select: {
      fromDate: true,
      toDate: true,
      propertySeason: { select: { seasonCode: true, seasonName: true } },
    },
  },
  ratePlan: {
    select: {
      ratePlanCode: true,
      ratePlanName: true,
      ratePlanTypeId: true,
      mealPlan: { select: { mealPlanCode: true, mealPlanName: true } },
      ratePlanType: { select: { ratePlanTypeCode: true, ratePlanTypeName: true } },
    },
  },
  propertyRoom: { select: { roomCode: true, roomName: true, propertyId: true } },
  occupancyType: { select: { occupancyTypeCode: true, occupancyTypeName: true } },
} as const;

type SerializableRow = {
  propertyContractRateId: bigint;
  propertyContractId: bigint;
  propertyContractSeasonPeriodId: bigint;
  propertyContractRatePlanId: bigint;
  propertyRoomId: bigint;
  occupancyTypeId: bigint;
  rateAmount: Prisma.Decimal;
  [key: string]: unknown;
};

export function serializePropertyContractRateRow<T extends SerializableRow>(row: T) {
  const {
    propertyContractRateId,
    propertyContractId,
    propertyContractSeasonPeriodId,
    propertyContractRatePlanId,
    propertyRoomId,
    occupancyTypeId,
    rateAmount,
    ratePlan,
    ...rest
  } = row as SerializableRow & {
    ratePlan?: {
      ratePlanCode: string;
      ratePlanName: string;
      ratePlanTypeId: bigint;
      mealPlan?: { mealPlanCode: string; mealPlanName: string } | null;
      ratePlanType?: { ratePlanTypeCode: string; ratePlanTypeName: string } | null;
    } | null;
  };

  return {
    ...rest,
    propertyContractRateId: Number(propertyContractRateId),
    propertyContractId: Number(propertyContractId),
    propertyContractSeasonPeriodId: Number(propertyContractSeasonPeriodId),
    propertyContractRatePlanId: Number(propertyContractRatePlanId),
    propertyRoomId: Number(propertyRoomId),
    occupancyTypeId: Number(occupancyTypeId),
    rateAmount: Number(rateAmount.toString()),
    ratePlan: ratePlan
      ? {
          ratePlanCode: ratePlan.ratePlanCode,
          ratePlanName: ratePlan.ratePlanName,
          ratePlanTypeId: Number(ratePlan.ratePlanTypeId),
          mealPlan: ratePlan.mealPlan
            ? {
                mealPlanCode: ratePlan.mealPlan.mealPlanCode,
                mealPlanName: ratePlan.mealPlan.mealPlanName,
              }
            : null,
          ratePlanType: ratePlan.ratePlanType
            ? {
                ratePlanTypeCode: ratePlan.ratePlanType.ratePlanTypeCode,
                ratePlanTypeName: ratePlan.ratePlanType.ratePlanTypeName,
              }
            : null,
        }
      : null,
  };
}

export async function validatePropertyContractRateLookups(
  data: PropertyContractRateWriteData
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

  const seasonPeriod = await prisma.propertyContractSeasonPeriod.findUnique({
    where: { propertyContractSeasonPeriodId: BigInt(data.propertyContractSeasonPeriodId) },
  });
  if (
    !seasonPeriod ||
    seasonPeriod.tenantId !== data.tenantId ||
    seasonPeriod.propertyContractId !== BigInt(data.propertyContractId)
  ) {
    return NextResponse.json({ error: "Season period not found for this contract" }, { status: 400 });
  }

  const ratePlan = await prisma.propertyContractRatePlan.findUnique({
    where: { propertyContractRatePlanId: BigInt(data.propertyContractRatePlanId) },
  });
  if (
    !ratePlan ||
    ratePlan.tenantId !== data.tenantId ||
    ratePlan.propertyContractId !== BigInt(data.propertyContractId)
  ) {
    return NextResponse.json({ error: "Rate plan not found for this contract" }, { status: 400 });
  }

  const propertyRoom = await prisma.propertyRoom.findUnique({
    where: { propertyRoomId: BigInt(data.propertyRoomId) },
  });
  if (
    !propertyRoom ||
    propertyRoom.tenantId !== data.tenantId ||
    propertyRoom.propertyId !== contract.propertyId
  ) {
    return NextResponse.json({ error: "Room type not found for this property" }, { status: 400 });
  }

  const occupancyType = await prisma.occupancyType.findUnique({
    where: { occupancyTypeId: BigInt(data.occupancyTypeId) },
  });
  if (
    !occupancyType ||
    occupancyType.tenantId !== data.tenantId ||
    occupancyType.companyId !== data.companyId ||
    !occupancyType.isActive
  ) {
    return NextResponse.json({ error: "Occupancy type not found for this tenant/company" }, { status: 400 });
  }

  return null;
}

function scalars(data: PropertyContractRateWriteData) {
  return {
    tenantId: data.tenantId,
    companyId: data.companyId,
    propertyContractId: BigInt(data.propertyContractId),
    propertyContractSeasonPeriodId: BigInt(data.propertyContractSeasonPeriodId),
    propertyContractRatePlanId: BigInt(data.propertyContractRatePlanId),
    propertyRoomId: BigInt(data.propertyRoomId),
    occupancyTypeId: BigInt(data.occupancyTypeId),
    rateAmount: data.rateAmount,
  };
}

export function toPropertyContractRateCreateData(
  data: PropertyContractRateWriteData & { createdBy: number }
): Prisma.PropertyContractRateUncheckedCreateInput {
  return { ...scalars(data), isActive: data.isActive ?? true, createdBy: data.createdBy };
}

export function toPropertyContractRateUpdateScalars(
  data: PropertyContractRateWriteData & { modifiedBy: number }
): Prisma.PropertyContractRateUncheckedUpdateInput {
  return { ...scalars(data), isActive: data.isActive, modifiedBy: data.modifiedBy, modifiedDtTm: new Date() };
}
