import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";

const ageBandSchema = z.object({
  fromAge: z.number().min(0),
  toAge: z.number().min(0),
  childPolicyTypeId: z.number().int().positive(),
  rateValue: z.number().min(0).nullable().optional(),
  isActive: z.boolean().optional(),
});

export const propertyContractChildPolicyWriteSchema = z.object({
  tenantId: z.number().int().positive(),
  companyId: z.number().int().positive(),
  propertyContractId: z.number().int().positive("Contract is required"),
  propertyRoomId: z.number().int().positive().nullable().optional(),
  maxChild: z.number().int().min(0),
  childCountsInOccupancy: z.boolean().optional(),
  isActive: z.boolean().optional(),
  ageBands: z.array(ageBandSchema).optional(),
});

export type PropertyContractChildPolicyWriteData = z.infer<
  typeof propertyContractChildPolicyWriteSchema
>;

export const propertyContractChildPolicyInclude = {
  propertyContract: { select: { contractNumber: true, contractName: true, propertyId: true } },
  propertyRoom: { select: { roomCode: true, roomName: true, propertyId: true } },
  ageBands: {
    orderBy: [{ fromAge: "asc" as const }],
    include: {
      policyType: { select: { childPolicyTypeCode: true, childPolicyTypeName: true } },
    },
  },
};

type ChildPolicyRow = {
  propertyContractChildPolicyId: bigint;
  propertyContractId: bigint;
  propertyRoomId: bigint | null;
  ageBands?: {
    propertyContractChildPolicyAgeId: bigint;
    fromAge: Prisma.Decimal;
    toAge: Prisma.Decimal;
    childPolicyTypeId: bigint;
    rateValue: Prisma.Decimal | null;
    isActive: boolean;
    policyType?: { childPolicyTypeCode: string; childPolicyTypeName: string } | null;
  }[];
  propertyRoom?: { roomCode: string; roomName: string } | null;
  propertyContract?: { contractNumber: string; contractName: string } | null;
  [key: string]: unknown;
};

function decimalNumber(value: Prisma.Decimal | number | string | null | undefined) {
  if (value == null) return null;
  return Number(value.toString());
}

export function serializePropertyContractChildPolicyRow(row: ChildPolicyRow) {
  const {
    propertyContractChildPolicyId,
    propertyContractId,
    propertyRoomId,
    ageBands,
    ...rest
  } = row;

  return {
    ...rest,
    propertyContractChildPolicyId: Number(propertyContractChildPolicyId),
    propertyContractId: Number(propertyContractId),
    propertyRoomId: propertyRoomId != null ? Number(propertyRoomId) : null,
    contractNumber: row.propertyContract?.contractNumber,
    contractName: row.propertyContract?.contractName,
    roomCode: row.propertyRoom?.roomCode,
    roomName: row.propertyRoom?.roomName,
    ageBands: (ageBands ?? []).map((a) => ({
      propertyContractChildPolicyAgeId: Number(a.propertyContractChildPolicyAgeId),
      fromAge: decimalNumber(a.fromAge)!,
      toAge: decimalNumber(a.toAge)!,
      childPolicyTypeId: Number(a.childPolicyTypeId),
      childPolicyTypeCode: a.policyType?.childPolicyTypeCode,
      childPolicyTypeName: a.policyType?.childPolicyTypeName,
      rateValue: decimalNumber(a.rateValue),
      isActive: a.isActive,
    })),
  };
}

export async function validatePropertyContractChildPolicyLookups(
  data: PropertyContractChildPolicyWriteData
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
    const policyType = await prisma.childPolicyType.findUnique({
      where: { childPolicyTypeId: BigInt(band.childPolicyTypeId) },
    });
    if (
      !policyType ||
      policyType.tenantId !== data.tenantId ||
      policyType.companyId !== data.companyId ||
      !policyType.isActive
    ) {
      return NextResponse.json({ error: "Child policy type not found" }, { status: 400 });
    }

    const code = policyType.childPolicyTypeCode.toUpperCase();
    if (code === "SUPPLEMENT" && (band.rateValue == null || band.rateValue < 0)) {
      return NextResponse.json(
        { error: "Supplement age bands require a rate value" },
        { status: 400 }
      );
    }
    if (code !== "SUPPLEMENT" && band.rateValue != null) {
      return NextResponse.json(
        { error: "Rate value is only allowed for Supplement policy type" },
        { status: 400 }
      );
    }
  }

  return null;
}

function policyScalars(data: PropertyContractChildPolicyWriteData) {
  return {
    tenantId: data.tenantId,
    companyId: data.companyId,
    propertyContractId: BigInt(data.propertyContractId),
    propertyRoomId:
      data.propertyRoomId != null && data.propertyRoomId > 0 ? BigInt(data.propertyRoomId) : null,
    maxChild: data.maxChild,
    childCountsInOccupancy: data.childCountsInOccupancy ?? false,
  };
}

async function replaceChildPolicyAgeBands(
  tx: Prisma.TransactionClient,
  policyId: bigint,
  data: PropertyContractChildPolicyWriteData,
  actorKey: number
) {
  await tx.propertyContractChildPolicyAge.deleteMany({
    where: { propertyContractChildPolicyId: policyId },
  });

  if (data.ageBands?.length) {
    await tx.propertyContractChildPolicyAge.createMany({
      data: data.ageBands.map((a) => ({
        tenantId: data.tenantId,
        companyId: data.companyId,
        propertyContractChildPolicyId: policyId,
        fromAge: a.fromAge,
        toAge: a.toAge,
        childPolicyTypeId: BigInt(a.childPolicyTypeId),
        rateValue: a.rateValue ?? null,
        isActive: a.isActive ?? true,
        createdBy: actorKey,
      })),
    });
  }
}

export async function createPropertyContractChildPolicyWithChildren(
  data: PropertyContractChildPolicyWriteData & { createdBy: number }
) {
  return prisma.$transaction(async (tx) => {
    const created = await tx.propertyContractChildPolicy.create({
      data: {
        ...policyScalars(data),
        isActive: data.isActive ?? true,
        createdBy: data.createdBy,
      },
    });
    await replaceChildPolicyAgeBands(tx, created.propertyContractChildPolicyId, data, data.createdBy);
    return tx.propertyContractChildPolicy.findUniqueOrThrow({
      where: { propertyContractChildPolicyId: created.propertyContractChildPolicyId },
      include: propertyContractChildPolicyInclude,
    });
  });
}

export async function updatePropertyContractChildPolicyWithChildren(
  policyId: bigint,
  data: PropertyContractChildPolicyWriteData & { modifiedBy: number }
) {
  return prisma.$transaction(async (tx) => {
    await tx.propertyContractChildPolicy.update({
      where: { propertyContractChildPolicyId: policyId },
      data: {
        ...policyScalars(data),
        isActive: data.isActive,
        modifiedBy: data.modifiedBy,
        modifiedDtTm: new Date(),
      },
    });
    await replaceChildPolicyAgeBands(tx, policyId, data, data.modifiedBy);
    return tx.propertyContractChildPolicy.findUniqueOrThrow({
      where: { propertyContractChildPolicyId: policyId },
      include: propertyContractChildPolicyInclude,
    });
  });
}
