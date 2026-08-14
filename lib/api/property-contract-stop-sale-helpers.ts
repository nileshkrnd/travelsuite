import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  stopSaleTypeForbidsRatePlan,
  stopSaleTypeForbidsRoom,
  stopSaleTypeNeedsRatePlan,
  stopSaleTypeNeedsRoom,
} from "@/lib/constants/stop-sale-types";
import { parseDateOnly } from "@/lib/mappers/property-room-availability.mapper";

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

export const propertyContractStopSaleWriteSchema = z.object({
  tenantId: z.number().int().positive(),
  companyId: z.number().int().positive(),
  propertyContractId: z.number().int().positive("Contract is required"),
  stopSaleTypeId: z.number().int().positive("Stop sale type is required"),
  propertyRoomId: z.number().int().positive().nullable().optional(),
  propertyContractRatePlanId: z.number().int().positive().nullable().optional(),
  fromDate: dateOnly,
  toDate: dateOnly,
  stopSaleReasonId: z.number().int().positive().nullable().optional(),
  remarks: z.string().trim().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
  dayOfWeekIds: z.array(z.number().int().positive()).optional(),
});

export type PropertyContractStopSaleWriteData = z.infer<typeof propertyContractStopSaleWriteSchema>;

export const propertyContractStopSaleInclude = {
  propertyContract: { select: { contractNumber: true, contractName: true, propertyId: true } },
  stopSaleType: { select: { stopSaleTypeCode: true, stopSaleTypeName: true } },
  propertyRoom: { select: { roomCode: true, roomName: true, propertyId: true } },
  ratePlan: { select: { ratePlanCode: true, ratePlanName: true } },
  stopSaleReason: { select: { stopSaleReasonCode: true, stopSaleReasonName: true } },
  stopSaleDays: { select: { dayOfWeekId: true, isActive: true } },
} as const;

type StopSaleRow = {
  propertyContractStopSaleId: bigint;
  propertyContractId: bigint;
  stopSaleTypeId: bigint;
  propertyRoomId: bigint | null;
  propertyContractRatePlanId: bigint | null;
  fromDate: Date;
  toDate: Date;
  stopSaleReasonId: bigint | null;
  stopSaleDays?: { dayOfWeekId: bigint; isActive: boolean }[];
  stopSaleType?: { stopSaleTypeCode: string; stopSaleTypeName: string } | null;
  propertyRoom?: { roomCode: string; roomName: string } | null;
  ratePlan?: { ratePlanCode: string; ratePlanName: string } | null;
  stopSaleReason?: { stopSaleReasonCode: string; stopSaleReasonName: string } | null;
  propertyContract?: { contractNumber: string; contractName: string } | null;
  [key: string]: unknown;
};

function dateOnlyString(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function serializePropertyContractStopSaleRow(row: StopSaleRow) {
  const {
    propertyContractStopSaleId,
    propertyContractId,
    stopSaleTypeId,
    propertyRoomId,
    propertyContractRatePlanId,
    stopSaleReasonId,
    fromDate,
    toDate,
    stopSaleDays,
    ...rest
  } = row;

  return {
    ...rest,
    propertyContractStopSaleId: Number(propertyContractStopSaleId),
    propertyContractId: Number(propertyContractId),
    stopSaleTypeId: Number(stopSaleTypeId),
    propertyRoomId: propertyRoomId != null ? Number(propertyRoomId) : null,
    propertyContractRatePlanId:
      propertyContractRatePlanId != null ? Number(propertyContractRatePlanId) : null,
    stopSaleReasonId: stopSaleReasonId != null ? Number(stopSaleReasonId) : null,
    fromDate: dateOnlyString(fromDate),
    toDate: dateOnlyString(toDate),
    contractNumber: row.propertyContract?.contractNumber,
    contractName: row.propertyContract?.contractName,
    stopSaleTypeCode: row.stopSaleType?.stopSaleTypeCode,
    stopSaleTypeName: row.stopSaleType?.stopSaleTypeName,
    roomCode: row.propertyRoom?.roomCode,
    roomName: row.propertyRoom?.roomName,
    ratePlanCode: row.ratePlan?.ratePlanCode,
    ratePlanName: row.ratePlan?.ratePlanName,
    stopSaleReasonCode: row.stopSaleReason?.stopSaleReasonCode,
    stopSaleReasonName: row.stopSaleReason?.stopSaleReasonName,
    dayOfWeekIds: (stopSaleDays ?? [])
      .filter((d) => d.isActive)
      .map((d) => Number(d.dayOfWeekId)),
  };
}

export async function validatePropertyContractStopSaleLookups(
  data: PropertyContractStopSaleWriteData
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
    return NextResponse.json(
      { error: "From date must be on or before to date" },
      { status: 400 }
    );
  }

  const stopSaleType = await prisma.stopSaleType.findUnique({
    where: { stopSaleTypeId: BigInt(data.stopSaleTypeId) },
  });
  if (
    !stopSaleType ||
    stopSaleType.tenantId !== data.tenantId ||
    stopSaleType.companyId !== data.companyId ||
    !stopSaleType.isActive
  ) {
    return NextResponse.json({ error: "Stop sale type not found" }, { status: 400 });
  }

  const typeCode = stopSaleType.stopSaleTypeCode.toUpperCase();
  const roomId = data.propertyRoomId != null && data.propertyRoomId > 0 ? data.propertyRoomId : null;
  const ratePlanId =
    data.propertyContractRatePlanId != null && data.propertyContractRatePlanId > 0
      ? data.propertyContractRatePlanId
      : null;

  if (stopSaleTypeNeedsRoom(typeCode) && roomId == null) {
    return NextResponse.json({ error: "Room type is required for this stop sale type" }, { status: 400 });
  }
  if (stopSaleTypeForbidsRoom(typeCode) && roomId != null) {
    return NextResponse.json(
      { error: "Room type must not be set for this stop sale type" },
      { status: 400 }
    );
  }
  if (stopSaleTypeNeedsRatePlan(typeCode) && ratePlanId == null) {
    return NextResponse.json({ error: "Rate plan is required for this stop sale type" }, { status: 400 });
  }
  if (stopSaleTypeForbidsRatePlan(typeCode) && ratePlanId != null) {
    return NextResponse.json(
      { error: "Rate plan must not be set for this stop sale type" },
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

  if (data.stopSaleReasonId != null && data.stopSaleReasonId > 0) {
    const reason = await prisma.stopSaleReason.findUnique({
      where: { stopSaleReasonId: BigInt(data.stopSaleReasonId) },
    });
    if (
      !reason ||
      reason.tenantId !== data.tenantId ||
      reason.companyId !== data.companyId ||
      !reason.isActive
    ) {
      return NextResponse.json({ error: "Stop sale reason not found" }, { status: 400 });
    }
  }

  return null;
}

function stopSaleScalars(data: PropertyContractStopSaleWriteData) {
  return {
    tenantId: data.tenantId,
    companyId: data.companyId,
    propertyContractId: BigInt(data.propertyContractId),
    stopSaleTypeId: BigInt(data.stopSaleTypeId),
    propertyRoomId:
      data.propertyRoomId != null && data.propertyRoomId > 0 ? BigInt(data.propertyRoomId) : null,
    propertyContractRatePlanId:
      data.propertyContractRatePlanId != null && data.propertyContractRatePlanId > 0
        ? BigInt(data.propertyContractRatePlanId)
        : null,
    fromDate: parseDateOnly(data.fromDate),
    toDate: parseDateOnly(data.toDate),
    stopSaleReasonId:
      data.stopSaleReasonId != null && data.stopSaleReasonId > 0
        ? BigInt(data.stopSaleReasonId)
        : null,
    remarks: data.remarks?.trim() ? data.remarks.trim() : null,
  };
}

async function replaceStopSaleDays(
  tx: Prisma.TransactionClient,
  stopSaleId: bigint,
  data: PropertyContractStopSaleWriteData,
  actorKey: number
) {
  await tx.propertyContractStopSaleDay.deleteMany({
    where: { propertyContractStopSaleId: stopSaleId },
  });

  if (data.dayOfWeekIds?.length) {
    await tx.propertyContractStopSaleDay.createMany({
      data: data.dayOfWeekIds.map((dayOfWeekId) => ({
        tenantId: data.tenantId,
        companyId: data.companyId,
        propertyContractStopSaleId: stopSaleId,
        dayOfWeekId: BigInt(dayOfWeekId),
        isActive: true,
        createdBy: actorKey,
      })),
    });
  }
}

export async function createPropertyContractStopSaleWithChildren(
  data: PropertyContractStopSaleWriteData & { createdBy: number }
) {
  return prisma.$transaction(async (tx) => {
    const created = await tx.propertyContractStopSale.create({
      data: {
        ...stopSaleScalars(data),
        isActive: data.isActive ?? true,
        createdBy: data.createdBy,
      },
    });
    await replaceStopSaleDays(tx, created.propertyContractStopSaleId, data, data.createdBy);
    return tx.propertyContractStopSale.findUniqueOrThrow({
      where: { propertyContractStopSaleId: created.propertyContractStopSaleId },
      include: propertyContractStopSaleInclude,
    });
  });
}

export async function updatePropertyContractStopSaleWithChildren(
  stopSaleId: bigint,
  data: PropertyContractStopSaleWriteData & { modifiedBy: number }
) {
  return prisma.$transaction(async (tx) => {
    await tx.propertyContractStopSale.update({
      where: { propertyContractStopSaleId: stopSaleId },
      data: {
        ...stopSaleScalars(data),
        isActive: data.isActive,
        modifiedBy: data.modifiedBy,
        modifiedDtTm: new Date(),
      },
    });
    await replaceStopSaleDays(tx, stopSaleId, data, data.modifiedBy);
    return tx.propertyContractStopSale.findUniqueOrThrow({
      where: { propertyContractStopSaleId: stopSaleId },
      include: propertyContractStopSaleInclude,
    });
  });
}
