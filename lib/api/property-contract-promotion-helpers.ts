import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  promotionBenefitNeedsFreeNights,
  promotionBenefitNeedsMealUpgrade,
  promotionBenefitNeedsStayPay,
  promotionBenefitNeedsUpgradeRoom,
  promotionBenefitNeedsValue,
} from "@/lib/constants/promotion-benefit-types";
import { parseDateOnly } from "@/lib/mappers/property-room-availability.mapper";

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const periodSchema = z.object({
  bookingFromDate: dateOnly,
  bookingToDate: dateOnly,
  stayFromDate: dateOnly,
  stayToDate: dateOnly,
  isActive: z.boolean().optional(),
});

const conditionSchema = z.object({
  minNights: z.number().int().min(0).nullable().optional(),
  maxNights: z.number().int().min(0).nullable().optional(),
  minAdults: z.number().int().min(0).nullable().optional(),
  maxAdults: z.number().int().min(0).nullable().optional(),
  minChild: z.number().int().min(0).nullable().optional(),
  maxChild: z.number().int().min(0).nullable().optional(),
  minRooms: z.number().int().min(0).nullable().optional(),
  maxRooms: z.number().int().min(0).nullable().optional(),
  isActive: z.boolean().optional(),
});

const benefitSchema = z.object({
  promotionBenefitTypeId: z.number().int().positive(),
  value: z.number().min(0).nullable().optional(),
  stayNights: z.number().int().min(0).nullable().optional(),
  payNights: z.number().int().min(0).nullable().optional(),
  freeNights: z.number().int().min(0).nullable().optional(),
  upgradeToPropertyRoomId: z.number().int().positive().nullable().optional(),
  upgradeToMealPlanId: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const propertyContractPromotionWriteSchema = z.object({
  tenantId: z.number().int().positive(),
  companyId: z.number().int().positive(),
  propertyContractId: z.number().int().positive("Contract is required"),
  promotionTypeId: z.number().int().positive("Promotion type is required"),
  promotionCode: z.string().trim().min(1, "Promotion code is required").max(50),
  promotionName: z.string().trim().min(1, "Promotion name is required").max(150),
  propertyRoomId: z.number().int().positive().nullable().optional(),
  propertyContractRatePlanId: z.number().int().positive().nullable().optional(),
  isStackable: z.boolean().optional(),
  priority: z.number().int().optional(),
  isActive: z.boolean().optional(),
  periods: z.array(periodSchema).optional(),
  condition: conditionSchema.optional(),
  benefits: z.array(benefitSchema).optional(),
  dayOfWeekIds: z.array(z.number().int().positive()).optional(),
});

export type PropertyContractPromotionWriteData = z.infer<
  typeof propertyContractPromotionWriteSchema
>;

export const propertyContractPromotionInclude = {
  propertyContract: { select: { contractNumber: true, contractName: true, propertyId: true } },
  promotionType: { select: { promotionTypeCode: true, promotionTypeName: true } },
  propertyRoom: { select: { roomCode: true, roomName: true, propertyId: true } },
  ratePlan: { select: { ratePlanCode: true, ratePlanName: true } },
  periods: { orderBy: [{ bookingFromDate: "asc" as const }] },
  conditions: { orderBy: [{ propertyContractPromotionConditionId: "asc" as const }] },
  benefits: {
    orderBy: [{ propertyContractPromotionBenefitId: "asc" as const }],
    include: {
      benefitType: {
        select: { promotionBenefitTypeCode: true, promotionBenefitTypeName: true },
      },
      upgradeRoom: { select: { roomCode: true, roomName: true } },
      upgradeMealPlan: { select: { mealPlanCode: true, mealPlanName: true } },
    },
  },
  promotionDays: { select: { dayOfWeekId: true, isActive: true } },
} as const;

type PromotionRow = {
  propertyContractPromotionId: bigint;
  propertyContractId: bigint;
  promotionTypeId: bigint;
  propertyRoomId: bigint | null;
  propertyContractRatePlanId: bigint | null;
  periods?: {
    propertyContractPromotionPeriodId: bigint;
    bookingFromDate: Date;
    bookingToDate: Date;
    stayFromDate: Date;
    stayToDate: Date;
    isActive: boolean;
  }[];
  conditions?: {
    propertyContractPromotionConditionId: bigint;
    minNights: number | null;
    maxNights: number | null;
    minAdults: number | null;
    maxAdults: number | null;
    minChild: number | null;
    maxChild: number | null;
    minRooms: number | null;
    maxRooms: number | null;
    isActive: boolean;
  }[];
  benefits?: {
    propertyContractPromotionBenefitId: bigint;
    promotionBenefitTypeId: bigint;
    value: Prisma.Decimal | null;
    stayNights: number | null;
    payNights: number | null;
    freeNights: number | null;
    upgradeToPropertyRoomId: bigint | null;
    upgradeToMealPlanId: bigint | null;
    isActive: boolean;
    benefitType?: { promotionBenefitTypeCode: string; promotionBenefitTypeName: string } | null;
    upgradeRoom?: { roomCode: string; roomName: string } | null;
    upgradeMealPlan?: { mealPlanCode: string; mealPlanName: string } | null;
  }[];
  promotionDays?: { dayOfWeekId: bigint; isActive: boolean }[];
  promotionType?: { promotionTypeCode: string; promotionTypeName: string } | null;
  propertyRoom?: { roomCode: string; roomName: string } | null;
  ratePlan?: { ratePlanCode: string; ratePlanName: string } | null;
  propertyContract?: { contractNumber: string; contractName: string } | null;
  [key: string]: unknown;
};

function decimalNumber(value: Prisma.Decimal | number | string | null | undefined): number | null {
  if (value == null) return null;
  return Number(value.toString());
}

function dateOnlyString(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function serializePropertyContractPromotionRow(row: PromotionRow) {
  const {
    propertyContractPromotionId,
    propertyContractId,
    promotionTypeId,
    propertyRoomId,
    propertyContractRatePlanId,
    periods,
    conditions,
    benefits,
    promotionDays,
    ...rest
  } = row;

  return {
    ...rest,
    propertyContractPromotionId: Number(propertyContractPromotionId),
    propertyContractId: Number(propertyContractId),
    promotionTypeId: Number(promotionTypeId),
    propertyRoomId: propertyRoomId != null ? Number(propertyRoomId) : null,
    propertyContractRatePlanId:
      propertyContractRatePlanId != null ? Number(propertyContractRatePlanId) : null,
    contractNumber: row.propertyContract?.contractNumber,
    contractName: row.propertyContract?.contractName,
    promotionTypeCode: row.promotionType?.promotionTypeCode,
    promotionTypeName: row.promotionType?.promotionTypeName,
    roomCode: row.propertyRoom?.roomCode,
    roomName: row.propertyRoom?.roomName,
    ratePlanCode: row.ratePlan?.ratePlanCode,
    ratePlanName: row.ratePlan?.ratePlanName,
    dayOfWeekIds: (promotionDays ?? [])
      .filter((d) => d.isActive)
      .map((d) => Number(d.dayOfWeekId)),
    periods: (periods ?? []).map((p) => ({
      propertyContractPromotionPeriodId: Number(p.propertyContractPromotionPeriodId),
      bookingFromDate: dateOnlyString(p.bookingFromDate),
      bookingToDate: dateOnlyString(p.bookingToDate),
      stayFromDate: dateOnlyString(p.stayFromDate),
      stayToDate: dateOnlyString(p.stayToDate),
      isActive: p.isActive,
    })),
    conditions: (conditions ?? []).map((c) => ({
      propertyContractPromotionConditionId: Number(c.propertyContractPromotionConditionId),
      minNights: c.minNights,
      maxNights: c.maxNights,
      minAdults: c.minAdults,
      maxAdults: c.maxAdults,
      minChild: c.minChild,
      maxChild: c.maxChild,
      minRooms: c.minRooms,
      maxRooms: c.maxRooms,
      isActive: c.isActive,
    })),
    benefits: (benefits ?? []).map((b) => ({
      propertyContractPromotionBenefitId: Number(b.propertyContractPromotionBenefitId),
      promotionBenefitTypeId: Number(b.promotionBenefitTypeId),
      promotionBenefitTypeCode: b.benefitType?.promotionBenefitTypeCode,
      promotionBenefitTypeName: b.benefitType?.promotionBenefitTypeName,
      value: decimalNumber(b.value),
      stayNights: b.stayNights,
      payNights: b.payNights,
      freeNights: b.freeNights,
      upgradeToPropertyRoomId:
        b.upgradeToPropertyRoomId != null ? Number(b.upgradeToPropertyRoomId) : null,
      upgradeRoomCode: b.upgradeRoom?.roomCode,
      upgradeRoomName: b.upgradeRoom?.roomName,
      upgradeToMealPlanId: b.upgradeToMealPlanId != null ? Number(b.upgradeToMealPlanId) : null,
      upgradeMealPlanCode: b.upgradeMealPlan?.mealPlanCode,
      upgradeMealPlanName: b.upgradeMealPlan?.mealPlanName,
      isActive: b.isActive,
    })),
  };
}

export async function validatePropertyContractPromotionLookups(
  data: PropertyContractPromotionWriteData
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

  const promotionType = await prisma.promotionType.findUnique({
    where: { promotionTypeId: BigInt(data.promotionTypeId) },
  });
  if (
    !promotionType ||
    promotionType.tenantId !== data.tenantId ||
    promotionType.companyId !== data.companyId ||
    !promotionType.isActive
  ) {
    return NextResponse.json({ error: "Promotion type not found" }, { status: 400 });
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

  for (const period of data.periods ?? []) {
    if (period.bookingFromDate > period.bookingToDate) {
      return NextResponse.json(
        { error: "Booking from date must be on or before booking to date" },
        { status: 400 }
      );
    }
    if (period.stayFromDate > period.stayToDate) {
      return NextResponse.json(
        { error: "Stay from date must be on or before stay to date" },
        { status: 400 }
      );
    }
  }

  if (data.condition) {
    const c = data.condition;
    if (c.minNights != null && c.maxNights != null && c.minNights > c.maxNights) {
      return NextResponse.json(
        { error: "Minimum nights must be less than or equal to maximum nights" },
        { status: 400 }
      );
    }
    if (c.minAdults != null && c.maxAdults != null && c.minAdults > c.maxAdults) {
      return NextResponse.json(
        { error: "Minimum adults must be less than or equal to maximum adults" },
        { status: 400 }
      );
    }
    if (c.minChild != null && c.maxChild != null && c.minChild > c.maxChild) {
      return NextResponse.json(
        { error: "Minimum children must be less than or equal to maximum children" },
        { status: 400 }
      );
    }
    if (c.minRooms != null && c.maxRooms != null && c.minRooms > c.maxRooms) {
      return NextResponse.json(
        { error: "Minimum rooms must be less than or equal to maximum rooms" },
        { status: 400 }
      );
    }
  }

  for (const benefit of data.benefits ?? []) {
    const benefitType = await prisma.promotionBenefitType.findUnique({
      where: { promotionBenefitTypeId: BigInt(benefit.promotionBenefitTypeId) },
    });
    if (
      !benefitType ||
      benefitType.tenantId !== data.tenantId ||
      benefitType.companyId !== data.companyId ||
      !benefitType.isActive
    ) {
      return NextResponse.json({ error: "Promotion benefit type not found" }, { status: 400 });
    }

    const code = benefitType.promotionBenefitTypeCode.toUpperCase();

    if (promotionBenefitNeedsValue(code) && (benefit.value == null || benefit.value <= 0)) {
      return NextResponse.json(
        { error: "Discount benefits require a value greater than zero" },
        { status: 400 }
      );
    }

    if (
      promotionBenefitNeedsStayPay(code) &&
      (benefit.stayNights == null ||
        benefit.payNights == null ||
        benefit.stayNights <= 0 ||
        benefit.payNights <= 0 ||
        benefit.payNights >= benefit.stayNights)
    ) {
      return NextResponse.json(
        { error: "Stay X Pay Y benefits require stay nights greater than pay nights" },
        { status: 400 }
      );
    }

    if (
      promotionBenefitNeedsFreeNights(code) &&
      (benefit.freeNights == null || benefit.freeNights <= 0)
    ) {
      return NextResponse.json(
        { error: "Free night benefits require free nights greater than zero" },
        { status: 400 }
      );
    }

    if (
      promotionBenefitNeedsUpgradeRoom(code) &&
      (benefit.upgradeToPropertyRoomId == null || benefit.upgradeToPropertyRoomId <= 0)
    ) {
      return NextResponse.json(
        { error: "Room upgrade benefits require an upgrade room" },
        { status: 400 }
      );
    }

    if (
      promotionBenefitNeedsMealUpgrade(code) &&
      (benefit.upgradeToMealPlanId == null || benefit.upgradeToMealPlanId <= 0)
    ) {
      return NextResponse.json(
        { error: "Meal upgrade benefits require an upgrade meal plan" },
        { status: 400 }
      );
    }

    if (benefit.upgradeToPropertyRoomId != null && benefit.upgradeToPropertyRoomId > 0) {
      const upgradeRoom = await prisma.propertyRoom.findUnique({
        where: { propertyRoomId: BigInt(benefit.upgradeToPropertyRoomId) },
      });
      if (
        !upgradeRoom ||
        upgradeRoom.tenantId !== data.tenantId ||
        upgradeRoom.propertyId !== contract.propertyId
      ) {
        return NextResponse.json({ error: "Upgrade room not found for this property" }, { status: 400 });
      }
    }

    if (benefit.upgradeToMealPlanId != null && benefit.upgradeToMealPlanId > 0) {
      const mealPlan = await prisma.mealPlan.findUnique({
        where: { mealPlanId: BigInt(benefit.upgradeToMealPlanId) },
      });
      if (
        !mealPlan ||
        mealPlan.tenantId !== data.tenantId ||
        mealPlan.companyId !== data.companyId ||
        !mealPlan.isActive
      ) {
        return NextResponse.json({ error: "Upgrade meal plan not found" }, { status: 400 });
      }
    }
  }

  return null;
}

function promotionScalars(data: PropertyContractPromotionWriteData) {
  return {
    tenantId: data.tenantId,
    companyId: data.companyId,
    propertyContractId: BigInt(data.propertyContractId),
    promotionTypeId: BigInt(data.promotionTypeId),
    promotionCode: data.promotionCode.trim().toUpperCase(),
    promotionName: data.promotionName.trim(),
    propertyRoomId:
      data.propertyRoomId != null && data.propertyRoomId > 0 ? BigInt(data.propertyRoomId) : null,
    propertyContractRatePlanId:
      data.propertyContractRatePlanId != null && data.propertyContractRatePlanId > 0
        ? BigInt(data.propertyContractRatePlanId)
        : null,
    isStackable: data.isStackable ?? false,
    priority: data.priority ?? 0,
  };
}

async function replacePromotionChildren(
  tx: Prisma.TransactionClient,
  promotionId: bigint,
  data: PropertyContractPromotionWriteData,
  actorKey: number
) {
  await tx.propertyContractPromotionPeriod.deleteMany({
    where: { propertyContractPromotionId: promotionId },
  });
  await tx.propertyContractPromotionCondition.deleteMany({
    where: { propertyContractPromotionId: promotionId },
  });
  await tx.propertyContractPromotionBenefit.deleteMany({
    where: { propertyContractPromotionId: promotionId },
  });
  await tx.propertyContractPromotionDay.deleteMany({
    where: { propertyContractPromotionId: promotionId },
  });

  if (data.periods?.length) {
    await tx.propertyContractPromotionPeriod.createMany({
      data: data.periods.map((p) => ({
        tenantId: data.tenantId,
        companyId: data.companyId,
        propertyContractPromotionId: promotionId,
        bookingFromDate: parseDateOnly(p.bookingFromDate),
        bookingToDate: parseDateOnly(p.bookingToDate),
        stayFromDate: parseDateOnly(p.stayFromDate),
        stayToDate: parseDateOnly(p.stayToDate),
        isActive: p.isActive ?? true,
        createdBy: actorKey,
      })),
    });
  }

  if (data.condition) {
    const c = data.condition;
    await tx.propertyContractPromotionCondition.create({
      data: {
        tenantId: data.tenantId,
        companyId: data.companyId,
        propertyContractPromotionId: promotionId,
        minNights: c.minNights ?? null,
        maxNights: c.maxNights ?? null,
        minAdults: c.minAdults ?? null,
        maxAdults: c.maxAdults ?? null,
        minChild: c.minChild ?? null,
        maxChild: c.maxChild ?? null,
        minRooms: c.minRooms ?? null,
        maxRooms: c.maxRooms ?? null,
        isActive: c.isActive ?? true,
        createdBy: actorKey,
      },
    });
  }

  if (data.benefits?.length) {
    await tx.propertyContractPromotionBenefit.createMany({
      data: data.benefits.map((b) => ({
        tenantId: data.tenantId,
        companyId: data.companyId,
        propertyContractPromotionId: promotionId,
        promotionBenefitTypeId: BigInt(b.promotionBenefitTypeId),
        value: b.value ?? null,
        stayNights: b.stayNights ?? null,
        payNights: b.payNights ?? null,
        freeNights: b.freeNights ?? null,
        upgradeToPropertyRoomId:
          b.upgradeToPropertyRoomId != null && b.upgradeToPropertyRoomId > 0
            ? BigInt(b.upgradeToPropertyRoomId)
            : null,
        upgradeToMealPlanId:
          b.upgradeToMealPlanId != null && b.upgradeToMealPlanId > 0
            ? BigInt(b.upgradeToMealPlanId)
            : null,
        isActive: b.isActive ?? true,
        createdBy: actorKey,
      })),
    });
  }

  if (data.dayOfWeekIds?.length) {
    await tx.propertyContractPromotionDay.createMany({
      data: data.dayOfWeekIds.map((dayOfWeekId) => ({
        tenantId: data.tenantId,
        companyId: data.companyId,
        propertyContractPromotionId: promotionId,
        dayOfWeekId: BigInt(dayOfWeekId),
        isActive: true,
        createdBy: actorKey,
      })),
    });
  }
}

export async function createPropertyContractPromotionWithChildren(
  data: PropertyContractPromotionWriteData & { createdBy: number }
) {
  return prisma.$transaction(async (tx) => {
    const created = await tx.propertyContractPromotion.create({
      data: {
        ...promotionScalars(data),
        isActive: data.isActive ?? true,
        createdBy: data.createdBy,
      },
    });
    await replacePromotionChildren(
      tx,
      created.propertyContractPromotionId,
      data,
      data.createdBy
    );
    return tx.propertyContractPromotion.findUniqueOrThrow({
      where: { propertyContractPromotionId: created.propertyContractPromotionId },
      include: propertyContractPromotionInclude,
    });
  });
}

export async function updatePropertyContractPromotionWithChildren(
  promotionId: bigint,
  data: PropertyContractPromotionWriteData & { modifiedBy: number }
) {
  return prisma.$transaction(async (tx) => {
    await tx.propertyContractPromotion.update({
      where: { propertyContractPromotionId: promotionId },
      data: {
        ...promotionScalars(data),
        isActive: data.isActive,
        modifiedBy: data.modifiedBy,
        modifiedDtTm: new Date(),
      },
    });
    await replacePromotionChildren(tx, promotionId, data, data.modifiedBy);
    return tx.propertyContractPromotion.findUniqueOrThrow({
      where: { propertyContractPromotionId: promotionId },
      include: propertyContractPromotionInclude,
    });
  });
}
