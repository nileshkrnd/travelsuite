import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  blackoutTypeForbidsRatePlan,
  blackoutTypeForbidsRoom,
  blackoutTypeNeedsRatePlan,
  blackoutTypeNeedsRoom,
} from "@/lib/constants/blackout-types";
import { parseDateOnly } from "@/lib/mappers/property-room-availability.mapper";

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

export const propertyContractBlackoutWriteSchema = z.object({
  tenantId: z.number().int().positive(),
  companyId: z.number().int().positive(),
  propertyContractId: z.number().int().positive("Contract is required"),
  blackoutTypeId: z.number().int().positive("Blackout type is required"),
  propertyRoomId: z.number().int().positive().nullable().optional(),
  propertyContractRatePlanId: z.number().int().positive().nullable().optional(),
  fromDate: dateOnly,
  toDate: dateOnly,
  blackoutReasonId: z.number().int().positive().nullable().optional(),
  remarks: z.string().trim().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
  dayOfWeekIds: z.array(z.number().int().positive()).optional(),
});

export type PropertyContractBlackoutWriteData = z.infer<typeof propertyContractBlackoutWriteSchema>;

export const propertyContractBlackoutInclude = {
  propertyContract: { select: { contractNumber: true, contractName: true, propertyId: true } },
  blackoutType: { select: { blackoutTypeCode: true, blackoutTypeName: true } },
  propertyRoom: { select: { roomCode: true, roomName: true, propertyId: true } },
  ratePlan: { select: { ratePlanCode: true, ratePlanName: true } },
  blackoutReason: { select: { blackoutReasonCode: true, blackoutReasonName: true } },
  blackoutDays: { select: { dayOfWeekId: true, isActive: true } },
} as const;

type BlackoutRow = {
  propertyContractBlackoutId: bigint;
  propertyContractId: bigint;
  blackoutTypeId: bigint;
  propertyRoomId: bigint | null;
  propertyContractRatePlanId: bigint | null;
  fromDate: Date;
  toDate: Date;
  blackoutReasonId: bigint | null;
  blackoutDays?: { dayOfWeekId: bigint; isActive: boolean }[];
  blackoutType?: { blackoutTypeCode: string; blackoutTypeName: string } | null;
  propertyRoom?: { roomCode: string; roomName: string } | null;
  ratePlan?: { ratePlanCode: string; ratePlanName: string } | null;
  blackoutReason?: { blackoutReasonCode: string; blackoutReasonName: string } | null;
  propertyContract?: { contractNumber: string; contractName: string } | null;
  [key: string]: unknown;
};

function dateOnlyString(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function serializePropertyContractBlackoutRow(row: BlackoutRow) {
  const {
    propertyContractBlackoutId,
    propertyContractId,
    blackoutTypeId,
    propertyRoomId,
    propertyContractRatePlanId,
    blackoutReasonId,
    fromDate,
    toDate,
    blackoutDays,
    ...rest
  } = row;

  return {
    ...rest,
    propertyContractBlackoutId: Number(propertyContractBlackoutId),
    propertyContractId: Number(propertyContractId),
    blackoutTypeId: Number(blackoutTypeId),
    propertyRoomId: propertyRoomId != null ? Number(propertyRoomId) : null,
    propertyContractRatePlanId:
      propertyContractRatePlanId != null ? Number(propertyContractRatePlanId) : null,
    blackoutReasonId: blackoutReasonId != null ? Number(blackoutReasonId) : null,
    fromDate: dateOnlyString(fromDate),
    toDate: dateOnlyString(toDate),
    contractNumber: row.propertyContract?.contractNumber,
    contractName: row.propertyContract?.contractName,
    blackoutTypeCode: row.blackoutType?.blackoutTypeCode,
    blackoutTypeName: row.blackoutType?.blackoutTypeName,
    roomCode: row.propertyRoom?.roomCode,
    roomName: row.propertyRoom?.roomName,
    ratePlanCode: row.ratePlan?.ratePlanCode,
    ratePlanName: row.ratePlan?.ratePlanName,
    blackoutReasonCode: row.blackoutReason?.blackoutReasonCode,
    blackoutReasonName: row.blackoutReason?.blackoutReasonName,
    dayOfWeekIds: (blackoutDays ?? [])
      .filter((d) => d.isActive)
      .map((d) => Number(d.dayOfWeekId)),
  };
}

export async function validatePropertyContractBlackoutLookups(
  data: PropertyContractBlackoutWriteData
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

  if (data.fromDate > data.toDate) {
    return NextResponse.json({ error: "From date must be on or before to date" }, { status: 400 });
  }

  const blackoutType = await prisma.blackoutType.findUnique({
    where: { blackoutTypeId: BigInt(data.blackoutTypeId) },
  });
  if (
    !blackoutType ||
    blackoutType.tenantId !== data.tenantId ||
    blackoutType.companyId !== data.companyId ||
    !blackoutType.isActive
  ) {
    return NextResponse.json({ error: "Blackout type not found" }, { status: 400 });
  }

  const typeCode = blackoutType.blackoutTypeCode.toUpperCase();
  const roomId = data.propertyRoomId != null && data.propertyRoomId > 0 ? data.propertyRoomId : null;
  const ratePlanId =
    data.propertyContractRatePlanId != null && data.propertyContractRatePlanId > 0
      ? data.propertyContractRatePlanId
      : null;

  if (blackoutTypeNeedsRoom(typeCode) && roomId == null) {
    return NextResponse.json({ error: "Room type is required for this blackout type" }, { status: 400 });
  }
  if (blackoutTypeForbidsRoom(typeCode) && roomId != null) {
    return NextResponse.json(
      { error: "Room type must not be set for this blackout type" },
      { status: 400 }
    );
  }
  if (blackoutTypeNeedsRatePlan(typeCode) && ratePlanId == null) {
    return NextResponse.json({ error: "Rate plan is required for this blackout type" }, { status: 400 });
  }
  if (blackoutTypeForbidsRatePlan(typeCode) && ratePlanId != null) {
    return NextResponse.json(
      { error: "Rate plan must not be set for this blackout type" },
      { status: 400 }
    );
  }

  if (roomId != null) {
    const propertyRoom = await prisma.propertyRoom.findUnique({
      where: { propertyRoomId: BigInt(roomId) },
    });
    if (
      !propertyRoom ||
      propertyRoom.tenantId !== data.tenantId ||
      propertyRoom.propertyId !== contract.propertyId
    ) {
      return NextResponse.json({ error: "Room type not found for this property" }, { status: 400 });
    }
  }

  if (ratePlanId != null) {
    const ratePlan = await prisma.propertyContractRatePlan.findUnique({
      where: { propertyContractRatePlanId: BigInt(ratePlanId) },
    });
    if (
      !ratePlan ||
      ratePlan.tenantId !== data.tenantId ||
      ratePlan.propertyContractId !== BigInt(data.propertyContractId)
    ) {
      return NextResponse.json({ error: "Rate plan not found for this contract" }, { status: 400 });
    }
  }

  if (data.blackoutReasonId != null && data.blackoutReasonId > 0) {
    const reason = await prisma.blackoutReason.findUnique({
      where: { blackoutReasonId: BigInt(data.blackoutReasonId) },
    });
    if (
      !reason ||
      reason.tenantId !== data.tenantId ||
      reason.companyId !== data.companyId ||
      !reason.isActive
    ) {
      return NextResponse.json({ error: "Blackout reason not found" }, { status: 400 });
    }
  }

  return null;
}

function blackoutScalars(data: PropertyContractBlackoutWriteData) {
  return {
    tenantId: data.tenantId,
    companyId: data.companyId,
    propertyContractId: BigInt(data.propertyContractId),
    blackoutTypeId: BigInt(data.blackoutTypeId),
    propertyRoomId:
      data.propertyRoomId != null && data.propertyRoomId > 0 ? BigInt(data.propertyRoomId) : null,
    propertyContractRatePlanId:
      data.propertyContractRatePlanId != null && data.propertyContractRatePlanId > 0
        ? BigInt(data.propertyContractRatePlanId)
        : null,
    fromDate: parseDateOnly(data.fromDate),
    toDate: parseDateOnly(data.toDate),
    blackoutReasonId:
      data.blackoutReasonId != null && data.blackoutReasonId > 0
        ? BigInt(data.blackoutReasonId)
        : null,
    remarks: data.remarks?.trim() ? data.remarks.trim() : null,
  };
}

async function replaceBlackoutDays(
  tx: Prisma.TransactionClient,
  blackoutId: bigint,
  data: PropertyContractBlackoutWriteData,
  actorKey: number
) {
  await tx.propertyContractBlackoutDay.deleteMany({
    where: { propertyContractBlackoutId: blackoutId },
  });

  if (data.dayOfWeekIds?.length) {
    await tx.propertyContractBlackoutDay.createMany({
      data: data.dayOfWeekIds.map((dayOfWeekId) => ({
        tenantId: data.tenantId,
        companyId: data.companyId,
        propertyContractBlackoutId: blackoutId,
        dayOfWeekId: BigInt(dayOfWeekId),
        isActive: true,
        createdBy: actorKey,
      })),
    });
  }
}

export async function createPropertyContractBlackoutWithChildren(
  data: PropertyContractBlackoutWriteData & { createdBy: number }
) {
  return prisma.$transaction(async (tx) => {
    const created = await tx.propertyContractBlackout.create({
      data: {
        ...blackoutScalars(data),
        isActive: data.isActive ?? true,
        createdBy: data.createdBy,
      },
    });
    await replaceBlackoutDays(tx, created.propertyContractBlackoutId, data, data.createdBy);
    return tx.propertyContractBlackout.findUniqueOrThrow({
      where: { propertyContractBlackoutId: created.propertyContractBlackoutId },
      include: propertyContractBlackoutInclude,
    });
  });
}

export async function updatePropertyContractBlackoutWithChildren(
  blackoutId: bigint,
  data: PropertyContractBlackoutWriteData & { modifiedBy: number }
) {
  return prisma.$transaction(async (tx) => {
    await tx.propertyContractBlackout.update({
      where: { propertyContractBlackoutId: blackoutId },
      data: {
        ...blackoutScalars(data),
        isActive: data.isActive,
        modifiedBy: data.modifiedBy,
        modifiedDtTm: new Date(),
      },
    });
    await replaceBlackoutDays(tx, blackoutId, data, data.modifiedBy);
    return tx.propertyContractBlackout.findUniqueOrThrow({
      where: { propertyContractBlackoutId: blackoutId },
      include: propertyContractBlackoutInclude,
    });
  });
}
