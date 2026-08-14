import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const propertyContractInventoryWriteSchema = z.object({
  tenantId: z.number().int().positive(),
  companyId: z.number().int().positive(),
  propertyContractId: z.number().int().positive("Contract is required"),
  propertyContractSeasonPeriodId: z.number().int().positive("Season period is required"),
  propertyRoomId: z.number().int().positive("Room type is required"),
  inventoryTypeId: z.number().int().positive("Inventory type is required"),
  allotmentQty: z.number().int().min(0, "Allotment cannot be negative"),
  releaseDays: z.number().int().min(0, "Release days cannot be negative"),
  isStopSell: z.boolean().optional(),
  isClosed: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export type PropertyContractInventoryWriteData = z.infer<typeof propertyContractInventoryWriteSchema>;

export const propertyContractInventoryInclude = {
  propertyContract: { select: { contractNumber: true, contractName: true, propertyId: true } },
  seasonPeriod: {
    select: {
      fromDate: true,
      toDate: true,
      propertySeason: { select: { seasonCode: true, seasonName: true } },
    },
  },
  propertyRoom: { select: { roomCode: true, roomName: true, propertyId: true } },
  inventoryType: { select: { inventoryTypeCode: true, inventoryTypeName: true } },
} as const;

type SerializableRow = {
  propertyContractInventoryId: bigint;
  propertyContractId: bigint;
  propertyContractSeasonPeriodId: bigint;
  propertyRoomId: bigint;
  inventoryTypeId: bigint;
  [key: string]: unknown;
};

export function serializePropertyContractInventoryRow<T extends SerializableRow>(row: T) {
  const {
    propertyContractInventoryId,
    propertyContractId,
    propertyContractSeasonPeriodId,
    propertyRoomId,
    inventoryTypeId,
    ...rest
  } = row;

  return {
    ...rest,
    propertyContractInventoryId: Number(propertyContractInventoryId),
    propertyContractId: Number(propertyContractId),
    propertyContractSeasonPeriodId: Number(propertyContractSeasonPeriodId),
    propertyRoomId: Number(propertyRoomId),
    inventoryTypeId: Number(inventoryTypeId),
  };
}

export async function validatePropertyContractInventoryLookups(
  data: Omit<PropertyContractInventoryWriteData, "isStopSell" | "isClosed" | "isActive"> & {
    isStopSell?: boolean;
    isClosed?: boolean;
    isActive?: boolean;
  }
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

  const inventoryType = await prisma.inventoryType.findUnique({
    where: { inventoryTypeId: BigInt(data.inventoryTypeId) },
  });
  if (!inventoryType?.isActive) {
    return NextResponse.json({ error: "Inventory type not found" }, { status: 400 });
  }
  if (inventoryType.inventoryTypeCode === "ALLOTMENT" && data.allotmentQty <= 0) {
    return NextResponse.json(
      { error: "Allotment quantity is required for allotment inventory" },
      { status: 400 }
    );
  }

  return null;
}

function scalars(data: PropertyContractInventoryWriteData) {
  return {
    tenantId: data.tenantId,
    companyId: data.companyId,
    propertyContractId: BigInt(data.propertyContractId),
    propertyContractSeasonPeriodId: BigInt(data.propertyContractSeasonPeriodId),
    propertyRoomId: BigInt(data.propertyRoomId),
    inventoryTypeId: BigInt(data.inventoryTypeId),
    allotmentQty: data.allotmentQty,
    releaseDays: data.releaseDays,
    isStopSell: data.isStopSell ?? false,
    isClosed: data.isClosed ?? false,
  };
}

export function toPropertyContractInventoryCreateData(
  data: PropertyContractInventoryWriteData & { createdBy: number }
): Prisma.PropertyContractInventoryUncheckedCreateInput {
  return { ...scalars(data), isActive: data.isActive ?? true, createdBy: data.createdBy };
}

export function toPropertyContractInventoryUpdateScalars(
  data: PropertyContractInventoryWriteData & { modifiedBy: number }
): Prisma.PropertyContractInventoryUncheckedUpdateInput {
  return {
    ...scalars(data),
    isActive: data.isActive,
    modifiedBy: data.modifiedBy,
    modifiedDtTm: new Date(),
  };
}
