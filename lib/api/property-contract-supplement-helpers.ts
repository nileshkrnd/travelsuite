import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { parseDateOnly } from "@/lib/mappers/property-room-availability.mapper";

const periodSchema = z.object({
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  isMandatory: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

const ageSchema = z.object({
  fromAge: z.number().min(0),
  toAge: z.number().min(0),
  rateBasisId: z.number().int().positive(),
  amount: z.number().min(0),
  isFree: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

const ratePlanSchema = z.object({
  propertyContractRatePlanId: z.number().int().positive(),
  amount: z.number().min(0),
  isActive: z.boolean().optional(),
});

export const propertyContractSupplementWriteSchema = z.object({
  tenantId: z.number().int().positive(),
  companyId: z.number().int().positive(),
  propertyContractId: z.number().int().positive("Contract is required"),
  supplementTypeId: z.number().int().positive("Supplement type is required"),
  supplementCode: z.string().trim().min(1).max(50),
  supplementName: z.string().trim().min(1).max(150),
  propertyRoomId: z.number().int().positive().nullable().optional(),
  rateBasisId: z.number().int().positive("Rate basis is required"),
  amount: z.number().min(0),
  isMandatory: z.boolean().optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
  dayOfWeekIds: z.array(z.number().int().positive()).optional(),
  periods: z.array(periodSchema).optional(),
  ageBands: z.array(ageSchema).optional(),
  ratePlans: z.array(ratePlanSchema).optional(),
});

export type PropertyContractSupplementWriteData = z.infer<typeof propertyContractSupplementWriteSchema>;

export const propertyContractSupplementInclude = {
  propertyContract: { select: { contractNumber: true, contractName: true, propertyId: true } },
  supplementType: { select: { supplementTypeCode: true, supplementTypeName: true } },
  propertyRoom: { select: { roomCode: true, roomName: true, propertyId: true } },
  rateBasis: { select: { rateBasisCode: true, rateBasisName: true } },
  periods: { orderBy: [{ fromDate: "asc" as const }] },
  ageBands: {
    orderBy: [{ fromAge: "asc" as const }],
    include: { rateBasis: { select: { rateBasisCode: true, rateBasisName: true } } },
  },
  ratePlans: {
    orderBy: [{ propertyContractRatePlanId: "asc" as const }],
    include: {
      ratePlan: { select: { ratePlanCode: true, ratePlanName: true } },
    },
  },
  supplementDays: { select: { dayOfWeekId: true, isActive: true } },
} as const;

type SupplementRow = {
  propertyContractSupplementId: bigint;
  propertyContractId: bigint;
  supplementTypeId: bigint;
  propertyRoomId: bigint | null;
  rateBasisId: bigint;
  amount: Prisma.Decimal;
  periods?: {
    propertyContractSupplementPeriodId: bigint;
    fromDate: Date;
    toDate: Date;
    isMandatory: boolean;
    isActive: boolean;
  }[];
  ageBands?: {
    propertyContractSupplementAgeId: bigint;
    fromAge: Prisma.Decimal;
    toAge: Prisma.Decimal;
    rateBasisId: bigint;
    amount: Prisma.Decimal;
    isFree: boolean;
    isActive: boolean;
    rateBasis?: { rateBasisCode: string; rateBasisName: string } | null;
  }[];
  ratePlans?: {
    propertyContractSupplementRatePlanId: bigint;
    propertyContractRatePlanId: bigint;
    amount: Prisma.Decimal;
    isActive: boolean;
    ratePlan?: { ratePlanCode: string; ratePlanName: string } | null;
  }[];
  supplementDays?: { dayOfWeekId: bigint; isActive: boolean }[];
  supplementType?: { supplementTypeCode: string; supplementTypeName: string } | null;
  propertyRoom?: { roomCode: string; roomName: string } | null;
  rateBasis?: { rateBasisCode: string; rateBasisName: string } | null;
  propertyContract?: { contractNumber: string; contractName: string } | null;
  [key: string]: unknown;
};

function decimalNumber(value: Prisma.Decimal | number | string) {
  return Number(value.toString());
}

export function serializePropertyContractSupplementRow(row: SupplementRow) {
  const {
    propertyContractSupplementId,
    propertyContractId,
    supplementTypeId,
    propertyRoomId,
    rateBasisId,
    amount,
    periods,
    ageBands,
    ratePlans,
    supplementDays,
    ...rest
  } = row;

  return {
    ...rest,
    propertyContractSupplementId: Number(propertyContractSupplementId),
    propertyContractId: Number(propertyContractId),
    supplementTypeId: Number(supplementTypeId),
    propertyRoomId: propertyRoomId != null ? Number(propertyRoomId) : null,
    rateBasisId: Number(rateBasisId),
    amount: decimalNumber(amount),
    supplementTypeCode: row.supplementType?.supplementTypeCode,
    supplementTypeName: row.supplementType?.supplementTypeName,
    roomCode: row.propertyRoom?.roomCode,
    roomName: row.propertyRoom?.roomName,
    rateBasisCode: row.rateBasis?.rateBasisCode,
    rateBasisName: row.rateBasis?.rateBasisName,
    contractNumber: row.propertyContract?.contractNumber,
    contractName: row.propertyContract?.contractName,
    dayOfWeekIds: (supplementDays ?? [])
      .filter((d) => d.isActive)
      .map((d) => Number(d.dayOfWeekId)),
    periods: (periods ?? []).map((p) => ({
      propertyContractSupplementPeriodId: Number(p.propertyContractSupplementPeriodId),
      fromDate: p.fromDate.toISOString().slice(0, 10),
      toDate: p.toDate.toISOString().slice(0, 10),
      isMandatory: p.isMandatory,
      isActive: p.isActive,
    })),
    ageBands: (ageBands ?? []).map((a) => ({
      propertyContractSupplementAgeId: Number(a.propertyContractSupplementAgeId),
      fromAge: decimalNumber(a.fromAge),
      toAge: decimalNumber(a.toAge),
      rateBasisId: Number(a.rateBasisId),
      rateBasisCode: a.rateBasis?.rateBasisCode,
      rateBasisName: a.rateBasis?.rateBasisName,
      amount: decimalNumber(a.amount),
      isFree: a.isFree,
      isActive: a.isActive,
    })),
    ratePlans: (ratePlans ?? []).map((rp) => ({
      propertyContractSupplementRatePlanId: Number(rp.propertyContractSupplementRatePlanId),
      propertyContractRatePlanId: Number(rp.propertyContractRatePlanId),
      ratePlanCode: rp.ratePlan?.ratePlanCode,
      ratePlanName: rp.ratePlan?.ratePlanName,
      amount: decimalNumber(rp.amount),
      isActive: rp.isActive,
    })),
  };
}

export async function validatePropertyContractSupplementLookups(
  data: PropertyContractSupplementWriteData
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

  const supplementType = await prisma.supplementType.findUnique({
    where: { supplementTypeId: BigInt(data.supplementTypeId) },
  });
  if (
    !supplementType ||
    supplementType.tenantId !== data.tenantId ||
    supplementType.companyId !== data.companyId ||
    !supplementType.isActive
  ) {
    return NextResponse.json({ error: "Supplement type not found" }, { status: 400 });
  }

  const rateBasis = await prisma.rateBasis.findUnique({
    where: { rateBasisId: BigInt(data.rateBasisId) },
  });
  if (
    !rateBasis ||
    rateBasis.tenantId !== data.tenantId ||
    rateBasis.companyId !== data.companyId ||
    !rateBasis.isActive
  ) {
    return NextResponse.json({ error: "Rate basis not found" }, { status: 400 });
  }

  if (data.propertyRoomId != null && data.propertyRoomId > 0) {
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
  }

  for (const band of data.ageBands ?? []) {
    const ageBasis = await prisma.rateBasis.findUnique({
      where: { rateBasisId: BigInt(band.rateBasisId) },
    });
    if (
      !ageBasis ||
      ageBasis.tenantId !== data.tenantId ||
      ageBasis.companyId !== data.companyId ||
      !ageBasis.isActive
    ) {
      return NextResponse.json({ error: "Age band rate basis not found" }, { status: 400 });
    }
  }

  for (const rp of data.ratePlans ?? []) {
    const ratePlan = await prisma.propertyContractRatePlan.findUnique({
      where: { propertyContractRatePlanId: BigInt(rp.propertyContractRatePlanId) },
    });
    if (
      !ratePlan ||
      ratePlan.tenantId !== data.tenantId ||
      ratePlan.propertyContractId !== BigInt(data.propertyContractId)
    ) {
      return NextResponse.json({ error: "Rate plan not found for this contract" }, { status: 400 });
    }
  }

  return null;
}

function supplementScalars(data: PropertyContractSupplementWriteData) {
  return {
    tenantId: data.tenantId,
    companyId: data.companyId,
    propertyContractId: BigInt(data.propertyContractId),
    supplementTypeId: BigInt(data.supplementTypeId),
    supplementCode: data.supplementCode.trim(),
    supplementName: data.supplementName.trim(),
    propertyRoomId:
      data.propertyRoomId != null && data.propertyRoomId > 0 ? BigInt(data.propertyRoomId) : null,
    rateBasisId: BigInt(data.rateBasisId),
    amount: data.amount,
    isMandatory: data.isMandatory ?? false,
    displayOrder: data.displayOrder ?? 0,
  };
}

async function replaceSupplementChildren(
  tx: Prisma.TransactionClient,
  supplementId: bigint,
  data: PropertyContractSupplementWriteData,
  actorKey: number
) {
  await tx.propertyContractSupplementPeriod.deleteMany({
    where: { propertyContractSupplementId: supplementId },
  });
  await tx.propertyContractSupplementAge.deleteMany({
    where: { propertyContractSupplementId: supplementId },
  });
  await tx.propertyContractSupplementRatePlan.deleteMany({
    where: { propertyContractSupplementId: supplementId },
  });
  await tx.propertyContractSupplementDay.deleteMany({
    where: { propertyContractSupplementId: supplementId },
  });

  if (data.periods?.length) {
    await tx.propertyContractSupplementPeriod.createMany({
      data: data.periods.map((p) => ({
        tenantId: data.tenantId,
        companyId: data.companyId,
        propertyContractSupplementId: supplementId,
        fromDate: parseDateOnly(p.fromDate),
        toDate: parseDateOnly(p.toDate),
        isMandatory: p.isMandatory ?? false,
        isActive: p.isActive ?? true,
        createdBy: actorKey,
      })),
    });
  }

  if (data.ageBands?.length) {
    await tx.propertyContractSupplementAge.createMany({
      data: data.ageBands.map((a) => ({
        tenantId: data.tenantId,
        companyId: data.companyId,
        propertyContractSupplementId: supplementId,
        fromAge: a.fromAge,
        toAge: a.toAge,
        rateBasisId: BigInt(a.rateBasisId),
        amount: a.amount,
        isFree: a.isFree ?? false,
        isActive: a.isActive ?? true,
        createdBy: actorKey,
      })),
    });
  }

  if (data.ratePlans?.length) {
    await tx.propertyContractSupplementRatePlan.createMany({
      data: data.ratePlans.map((rp) => ({
        tenantId: data.tenantId,
        companyId: data.companyId,
        propertyContractSupplementId: supplementId,
        propertyContractRatePlanId: BigInt(rp.propertyContractRatePlanId),
        amount: rp.amount,
        isActive: rp.isActive ?? true,
        createdBy: actorKey,
      })),
    });
  }

  if (data.dayOfWeekIds?.length) {
    await tx.propertyContractSupplementDay.createMany({
      data: data.dayOfWeekIds.map((dayOfWeekId) => ({
        tenantId: data.tenantId,
        companyId: data.companyId,
        propertyContractSupplementId: supplementId,
        dayOfWeekId: BigInt(dayOfWeekId),
        isActive: true,
        createdBy: actorKey,
      })),
    });
  }
}

export async function createPropertyContractSupplementWithChildren(
  data: PropertyContractSupplementWriteData & { createdBy: number }
) {
  return prisma.$transaction(async (tx) => {
    const created = await tx.propertyContractSupplement.create({
      data: {
        ...supplementScalars(data),
        isActive: data.isActive ?? true,
        createdBy: data.createdBy,
      },
    });
    await replaceSupplementChildren(tx, created.propertyContractSupplementId, data, data.createdBy);
    return tx.propertyContractSupplement.findUniqueOrThrow({
      where: { propertyContractSupplementId: created.propertyContractSupplementId },
      include: propertyContractSupplementInclude,
    });
  });
}

export async function updatePropertyContractSupplementWithChildren(
  supplementId: bigint,
  data: PropertyContractSupplementWriteData & { modifiedBy: number }
) {
  return prisma.$transaction(async (tx) => {
    await tx.propertyContractSupplement.update({
      where: { propertyContractSupplementId: supplementId },
      data: {
        ...supplementScalars(data),
        isActive: data.isActive,
        modifiedBy: data.modifiedBy,
        modifiedDtTm: new Date(),
      },
    });
    await replaceSupplementChildren(tx, supplementId, data, data.modifiedBy);
    return tx.propertyContractSupplement.findUniqueOrThrow({
      where: { propertyContractSupplementId: supplementId },
      include: propertyContractSupplementInclude,
    });
  });
}
