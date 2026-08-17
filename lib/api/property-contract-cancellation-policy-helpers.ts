import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { cancellationPolicyTypeNeedsPenaltyValue } from "@/lib/constants/cancellation-policy-types";

const ruleSchema = z.object({
  fromDaysBefore: z.number().int().min(0),
  toDaysBefore: z.number().int().min(0).nullable().optional(),
  cancellationPolicyTypeId: z.number().int().positive(),
  penaltyValue: z.number().min(0),
  isActive: z.boolean().optional(),
});

export const propertyContractCancellationPolicyWriteSchema = z.object({
  tenantId: z.number().int().positive(),
  companyId: z.number().int().positive(),
  propertyContractId: z.number().int().positive("Contract is required"),
  policyCode: z.string().trim().min(1).max(50),
  policyName: z.string().trim().min(1).max(150),
  propertyRoomId: z.number().int().positive().nullable().optional(),
  propertyContractRatePlanId: z.number().int().positive().nullable().optional(),
  propertySeasonId: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().optional(),
  rules: z.array(ruleSchema).optional(),
});

export type PropertyContractCancellationPolicyWriteData = z.infer<
  typeof propertyContractCancellationPolicyWriteSchema
>;

export const propertyContractCancellationPolicyInclude = {
  propertyContract: { select: { contractNumber: true, contractName: true, propertyId: true } },
  propertyRoom: { select: { roomCode: true, roomName: true, propertyId: true } },
  ratePlan: { select: { ratePlanCode: true, ratePlanName: true } },
  propertySeason: { select: { seasonCode: true, seasonName: true, propertyId: true } },
  rules: {
    orderBy: [{ fromDaysBefore: "desc" as const }],
    include: {
      policyType: {
        select: { cancellationPolicyTypeCode: true, cancellationPolicyTypeName: true },
      },
    },
  },
};

type CancellationPolicyRow = {
  propertyContractCancellationPolicyId: bigint;
  propertyContractId: bigint;
  propertyRoomId: bigint | null;
  propertyContractRatePlanId: bigint | null;
  propertySeasonId: bigint | null;
  rules?: {
    propertyContractCancellationPolicyRuleId: bigint;
    fromDaysBefore: number;
    toDaysBefore: number | null;
    cancellationPolicyTypeId: bigint;
    penaltyValue: Prisma.Decimal;
    isActive: boolean;
    policyType?: { cancellationPolicyTypeCode: string; cancellationPolicyTypeName: string } | null;
  }[];
  propertyRoom?: { roomCode: string; roomName: string } | null;
  ratePlan?: { ratePlanCode: string; ratePlanName: string } | null;
  propertySeason?: { seasonCode: string; seasonName: string } | null;
  propertyContract?: { contractNumber: string; contractName: string } | null;
  [key: string]: unknown;
};

function decimalNumber(value: Prisma.Decimal | number | string) {
  return Number(value.toString());
}

export function serializePropertyContractCancellationPolicyRow(row: CancellationPolicyRow) {
  const {
    propertyContractCancellationPolicyId,
    propertyContractId,
    propertyRoomId,
    propertyContractRatePlanId,
    propertySeasonId,
    rules,
    ...rest
  } = row;

  return {
    ...rest,
    propertyContractCancellationPolicyId: Number(propertyContractCancellationPolicyId),
    propertyContractId: Number(propertyContractId),
    propertyRoomId: propertyRoomId != null ? Number(propertyRoomId) : null,
    propertyContractRatePlanId:
      propertyContractRatePlanId != null ? Number(propertyContractRatePlanId) : null,
    propertySeasonId: propertySeasonId != null ? Number(propertySeasonId) : null,
    contractNumber: row.propertyContract?.contractNumber,
    contractName: row.propertyContract?.contractName,
    roomCode: row.propertyRoom?.roomCode,
    roomName: row.propertyRoom?.roomName,
    ratePlanCode: row.ratePlan?.ratePlanCode,
    ratePlanName: row.ratePlan?.ratePlanName,
    seasonCode: row.propertySeason?.seasonCode,
    seasonName: row.propertySeason?.seasonName,
    rules: (rules ?? []).map((r) => ({
      propertyContractCancellationPolicyRuleId: Number(r.propertyContractCancellationPolicyRuleId),
      fromDaysBefore: r.fromDaysBefore,
      toDaysBefore: r.toDaysBefore,
      cancellationPolicyTypeId: Number(r.cancellationPolicyTypeId),
      cancellationPolicyTypeCode: r.policyType?.cancellationPolicyTypeCode,
      cancellationPolicyTypeName: r.policyType?.cancellationPolicyTypeName,
      penaltyValue: decimalNumber(r.penaltyValue),
      isActive: r.isActive,
    })),
  };
}

export async function validatePropertyContractCancellationPolicyLookups(
  data: PropertyContractCancellationPolicyWriteData
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

  if (data.propertyContractRatePlanId != null && data.propertyContractRatePlanId > 0) {
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
  }

  if (data.propertySeasonId != null && data.propertySeasonId > 0) {
    const propertySeason = await prisma.propertySeason.findUnique({
      where: { propertySeasonId: BigInt(data.propertySeasonId) },
    });
    if (
      !propertySeason ||
      propertySeason.tenantId !== data.tenantId ||
      propertySeason.propertyId !== contract.propertyId
    ) {
      return NextResponse.json({ error: "Season not found for this property" }, { status: 400 });
    }
  }

  for (const rule of data.rules ?? []) {
    const policyType = await prisma.cancellationPolicyType.findUnique({
      where: { cancellationPolicyTypeId: BigInt(rule.cancellationPolicyTypeId) },
    });
    if (
      !policyType ||
      policyType.tenantId !== data.tenantId ||
      policyType.companyId !== data.companyId ||
      !policyType.isActive
    ) {
      return NextResponse.json({ error: "Cancellation policy type not found" }, { status: 400 });
    }

    const code = policyType.cancellationPolicyTypeCode.toUpperCase();
    if (cancellationPolicyTypeNeedsPenaltyValue(code) && rule.penaltyValue <= 0) {
      return NextResponse.json(
        { error: "Nights and Percentage rules require a penalty value greater than zero" },
        { status: 400 }
      );
    }

    if (
      rule.toDaysBefore != null &&
      rule.toDaysBefore >= 0 &&
      rule.fromDaysBefore < rule.toDaysBefore
    ) {
      return NextResponse.json(
        { error: "From days before must be greater than or equal to to days before" },
        { status: 400 }
      );
    }
  }

  return null;
}

function policyScalars(data: PropertyContractCancellationPolicyWriteData) {
  return {
    tenantId: data.tenantId,
    companyId: data.companyId,
    propertyContractId: BigInt(data.propertyContractId),
    policyCode: data.policyCode.trim().toUpperCase(),
    policyName: data.policyName.trim(),
    propertyRoomId:
      data.propertyRoomId != null && data.propertyRoomId > 0 ? BigInt(data.propertyRoomId) : null,
    propertyContractRatePlanId:
      data.propertyContractRatePlanId != null && data.propertyContractRatePlanId > 0
        ? BigInt(data.propertyContractRatePlanId)
        : null,
    propertySeasonId:
      data.propertySeasonId != null && data.propertySeasonId > 0 ? BigInt(data.propertySeasonId) : null,
  };
}

async function replaceCancellationPolicyRules(
  tx: Prisma.TransactionClient,
  policyId: bigint,
  data: PropertyContractCancellationPolicyWriteData,
  actorKey: number
) {
  await tx.propertyContractCancellationPolicyRule.deleteMany({
    where: { propertyContractCancellationPolicyId: policyId },
  });

  if (data.rules?.length) {
    await tx.propertyContractCancellationPolicyRule.createMany({
      data: data.rules.map((r) => ({
        tenantId: data.tenantId,
        companyId: data.companyId,
        propertyContractCancellationPolicyId: policyId,
        fromDaysBefore: r.fromDaysBefore,
        toDaysBefore: r.toDaysBefore ?? null,
        cancellationPolicyTypeId: BigInt(r.cancellationPolicyTypeId),
        penaltyValue: r.penaltyValue,
        isActive: r.isActive ?? true,
        createdBy: actorKey,
      })),
    });
  }
}

export async function createPropertyContractCancellationPolicyWithChildren(
  data: PropertyContractCancellationPolicyWriteData & { createdBy: number }
) {
  return prisma.$transaction(async (tx) => {
    const created = await tx.propertyContractCancellationPolicy.create({
      data: {
        ...policyScalars(data),
        isActive: data.isActive ?? true,
        createdBy: data.createdBy,
      },
    });
    await replaceCancellationPolicyRules(
      tx,
      created.propertyContractCancellationPolicyId,
      data,
      data.createdBy
    );
    return tx.propertyContractCancellationPolicy.findUniqueOrThrow({
      where: { propertyContractCancellationPolicyId: created.propertyContractCancellationPolicyId },
      include: propertyContractCancellationPolicyInclude,
    });
  });
}

export async function updatePropertyContractCancellationPolicyWithChildren(
  policyId: bigint,
  data: PropertyContractCancellationPolicyWriteData & { modifiedBy: number }
) {
  return prisma.$transaction(async (tx) => {
    await tx.propertyContractCancellationPolicy.update({
      where: { propertyContractCancellationPolicyId: policyId },
      data: {
        ...policyScalars(data),
        isActive: data.isActive,
        modifiedBy: data.modifiedBy,
        modifiedDtTm: new Date(),
      },
    });
    await replaceCancellationPolicyRules(tx, policyId, data, data.modifiedBy);
    return tx.propertyContractCancellationPolicy.findUniqueOrThrow({
      where: { propertyContractCancellationPolicyId: policyId },
      include: propertyContractCancellationPolicyInclude,
    });
  });
}
